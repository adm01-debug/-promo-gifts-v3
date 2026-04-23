import { useMemo, useState } from "react";
import { ChevronRight, CheckCircle2, XCircle, Loader2, History, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LatencyBadge } from "./LatencyBadge";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";
import { useConnectionTestHistory } from "@/hooks/useConnectionTestHistory";
import type { ConnectionType } from "@/hooks/useConnectionTester";

interface Props {
  type: ConnectionType;
  envKey?: "promobrind" | "crm";
  connectionId?: string;
  /** Bump after a "Testar conexão" succeeds to refetch. */
  refreshKey?: number | string;
  /** Label used inside the timeline drawer ("Ver tudo →"). */
  label: string;
  className?: string;
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  if (diff < 5_000) return "agora há pouco";
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

function formatAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}

type StatusFilter = "all" | "ok" | "fail";

export function ConnectionTestHistoryPanel({
  type, envKey, connectionId, refreshKey, label, className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const { items, total, loading } = useConnectionTestHistory({
    type, envKey, connectionId, refreshKey, enabled: open, limit: 10,
  });

  const counts = useMemo(() => ({
    all: items.length,
    ok: items.filter((i) => i.ok).length,
    fail: items.filter((i) => !i.ok).length,
  }), [items]);

  const visibleItems = useMemo(() => {
    if (filter === "ok") return items.filter((i) => i.ok);
    if (filter === "fail") return items.filter((i) => !i.ok);
    return items;
  }, [items, filter]);

  const stats = useMemo(() => {
    if (items.length === 0) return null;
    const latencies = items.filter((i) => i.ok && i.latency_ms != null).map((i) => i.latency_ms!);
    const avg = latencies.length
      ? Math.round(latencies.reduce((s, n) => s + n, 0) / latencies.length)
      : null;
    return { rate: Math.round((counts.ok / items.length) * 100), avg, ok: counts.ok, total: items.length };
  }, [items, counts.ok]);

  const empty = total === 0 && !loading;

  return (
    <div className={cn("border-t pt-3 mt-3", className)}>
      <button
        type="button"
        onClick={() => !empty && setOpen((v) => !v)}
        disabled={empty}
        className={cn(
          "w-full flex items-center justify-between gap-2 text-xs font-medium",
          "rounded-md px-1 py-1 transition-colors",
          empty ? "text-muted-foreground/60 cursor-not-allowed" : "text-foreground hover:bg-muted/50",
        )}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5">
          {empty ? (
            <History className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          )}
          Histórico de testes ({total})
        </span>
        {stats && !open && (
          <span className={cn(
            "text-[11px] tabular-nums",
            stats.rate === 100
              ? "text-green-700 dark:text-green-400"
              : stats.rate >= 80 ? "text-muted-foreground" : "text-destructive",
          )}>
            {stats.rate}% sucesso
          </span>
        )}
      </button>

      {open && !empty && (
        <div className="mt-2 space-y-2 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-1 px-1">
            {([
              { key: "all", label: "Todos", count: counts.all },
              { key: "ok", label: "OK", count: counts.ok },
              { key: "fail", label: "Falhas", count: counts.fail },
            ] as const).map((opt) => {
              const active = filter === opt.key;
              const isFail = opt.key === "fail";
              const isOk = opt.key === "ok";
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilter(opt.key)}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border transition-colors tabular-nums",
                    active
                      ? isFail
                        ? "bg-destructive/10 border-destructive/40 text-destructive"
                        : isOk
                          ? "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400"
                          : "bg-muted border-border text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted/60",
                  )}
                  aria-pressed={active}
                >
                  {opt.label} ({opt.count})
                </button>
              );
            })}
          </div>

          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Carregando…
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground">
              {filter === "fail" ? "Nenhuma falha nos últimos testes 🎉" : "Nenhum teste com este filtro."}
            </div>
          ) : (
            <TooltipProvider delayDuration={150}>
              <ul className="space-y-1">
                {visibleItems.map((it) => {
                  const Icon = it.ok ? CheckCircle2 : XCircle;
                  const tail = it.ok
                    ? `HTTP ${it.status ?? "?"}${it.message ? ` — ${it.message}` : ""}`
                    : (it.message || "Falha");
                  return (
                    <li
                      key={it.id}
                      className="grid grid-cols-[14px_minmax(80px,auto)_minmax(54px,auto)_1fr] items-center gap-2 text-xs px-1.5 py-1 rounded hover:bg-muted/40"
                    >
                      <Icon className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        it.ok ? "text-green-700 dark:text-green-400" : "text-destructive",
                      )} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground tabular-nums truncate cursor-default inline-flex items-center gap-1">
                            {formatRelative(it.tested_at)}
                            {it.triggered_by === "cron" && (
                              <Bot className="h-3 w-3 text-muted-foreground/70" aria-label="Teste automático" />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {formatAbsolute(it.tested_at)}
                          {it.triggered_by === "cron" && " · automático (cron)"}
                          {it.triggered_by === "manual" && " · manual"}
                        </TooltipContent>
                      </Tooltip>
                      <LatencyBadge ms={it.latency_ms} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(
                            "truncate cursor-default",
                            it.ok ? "text-foreground/80" : "text-destructive",
                          )}>
                            {tail}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm break-words">
                          {tail}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </TooltipProvider>
          )}

          {stats && (
            <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
              <span>
                Taxa de sucesso: <span className={cn(
                  "font-medium tabular-nums",
                  stats.rate === 100 ? "text-green-700 dark:text-green-400"
                    : stats.rate >= 80 ? "text-foreground" : "text-destructive",
                )}>{stats.rate}%</span>
                {stats.avg != null && (
                  <> · Latência média: <span className="font-medium tabular-nums text-foreground">{stats.avg}ms</span></>
                )}
              </span>
              <ConnectionTimelineDrawer type={type} label={label} triggerVariant="ghost" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
