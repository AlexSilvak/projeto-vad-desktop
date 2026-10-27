import { useCallback, useEffect, useRef, useState } from "react";

export type AssistantStatus = "idle" | "listening" | "thinking" | "speaking" | "tool";

export type ChatItem =
  | { id: number; kind: "user" | "assistant"; text: string }
  | { id: number; kind: "tool"; name: string; args: Record<string, unknown> }
  | { id: number; kind: "system"; text: string };

const SAMPLE_RATE = 16000;
export const MAX_SECONDS = 180;

export interface ConfirmRequest {
  id: string;
  tool: string;
  reason: string;
  timeout: number;
}

// O servidor imprime http://localhost:8765/?token=XXXX ; guardamos na sessão e tiramos da barra de endereço.
function getToken() {
  try {
    const url = new URL(location.href);
    const t = url.searchParams.get("token");
    if (t) {
      sessionStorage.setItem("vad_token", t);
      url.searchParams.delete("token");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    return sessionStorage.getItem("vad_token") ?? "";
  } catch {
    return "";
  }
}

// guarda o token e limpa a URL assim que a página carrega
const INITIAL_TOKEN = getToken();

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws/voice?token=${encodeURIComponent(getToken() || INITIAL_TOKEN)}`;
}

function downsample(buffer: Float32Array, from: number, to: number) {
  if (from === to) return buffer;
  const ratio = from / to;
  const out = new Float32Array(Math.round(buffer.length / ratio));
  let o = 0;
  let b = 0;
  while (o < out.length) {
    const next = Math.round((o + 1) * ratio);
    let acc = 0;
    let n = 0;
    for (let i = b; i < next && i < buffer.length; i++) {
      acc += buffer[i];
      n++;
    }
    out[o++] = n ? acc / n : 0;
    b = next;
  }
  return out;
}

function toPCM16(f: Float32Array) {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

const avg = (a: Uint8Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return Math.min(1, s / a.length / 140);
};

export function useVoiceAssistant() {
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [bubble, setBubble] = useState("Olá. Eu sou o V.A.D. Fale comigo ou digite um comando para eu executar no seu sistema.");
  const [items, setItems] = useState<ChatItem[]>([
    { id: 0, kind: "assistant", text: "Olá! Como posso te ajudar agora? Você pode falar pelo microfone ou digitar uma ação abaixo." },
  ]);
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const idRef = useRef(1);
  const statusRef = useRef<AssistantStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const micAnalyser = useRef<AnalyserNode | null>(null);
  const ttsCtx = useRef<AudioContext | null>(null);
  const ttsAnalyser = useRef<AnalyserNode | null>(null);
  const ttsPlaying = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);

  const push = useCallback((item: Omit<ChatItem, "id"> | Record<string, unknown>) => {
    setItems((prev) => [...prev, { ...(item as object), id: idRef.current++ } as ChatItem]);
  }, []);

  const set = useCallback((s: AssistantStatus, text?: string) => {
    statusRef.current = s;
    setStatus(s);
    if (text) setBubble(text);
  }, []);

  // Nível de áudio (0..1) lido pelo orbe a cada frame
  const getLevel = useCallback(() => {
    const s = statusRef.current;
    const read = (an: AnalyserNode | null) => {
      if (!an) return 0.04;
      const d = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(d);
      return avg(d);
    };
    if (s === "listening") return read(micAnalyser.current);
    if (s === "speaking") return read(ttsAnalyser.current);
    if (s === "thinking" || s === "tool") return 0.22 + Math.sin(performance.now() * 0.004) * 0.14;
    return 0.04;
  }, []);

  const cleanupAudio = useCallback(() => {
    nodesRef.current.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        /* noop */
      }
    });
    nodesRef.current = [];
    micAnalyser.current = null;
    ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicOn(false);
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    cleanupAudio();
    window.clearInterval(timer.current);
    setConnected(false);
    set("idle", "Até breve! Toque no microfone para falar comigo de novo.");
  }, [cleanupAudio, set]);

  const playReply = useCallback(
    (data: ArrayBuffer) => {
      ttsPlaying.current = true;
      const audio = new Audio(URL.createObjectURL(new Blob([data], { type: "audio/wav" })));
      set("speaking");
      try {
        if (!ttsCtx.current) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ttsCtx.current = new AC();
          ttsAnalyser.current = ttsCtx.current.createAnalyser();
          ttsAnalyser.current.fftSize = 256;
        } else if (ttsCtx.current.state === "suspended") {
          void ttsCtx.current.resume();
        }
        const src = ttsCtx.current.createMediaElementSource(audio);
        src.connect(ttsAnalyser.current!);
        ttsAnalyser.current!.connect(ttsCtx.current.destination);
      } catch {
        /* sem analisador: o áudio ainda toca */
      }
      audio.onended = () => {
        ttsPlaying.current = false;
        set(streamRef.current ? "listening" : "idle");
      };
      audio.onerror = () => {
        ttsPlaying.current = false;
      };
      audio.play().catch(() => {
        ttsPlaying.current = false;
      });
    },
    [set],
  );

  const ensureSocket = useCallback(
    () =>
      new Promise<WebSocket>((resolve, reject) => {
        const cur = wsRef.current;
        if (cur && cur.readyState === WebSocket.OPEN) return resolve(cur);
        set("idle", "Conectando ao servidor...");
        const ws = new WebSocket(wsUrl());
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          startedAt.current = Date.now();
          setElapsed(0);
          timer.current = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 500);
          setConnected(true);
          set("idle", "Conectado! Pode falar ou enviar mensagens.");
          resolve(ws);
        };
        ws.onmessage = (ev) => {
          if (typeof ev.data !== "string") return playReply(ev.data as ArrayBuffer);
          const msg = JSON.parse(ev.data);
          switch (msg.type) {
            case "user_transcript":
              push({ kind: "user", text: msg.text });
              set("thinking", `Processando: "${msg.text}"...`);
              break;
            case "tool_call":
              push({ kind: "tool", name: msg.name, args: msg.arguments ?? {} });
              set("tool", `Executando ação: ${msg.name}`);
              break;
            case "assistant_reply":
              push({ kind: "assistant", text: msg.text });
              set("speaking", msg.text);
              break;
            case "session_limit":
              push({ kind: "system", text: msg.message || "Limite de sessão atingido." });
              stop();
              break;
            case "confirm_request":
              setConfirmReq({ id: msg.id, tool: msg.tool, reason: msg.reason, timeout: msg.timeout ?? 60 });
              set("tool", "Aguardando sua permissão...");
              break;
            case "confirm_closed":
              setConfirmReq((c) => (c && c.id === msg.id ? null : c));
              break;
            case "cancelled":
              setConfirmReq(null);
              push({ kind: "system", text: "Ação interrompida." });
              set("idle", "Tudo parado.");
              break;
            case "error":
              push({ kind: "system", text: `⚠️ ${msg.message}` });
              set("idle");
              break;
          }
        };
        ws.onclose = () => {
          ttsPlaying.current = false;
          if (wsRef.current === ws) {
            push({ kind: "system", text: "Conexão finalizada." });
            wsRef.current = null;
          }
          cleanupAudio();
          window.clearInterval(timer.current);
          setConnected(false);
          setElapsed(0);
          set("idle");
        };
        ws.onerror = (e) => {
          push({ kind: "system", text: "Erro na conexão com o servidor." });
          reject(e);
        };
      }),
    [cleanupAudio, playReply, push, set, stop],
  );

  const startMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microfone indisponível. No celular é preciso acessar via HTTPS (ou localhost).");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = stream;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(1024, 1, 1);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    micAnalyser.current = an;
    source.connect(an);
    proc.onaudioprocess = (e) => {
      const ws = wsRef.current;
      // não envia áudio enquanto a resposta (TTS) está tocando, evitando eco
      if (!ws || ws.readyState !== WebSocket.OPEN || ttsPlaying.current) return;
      const pcm = toPCM16(downsample(e.inputBuffer.getChannelData(0), ctx.sampleRate, SAMPLE_RATE));
      ws.send(pcm.buffer);
    };
    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(proc);
    proc.connect(mute);
    mute.connect(ctx.destination);
    nodesRef.current = [source, proc, an, mute];
    setMicOn(true);
  }, []);

  const toggleMic = useCallback(async () => {
    if (streamRef.current) {
      cleanupAudio();
      set("idle", "Microfone pausado.");
      return;
    }
    setBusy(true);
    try {
      await ensureSocket();
      await startMic();
      set("listening", "Estou ouvindo você! Fale à vontade.");
    } catch (err) {
      push({ kind: "system", text: `Falha no microfone: ${(err as Error).message}` });
      set("idle");
    } finally {
      setBusy(false);
    }
  }, [cleanupAudio, ensureSocket, push, set, startMic]);

  const respondConfirm = useCallback((approved: boolean) => {
    setConfirmReq((c) => {
      if (c) wsRef.current?.send(JSON.stringify({ type: "confirm_response", id: c.id, approved }));
      return null;
    });
  }, []);

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "cancel" }));
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      try {
        const ws = await ensureSocket();
        ws.send(JSON.stringify({ type: "text_query", text: t }));
        set("thinking", `Processando: "${t}"...`);
      } catch (err) {
        push({ kind: "system", text: `Erro ao enviar: ${(err as Error).message ?? "sem conexão"}` });
      }
    },
    [ensureSocket, push, set],
  );

  useEffect(() => () => {
    wsRef.current?.close();
    window.clearInterval(timer.current);
  }, []);

  return { status, bubble, items, connected, micOn, busy, elapsed, getLevel, toggleMic, stop, sendText, confirmReq, respondConfirm, cancel };
}
