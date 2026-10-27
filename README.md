
<img width="1905" height="1074" alt="image" src="https://github.com/user-attachments/assets/51d374f0-eee4-4cc8-ba98-480719d61f8a" />


# Projeto Vale — Conversação por Voz em Tempo Real (VAD + Whisper + Ollama)

Sistema de conversação por voz **100% local**: detecta quando você fala e
quando para (VAD), transcreve (Whisper local), gera a resposta com um LLM
rodando no **Ollama**, e fala de volta (TTS local) — tudo isso em uma
sessão contínua limitada a **3 minutos**.

## Arquitetura

```
Microfone (navegador)
    │  chunks PCM16 16kHz via WebSocket
    ▼
VAD (webrtcvad) ── detecta início/fim da fala
    │  fala completa (utterance)
    ▼
STT local (faster-whisper) ── transcreve para texto
    │  transcript
    ▼
LLM (Ollama) ── gera resposta curta e ágil
    │  texto de resposta
    ▼
TTS local (Piper, voz neural) ── sintetiza em áudio
    │  WAV
    ▼
Navegador ── toca a resposta
```

Todo o pipeline roda na sua máquina: nenhuma chamada paga a APIs de nuvem
é necessária (Ollama, Whisper e pyttsx3 são locais).

## Estrutura do projeto

```
projeto-vale/
├── app/
│   ├── main.py         # Servidor FastAPI + WebSocket + página de teste
│   ├── config.py        # Configurações via variáveis de ambiente
│   ├── pipeline.py      # Orquestra VAD → STT → Ollama → TTS por sessão
│   ├── vad.py            # Voice Activity Detection (webrtcvad)
│   ├── stt.py             # Speech-to-Text local (faster-whisper)
│   └── tts.py              # Text-to-Speech local (Piper neural + pyttsx3 fallback)
├── web/
│   └── index.html       # Cliente de teste: captura microfone, mostra chat, toca áudio
├── requirements.txt
├── .env.example
├── instalador.ps1       # Instalador para Windows/PowerShell
├── test_ollama.py       # Testa só a conexão com o Ollama
├── test_websocket.py    # Testa a conectividade do WebSocket
└── README.md
```

## Instalação (Windows)

1. Extraia o `.zip` em uma pasta de sua preferência.
2. Instale o [Ollama](https://ollama.com/download) e baixe um modelo:

   ```powershell
   ollama pull llama3.2
   ```

3. Abra o PowerShell na pasta do projeto e, se necessário, libere a
   execução de scripts:

   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```

4. Rode o instalador:

   ```powershell
   .\instalador.ps1
   ```

   Ele verifica Python 3.10+, cria o ambiente virtual `.venv`, instala as
   dependências, gera o `.env`, e checa se o Ollama está instalado, rodando
   e com o modelo baixado (baixando automaticamente se faltar).

5. Ative o ambiente virtual e inicie o servidor:

   ```powershell
   .venv\Scripts\Activate.ps1
   python -m app.main
   ```

6. Abra o navegador em **http://localhost:8765/**, permita o uso do
   microfone e clique em "Iniciar conversa". Fale normalmente — o VAD
   detecta quando você termina de falar e o Vale responde por voz.

> **Primeira execução:** o `faster-whisper` baixa o modelo Whisper
> escolhido (padrão `base`) na primeira transcrição — precisa de internet
> nesse momento. Depois disso fica em cache local e funciona offline.
> O mesmo vale para o **Piper** (TTS): a voz padrão (`pt-BR-razo-medium`,
> ~63MB) é baixada automaticamente na primeira resposta falada e fica
> cacheada em `~/.cache/vale/piper-voices` (Windows:
> `%USERPROFILE%\.cache\vale\piper-voices`).

## Instalação (Linux/macOS)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
ollama pull llama3.2   # se ainda não tiver o modelo
python -m app.main
```

No Linux, o `pyttsx3` usa o `espeak` por baixo — instale-o se ainda não
estiver disponível (`sudo apt install espeak`).

## Configuração (.env)

| Variável | Padrão | Descrição |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | Endereço do serviço Ollama |
| `OLLAMA_MODEL` | `llama3.2` | Modelo usado para gerar as respostas |
| `VALE_VAD_AGGRESSIVENESS` | `2` | Sensibilidade do VAD (0 = mais permissivo, 3 = mais agressivo em cortar ruído) |
| `VALE_VAD_SILENCE_MS` | `700` | Quantos ms de silêncio marcam o fim da fala |
| `VALE_WHISPER_MODEL` | `base` | Tamanho do modelo Whisper (`tiny`, `base`, `small`, `medium` — modelos menores respondem mais rápido) |
| `VALE_TTS_PROVIDER` | `piper` | Motor de voz: `piper` (neural, humano) ou `pyttsx3` (robótico, sem download) |
| `VALE_PIPER_VOICE` | `pt-BR-razo-medium` | Nome da voz no catálogo embutido (`app/tts.py` → `PIPER_VOICE_CATALOG`) |
| `VALE_PIPER_VOICE_MODEL_URL` / `VALE_PIPER_VOICE_CONFIG_URL` | (vazio) | Só necessário para vozes que ainda não estão no catálogo embutido |
| `VALE_PIPER_LENGTH_SCALE` | `1.0` | Velocidade da fala (`<1` mais rápido, `>1` mais lento) |
| `VALE_PIPER_NOISE_SCALE` | `0.667` | Expressividade/variação da voz (mais alto = mais "vivo", menos estável) |
| `VALE_TTS_RATE` | `175` | Velocidade da fala do pyttsx3 (só se `VALE_TTS_PROVIDER=pyttsx3`) |
| `VALE_MAX_SESSION_SECONDS` | `180` | Limite de duração da sessão |

Veja `.env.example` para a lista completa.

## Como testar

### 1. Conversa real por voz (o teste principal)

Com o servidor rodando (`python -m app.main`), abra
**http://localhost:8765/** no navegador, permita o microfone e converse.
A página mostra sua transcrição, a resposta do Vale, e toca o áudio
automaticamente.

### 2. Testar só o Ollama (sem microfone)

```powershell
python test_ollama.py "Qual a capital do Brasil?"
```

Confirma que o Ollama está acessível e o modelo responde.

### 3. Testar conectividade do WebSocket (sem microfone)

```powershell
python test_websocket.py
```

Confirma que o servidor aceita conexões e processa chunks de áudio sem
travar (usa silêncio sintético, então não deve gerar resposta — isso é
esperado).

## Ajustando a latência / qualidade

- **Resposta mais rápida:** use um modelo Whisper menor
  (`VALE_WHISPER_MODEL=tiny`) e um modelo Ollama menor/quantizado.
- **VAD mais sensível a silêncio curto:** reduza `VALE_VAD_SILENCE_MS`
  (respostas mais rápidas, mas risco de cortar a fala antes do fim).
- **Menos falsos positivos de ruído:** aumente
  `VALE_VAD_AGGRESSIVENESS` (até 3) e `VALE_VAD_MIN_SPEECH_MS`.
- **Voz mais natural:** o TTS padrão agora é o **Piper**, um sintetizador
  neural (VITS) local, bem mais humano que o SAPI5/espeak — nenhuma
  configuração extra é necessária. O projeto já vem com um **catálogo
  embutido** das vozes pt-BR gratuitas disponíveis (`app/tts.py` →
  `PIPER_VOICE_CATALOG`); troque `VALE_PIPER_VOICE` no `.env` para alternar:

  | `VALE_PIPER_VOICE` | Voz | Licença | Observação |
  |---|---|---|---|
  | `pt-BR-razo-medium` | Razo (comunitária) | MIT | **Padrão.** Tom pensado para assistentes/tech. Modelo pequeno e não-oficial; pode errar a pronúncia em palavras com acento (`~`, `ç`, `´`) |
  | `pt_BR-faber-medium` | Faber (oficial Piper) | CC0 | Voz "segura", mais neutra, mantida pelo próprio projeto Piper |
  | `pt_BR-edresson-low` | Edresson (oficial Piper) | CC0 | Mais leve/rápida, qualidade de áudio menor (`low`) |

  Não existe hoje uma voz pt-BR oficial em qualidade "high" — esse trio é
  praticamente tudo que há de gratuito e pronto para uso com o Piper em
  português brasileiro. Para adicionar uma voz nova que ainda não está no
  catálogo (encontrada no Hugging Face, por exemplo), defina
  `VALE_PIPER_VOICE_MODEL_URL` e `VALE_PIPER_VOICE_CONFIG_URL` no `.env`
  apontando para os arquivos `.onnx` e de config (`.json`) dela — ou peça
  para eu adicionar ao catálogo. Ajuste `VALE_PIPER_NOISE_SCALE` e
  `VALE_PIPER_NOISE_W_SCALE` para deixar a entonação mais expressiva ou mais
  estável. Se preferir o comportamento antigo (sem baixar nada), defina
  `VALE_TTS_PROVIDER=pyttsx3`.

## Próximos passos possíveis

- Suportar barge-in (permitir interromper o Vale enquanto ele fala).
- Rodar Whisper em GPU (`VALE_WHISPER_DEVICE=cuda`) para reduzir a latência.
- Rodar o Piper em GPU (`VALE_PIPER_USE_CUDA=true`) se a latência do TTS for um gargalo.

## Nova interface (React + Tailwind + shadcn/ui, mobile-first)

A interface fica em `web-ui/` e o build pronto está em `web-ui/dist/`
(o FastAPI já serve `dist` em `/`; sem o build, cai no `web/index.html` antigo).

```powershell
cd web-ui
npm install
npm run build     # gera web-ui/dist (servido por python -m app.main)
npm run dev       # desenvolvimento em http://localhost:5173 (proxy do WS para :8765)
```

**Celular na mesma rede:** o navegador só libera o microfone em HTTPS (ou localhost).
Use um túnel HTTPS (ex.: `cloudflared tunnel --url http://localhost:8765`) ou `ngrok http 8765`.
O cliente usa `wss://` automaticamente quando a página é HTTPS.

## Controle total do desktop (agente)

O V.A.D. agora encadeia ferramentas (observar → agir → verificar, até `VALE_MAX_TOOL_STEPS` passos):

| Área | Ferramentas |
|---|---|
| Navegador (Playwright, perfil persistente) | `browser_open`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_press`, `browser_scroll`, `browser_read`, `browser_back`, `browser_tabs`, `browser_screenshot`, `browser_close` |
| Tela e OCR (Pillow + RapidOCR) | `take_screenshot`, `read_screen_text`, `find_text_on_screen`, `click_text`, `describe_screen` (opcional, modelo de visão) |
| Mouse e teclado (PyAutoGUI) | `mouse_click`, `mouse_move`, `mouse_drag`, `scroll`, `type_text` (aceita acentos), `press_key`, `hotkey` |
| Janelas e Windows | `list_windows`, `get_active_window`, `window_action`, `list_controls`/`click_control` (UI Automation), área de transferência, PowerShell, volume, etc. |
| Arquivos | `list_dir`, `read_text_file`, `move_file`, `delete_file` (só Lixeira) |

Para adicionar uma ferramenta: crie uma função `async` com `@register(...)` em `app/desktop/` (veja `registry.py`).

### Segurança (leia)

- O servidor escuta só em `127.0.0.1` e o WebSocket exige **token** (impresso no console: abra a URL `http://localhost:8765/?token=...`) e **origem igual ao host**.
- **Ações de risco pedem confirmação na tela** (botões Permitir/Negar; sem resposta em 60 s = negado): PowerShell não somente-leitura, desligar/reiniciar, fechar janela, atalhos como Alt+F4/Win+R, mover/apagar arquivos, JavaScript no navegador. A decisão é sempre sua, nunca do modelo.
- Botão **Parar tudo** cancela a ação em andamento. Mover o mouse para o **canto superior esquerdo** aborta o PyAutoGUI (failsafe).
- Texto lido de páginas e da tela é tratado como dado não confiável (defesa contra *prompt injection*), mas isso **não é infalível**: use `VALE_CONFIRM_MODE=all` ao navegar em sites desconhecidos.
- Seu `.env` antigo pode ter `VALE_HOST=0.0.0.0` e `OLLAMA_SYSTEM_PROMPT=...`: troque/remova para valerem os novos padrões.

### Modelo recomendado

Com 40+ ferramentas, o `llama3.2` (3B) erra bastante. Prefira um modelo com bom *tool calling*: `ollama pull qwen2.5:7b` (ou `llama3.1:8b`) e `OLLAMA_MODEL=qwen2.5:7b`. Em 8 GB de VRAM cabe, mas divida com o Whisper (use `base`).

### Instalação extra

```powershell
pip install -r requirements.txt
```
Não precisa rodar `playwright install`: por padrão ele abre o **Edge** já instalado (`VALE_BROWSER_CHANNEL`).

