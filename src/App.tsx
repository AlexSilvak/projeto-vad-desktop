import { useState, useEffect, useRef } from "react";
import { Calculator, CalendarClock, FileText, Mic, MicOff, OctagonX, Power, RotateCcw, Send, Square, Volume2 } from "lucide-react";
import { Orb } from "@/components/Orb";
import { Bars, StatusBadge } from "@/components/StatusBadge";
import { ChatLog } from "@/components/ChatLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MAX_SECONDS, useVoiceAssistant } from "@/hooks/useVoiceAssistant";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function App() {
  const v = useVoiceAssistant();
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text;
    setText("");
    void v.sendText(t);
  };

  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      // Inicia o microfone automaticamente e manda o assistente se apresentar
      v.toggleMic().then(() => {
        setTimeout(() => {
          v.sendText("Fale exatamente isso: 'Olá! O que você deseja fazer agora?'");
        }, 500);
      }).catch(() => {});
    }
  }, [v]);


  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-xl flex-col sm:py-6">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-x-0 border-t-0 sm:rounded-xl sm:border">
        {/* Cabeçalho */}
        <header className="pt-safe flex items-center justify-between gap-3 border-b px-4 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-sky-600 font-hud text-lg font-bold text-black shadow-[0_0_16px_rgba(0,229,255,0.45)]">
              V
            </div>
            <div className="min-w-0">
              <h1 className="font-hud text-lg font-bold leading-none tracking-wide">V.A.D.</h1>
              <p className="mt-1 truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Sistema de conversação neural
              </p>
            </div>
          </div>
          <Badge variant="muted" className="shrink-0 font-mono tabular-nums">
            <span className={`size-1.5 rounded-full ${v.connected ? "bg-emerald animate-pulse" : "bg-muted-foreground"}`} />
            {fmt(v.elapsed)} / {fmt(MAX_SECONDS)}
          </Badge>
        </header>

        {/* Orbe + fala: empilha no celular, lado a lado a partir de sm */}
        <section className="flex flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
          <Orb
            status={v.status}
            getLevel={v.getLevel}
            className="w-36 shrink-0 sm:w-32"
          />
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-1">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={v.status} />
              <Bars status={v.status} />
            </div>
            <div className="max-h-28 overflow-y-auto rounded-lg border bg-black/30 p-3 text-[13px] leading-relaxed">
              {v.bubble}
            </div>
          </div>
        </section>

        {/* Chat */}
        <ChatLog items={v.items} />

        {/* Controles fixos no rodapé */}
        <footer className="pb-safe space-y-2 border-t bg-black/30 px-4 pt-3">
          <div className="flex gap-2">
            <Button
              variant={v.micOn ? "default" : "outline"}
              className="flex-1"
              disabled={v.busy}
              onClick={() => void v.toggleMic()}
            >
              {v.micOn ? <MicOff /> : <Mic />}
              {v.micOn ? "Pausar microfone" : "Iniciar conversa por voz"}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              aria-label="Parar tudo"
              title="Parar tudo (cancela a ação em andamento)"
              disabled={!v.connected || v.status === "idle" || v.status === "listening"}
              onClick={v.cancel}
            >
              <OctagonX />
            </Button>
            <Button variant="destructive" size="icon" aria-label="Encerrar sessão" disabled={!v.connected} onClick={v.stop}>
              <Square className="fill-current" />
            </Button>
          </div>
          <form onSubmit={submit} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Converse ou envie um comando..."
              enterKeyHint="send"
              autoComplete="off"
            />
            <Button type="submit" size="icon" aria-label="Enviar" disabled={!text.trim()}>
              <Send />
            </Button>
          </form>
        </footer>
      </Card>
    <ConfirmDialog req={v.confirmReq} onAnswer={v.respondConfirm} />
    </main>
  );
}
