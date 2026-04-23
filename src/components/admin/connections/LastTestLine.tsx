import type { ReactNode } from "react";
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

export function LastTestLine({
  info,
  className,
  action,
  onClick,
}: {
  info: LastTestInfo | null;
  className?: string;
  action?: ReactNode;
  onClick?: () => void;
}) {
  const wrap = (content: ReactNode) =>
    action ? (
      <div className={cn("flex items-center justify-between gap-2 min-h-7", className)}>
        <div className="min-w-0 flex-1">{content}</div>
        <div className="shrink-0">{action}</div>
      </div>
    ) : (
      content
    );

  if (!info || !info.tested_at) {
    return wrap(
      <p className={cn("text-xs text-muted-foreground inline-flex items-center gap-1.5", !action && className)}>
        <Clock className="h-3.5 w-3.5" /> Nunca verificado
      </p>,
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
  const isClickable = !info.ok && !!onClick;
  const content = (
    <span className="inline-flex items-center gap-1.5 max-w-full">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className={cn("truncate", isClickable && "underline decoration-dotted underline-offset-2")}>
        {info.ok ? "Verificado" : "Falhou"} {rel}
        {tail ? ` — ${tail}` : ""}
      </span>
    </span>
  );
  if (isClickable) {
    return wrap(
      <button
        type="button"
        onClick={onClick}
        title="Clique para ver detalhes do erro"
        className={cn(
          "text-xs inline-flex items-center max-w-full text-left rounded px-1 -mx-1 py-0.5 transition-colors",
          "hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40",
          color,
          !action && className,
        )}
      >
        {content}
      </button>,
    );
  }
  return wrap(
    <p className={cn("text-xs inline-flex items-center max-w-full", color, !action && className)}>
      {content}
    </p>,
  );
}
