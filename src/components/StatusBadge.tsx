import { Activity, Cpu, Mic, Volume2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AssistantStatus } from "@/hooks/useVoiceAssistant";

const MAP = {
  idle: { label: "Sistema pronto", variant: "default", Icon: Activity },
  listening: { label: "Ouvindo você", variant: "default", Icon: Mic },
  thinking: { label: "Processando", variant: "violet", Icon: Cpu },
  speaking: { label: "V.A.D. falando", variant: "emerald", Icon: Volume2 },
  tool: { label: "Executando ação", variant: "amber", Icon: Zap },
} as const;

export function StatusBadge({ status }: { status: AssistantStatus }) {
  const { label, variant, Icon } = MAP[status];
  return (
    <Badge variant={variant}>
      <Icon className={`size-3 ${status === "thinking" ? "animate-spin" : status !== "idle" ? "animate-pulse" : ""}`} />
      {label}
    </Badge>
  );
}

export function Bars({ status }: { status: AssistantStatus }) {
  const active = status !== "idle";
  const color = { idle: "bg-sky-400", listening: "bg-cyan-300", thinking: "bg-violet", speaking: "bg-emerald", tool: "bg-amber" }[status];
  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom rounded-full ${color} ${active ? "animate-bar-bounce" : "scale-y-[0.25] opacity-40"}`}
          style={{ height: "100%", animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
