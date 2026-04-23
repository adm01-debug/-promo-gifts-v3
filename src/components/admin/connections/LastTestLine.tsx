import type { ReactNode } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ErrorKind } from "@/hooks/useConnectionTester";

export interface LastTestInfo {
  ok: boolean | null;
  tested_at: string | null;
  latency_ms?: number | null;
  message?: string | null;
  status?: number | null;
  error_kind?: ErrorKind | null;
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
  const errorMsg = info.ok ? null : (info.message || "Falha sem mensagem detalhada");
  const successTail = info.ok ? [latency, httpInfo].filter(Boolean).join(" · ") : "";
  const isClickable = !!onClick;
  // Header line: status + when. Always single line, never truncates the timestamp.
  const headerText = (
    <>
      {info.ok ? "Verificado" : "Falhou"} {rel}
      {info.ok && successTail ? ` — ${successTail}` : ""}
    </>
  );
  const headerNode = (
    <span className="inline-flex items-center gap-1.5 max-w-full">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className={cn("truncate", isClickable && "underline decoration-dotted underline-offset-2")}>
        {headerText}
      </span>
    </span>
  );
  // For failures, render the error on a second line so it isn't truncated and
  // stays visible alongside the "Testar novamente" action.
  const body = errorMsg ? (
    <span className="block">
      {headerNode}
      <span
        className="mt-0.5 block text-[11px] leading-snug text-destructive/90 break-words whitespace-pre-wrap"
        title={errorMsg}
      >
        {info.status ? `HTTP ${info.status} — ` : ""}{errorMsg}
      </span>
    </span>
  ) : headerNode;
  if (isClickable) {
    return wrap(
      <button
        type="button"
        onClick={onClick}
        aria-label="Ver detalhes do último teste"
        title="Ver detalhes do último teste"
        className={cn(
          "text-xs inline-block w-full max-w-full text-left rounded px-1 -mx-1 py-0.5 transition-colors cursor-pointer",
          info.ok
            ? "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            : "hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40",
          color,
          !action && className,
        )}
      >
        {body}
      </button>,
    );
  }
  return wrap(
    <div className={cn("text-xs max-w-full", color, !action && className)}>
      {body}
    </div>,
  );
}
