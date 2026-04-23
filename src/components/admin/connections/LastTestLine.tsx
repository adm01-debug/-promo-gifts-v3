import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LastTestInfo {
  ok: boolean | null;
  tested_at: string | null;
  latency_ms?: number | null;
  message?: string | null;
  status?: number | null;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  if (diff < 5_000) return "agora há pouco";
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

export function LastTestLine({ info, className }: { info: LastTestInfo | null; className?: string }) {
  if (!info || !info.tested_at) {
    return (
      <p className={cn("text-xs text-muted-foreground inline-flex items-center gap-1.5", className)}>
        <Clock className="h-3.5 w-3.5" /> Nunca verificado
      </p>
    );
  }
  const Icon = info.ok ? CheckCircle2 : XCircle;
  const color = info.ok ? "text-green-700 dark:text-green-400" : "text-destructive";
  const rel = formatRelative(info.tested_at);
  const latency = info.latency_ms != null ? `${info.latency_ms}ms` : null;
  const httpInfo = info.status ? `HTTP ${info.status}` : null;
  const tail = info.ok
    ? [latency, httpInfo].filter(Boolean).join(" · ")
    : info.message || "Falha";
  return (
    <p className={cn("text-xs inline-flex items-center gap-1.5", color, className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        {info.ok ? "Verificado" : "Falhou"} {rel}
        {tail ? ` — ${tail}` : ""}
      </span>
    </p>
  );
}
