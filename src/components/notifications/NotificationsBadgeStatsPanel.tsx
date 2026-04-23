/**
 * NotificationsBadgeStatsPanel — QA-only panel that surfaces the latest badge
 * render stats (source, elapsedMs, cacheAgeMs, networkMs, unreadCount).
 *
 * Subscribes to `notificationsMetrics` so it updates live as the bell mounts
 * and refetches. Gated to DEV builds and admins to avoid leaking devtools to
 * end users.
 */
import { useEffect, useState } from "react";
import { Activity, Database, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsMetrics, type BadgeRenderStat } from "@/lib/notifications-metrics";
import { cn } from "@/lib/utils";

function fmtMs(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v < 1) return "<1ms";
  if (v < 1000) return `${Math.round(v)}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

function fmtAge(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

export function NotificationsBadgeStatsPanel() {
  const { isAdmin } = useAuth();
  const isDev = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  const visible = isDev || isAdmin;

  const [snapshot, setSnapshot] = useState(() => notificationsMetrics.snapshot());

  useEffect(() => {
    if (!visible) return;
    setSnapshot(notificationsMetrics.snapshot());
    const unsub = notificationsMetrics.subscribeBadgeRender(() => {
      setSnapshot(notificationsMetrics.snapshot());
    });
    return () => unsub();
  }, [visible]);

  if (!visible) return null;

  const { lastBadgeRender, badgeRenders, triggers, fetches, ratio } = snapshot;

  return (
    <div className="border-t border-border/40 bg-muted/20 px-3 py-2 text-[11px]">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground uppercase tracking-wide">
          <Activity className="h-3 w-3" aria-hidden="true" />
          Badge stats (QA)
        </span>
        <span className="text-muted-foreground">
          T{triggers} · F{fetches} · {ratio.toFixed(2)}
        </span>
      </div>

      {lastBadgeRender ? (
        <Stat stat={lastBadgeRender} highlighted />
      ) : (
        <p className="text-muted-foreground italic">Aguardando primeiro render…</p>
      )}

      {badgeRenders.length > 1 && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
            Histórico ({badgeRenders.length - 1})
          </summary>
          <ScrollArea className="max-h-32 mt-1">
            <div className="space-y-1">
              {badgeRenders.slice(1).map((s, i) => (
                <Stat key={`${s.at}-${i}`} stat={s} />
              ))}
            </div>
          </ScrollArea>
        </details>
      )}
    </div>
  );
}

function Stat({ stat, highlighted }: { stat: BadgeRenderStat; highlighted?: boolean }) {
  const Icon = stat.source === "cache" ? Database : Wifi;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded px-1.5 py-1 font-mono",
        highlighted ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/40"
      )}
    >
      <Icon
        className={cn(
          "h-3 w-3 shrink-0",
          stat.source === "cache" ? "text-primary" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <Badge
        variant={stat.hit ? "secondary" : "outline"}
        className="h-4 px-1 text-[9px] font-mono"
      >
        {stat.source}
      </Badge>
      <span className={cn("tabular-nums", stat.hit ? "text-primary" : "text-warning")}>
        {fmtMs(stat.elapsedMs)}
      </span>
      <span className="text-muted-foreground tabular-nums">
        {stat.source === "cache"
          ? `age ${fmtAge(stat.cacheAgeMs)}`
          : `net ${fmtMs(stat.networkMs)}`}
      </span>
      <span className="text-muted-foreground ml-auto tabular-nums">
        u={stat.unreadCount}
      </span>
    </div>
  );
}
