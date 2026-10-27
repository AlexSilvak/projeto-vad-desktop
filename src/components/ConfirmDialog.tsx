import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ConfirmRequest } from "@/hooks/useVoiceAssistant";

export function ConfirmDialog({ req, onAnswer }: { req: ConfirmRequest | null; onAnswer: (ok: boolean) => void }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!req) return;
    setLeft(req.timeout);
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [req]);

  return (
    <AlertDialog open={!!req}>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogTitle className="flex items-center gap-2">
          <ShieldAlert className="size-5" /> Permitir esta ação?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2">
            <p className="rounded-md border border-amber/30 bg-amber/5 p-3 font-mono text-[13px]">{req?.reason}</p>
            <p className="text-xs text-muted-foreground">
              Ferramenta: {req?.tool} · nega automaticamente em {left}s
            </p>
          </div>
        </AlertDialogDescription>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <AlertDialogCancel onClick={() => onAnswer(false)}>Negar</AlertDialogCancel>
          <AlertDialogAction onClick={() => onAnswer(true)}>Permitir</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
