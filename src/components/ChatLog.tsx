import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatItem } from "@/hooks/useVoiceAssistant";

function toolInfo(name: string, a: Record<string, unknown>): { icon: string; desc: string } {
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
  switch (name) {
    case "open_notepad":
      return { icon: "📝", desc: s("text") ? `Abrindo Bloco de Notas (${s("title") || "nota"})` : "Abrindo Bloco de Notas" };
    case "write_text_file":
      return { icon: "📄", desc: `Criado "${s("filename") || "nota.txt"}" na Área de Trabalho` };
    case "system_control": {
      const m: Record<string, [string, string]> = {
        restart: ["🔄", "Reinicialização segura iniciada (60s)"],
        cancel_restart: ["🛑", "Reinício/desligamento cancelado"],
        shutdown: ["🔌", "Desligamento iniciado (60s)"],
        lock: ["🔒", "Tela bloqueada"],
      };
      const [icon, desc] = m[s("action")] ?? ["⚙️", `Ação do sistema: ${s("action")}`];
      return { icon, desc };
    }
    case "open_application":
      return { icon: "🚀", desc: `Aplicativo aberto: ${s("app_name") || "Windows"}` };
    case "run_powershell":
      return { icon: "💻", desc: `PowerShell: ${s("command")}` };
    case "control_volume":
      return { icon: "🔊", desc: `Volume ajustado (${s("action") || "som"})` };
    case "open_url":
      return { icon: "🌐", desc: `Navegador aberto em: ${s("url")}` };
    default: {
      const icon = name.startsWith("browser_") ? "🌐" : name.includes("screen") || name.includes("text") ? "👁️" : name.includes("mouse") || name.includes("click") ? "🖱️" : name.includes("window") ? "🪟" : "⚙️";
      const brief = Object.entries(a).map(([k, v]) => `${k}=${String(v).slice(0, 50)}`).join(", ");
      return { icon, desc: brief ? `${name}(${brief})` : name };
    }
  }
}

export function ChatLog({ items }: { items: ChatItem[] }) {
  const vp = useRef<HTMLDivElement>(null);
  useEffect(() => {
    vp.current?.scrollTo({ top: vp.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  return (
    <ScrollArea className="min-h-0 flex-1" viewportRef={vp}>
      <div className="flex flex-col gap-3 p-4">
        {items.map((it) => {
          if (it.kind === "system")
            return (
              <p key={it.id} className="animate-msg-in text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                {it.text}
              </p>
            );
          if (it.kind === "tool") {
            const { icon, desc } = toolInfo(it.name, it.args);
            return (
              <div key={it.id} className="animate-msg-in flex items-start gap-2 rounded-md border border-amber/30 bg-amber/5 px-3 py-2 text-xs">
                <span>{icon}</span>
                <span className="min-w-0 flex-1 break-words">{desc}</span>
                <Badge variant="amber" className="shrink-0">Tool</Badge>
              </div>
            );
          }
          const user = it.kind === "user";
          return (
            <div key={it.id} className={cn("animate-msg-in flex items-start gap-2.5", user && "flex-row-reverse")}>
              <div
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-md",
                  user ? "bg-gradient-to-br from-cyan-400 to-sky-500 text-black" : "bg-gradient-to-br from-violet to-fuchsia-500 text-white",
                )}
              >
                {user ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div
                className={cn(
                  "max-w-[82%] break-words rounded-lg border px-3 py-2 text-[13px] leading-relaxed",
                  user ? "border-primary/30 bg-primary/10" : "border-violet/30 bg-violet/10",
                )}
              >
                {it.text}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
