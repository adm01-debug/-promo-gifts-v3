/**
 * NotificationsBadgeStatsPanel — QA-only panel that surfaces the latest badge
 * render stats (source, elapsedMs, cacheAgeMs, networkMs, unreadCount).
 *
 * Subscribes to `notificationsMetrics` so it updates live as the bell mounts
 * and refetches. Gated to DEV builds and admins to avoid leaking devtools to
 * end users.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Database, Wifi, MousePointerClick, Zap, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsMetrics, type BadgeRenderStat } from "@/lib/notifications-metrics";
import { cn } from "@/lib/utils";

/** Sliding-window length for the sparkline (60 samples × 1s = 60s). */
const SPARK_WINDOW_SECONDS = 60;

/** One ratio sample for the sparkline. */
interface RatioSample { t: number; ratio: number; triggers: number; fetches: number; }

/**
 * Build the SVG `points` string for a polyline that fits the samples in a
 * `width × height` box. Returns an empty string if there's nothing to draw.
 */
function buildSparkPath(samples: RatioSample[], width: number, height: number): string {
  if (samples.length === 0) return "";
  const n = SPARK_WINDOW_SECONDS;
  // X-axis: index 0 = oldest, index n-1 = newest. Right-align so newest sits
  // at the right edge regardless of how many samples we have.
  const stepX = width / (n - 1);
  const startIdx = n - samples.length;
  return samples
    .map((s, i) => {
      const x = (startIdx + i) * stepX;
      // Ratio is bounded [0..∞) but practically [0..1+]. Clamp display to 1.
      const y = height - Math.min(1, s.ratio) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Color the trigger/fetch ratio based on coalescing efficiency:
 *   - <0.3 = excellent (most triggers absorbed by debounce + 5s TTL)
 *   - 0.3..0.7 = healthy
 *   - >0.7 = suspicious (debounce/TTL not coalescing — investigate)
 */
function ratioTone(ratio: number, triggers: number): string {
  if (triggers === 0) return "text-muted-foreground";
  if (ratio < 0.3) return "text-primary";
  if (ratio < 0.7) return "text-foreground";
  return "text-warning";
}

/** Read the runtime debug toggle (mirrors `isDebugEnabled` in notifications-metrics). */
function isDebugMode(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.localStorage?.getItem("debug:notifications") === "1") return true;
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

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
  const [debugOn, setDebugOn] = useState(() => isDebugMode());

  const [snapshot, setSnapshot] = useState(() => notificationsMetrics.snapshot());

  useEffect(() => {
    if (!visible) return;
    setSnapshot(notificationsMetrics.snapshot());
    const unsub = notificationsMetrics.subscribeBadgeRender(() => {
      setSnapshot(notificationsMetrics.snapshot());
    });
    // Triggers/fetches don't have a subscription channel — poll lightly so the
    // ratio stays fresh while the drawer is open. 1s is plenty (the user is
    // staring at a panel, not a chart).
    const id = window.setInterval(() => {
      setSnapshot(notificationsMetrics.snapshot());
      setDebugOn(isDebugMode());
    }, 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [visible]);

  if (!visible) return null;

  const { lastBadgeRender, badgeRenders, triggers, fetches, ratio, byTrigger, byFetch } = snapshot;
  const savedFetches = Math.max(0, triggers - fetches);
  const savedPct = triggers === 0 ? 0 : Math.round((savedFetches / triggers) * 100);

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

      {/* Trigger/fetch ratio block — only visible while debug mode is on. */}
      {debugOn && (
        <div
          className="mb-2 rounded border border-border/40 bg-background/60 px-2 py-1.5 font-mono"
          aria-label="Trigger vs fetch ratio"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3 w-3" aria-hidden="true" />
              Trigger / Fetch ratio
            </span>
            <span className={cn("tabular-nums font-semibold", ratioTone(ratio, triggers))}>
              {triggers === 0 ? "—" : ratio.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MousePointerClick className="h-2.5 w-2.5" aria-hidden="true" />
              triggers
            </span>
            <span className="tabular-nums text-right text-foreground">{triggers}</span>
            <span className="pl-3.5">· hover</span>
            <span className="tabular-nums text-right">{byTrigger.hover}</span>
            <span className="pl-3.5">· focus</span>
            <span className="tabular-nums text-right">{byTrigger.focus}</span>
            <span className="pl-3.5">· drawer-open</span>
            <span className="tabular-nums text-right">{byTrigger["drawer-open"]}</span>
            <span className="inline-flex items-center gap-1 mt-0.5">
              <Wifi className="h-2.5 w-2.5" aria-hidden="true" />
              fetches
            </span>
            <span className="tabular-nums text-right text-foreground mt-0.5">{fetches}</span>
            <span className="pl-3.5">· prefetch</span>
            <span className="tabular-nums text-right">{byFetch.prefetch}</span>
            <span className="pl-3.5">· initial</span>
            <span className="tabular-nums text-right">{byFetch.initial}</span>
            <span className="pl-3.5">· polling</span>
            <span className="tabular-nums text-right">{byFetch.polling}</span>
            <span className="pl-3.5">· mutation</span>
            <span className="tabular-nums text-right">{byFetch.mutation}</span>
          </div>
          <div className="mt-1 pt-1 border-t border-border/30 flex items-center justify-between text-muted-foreground">
            <span>Coalesced (saved fetches)</span>
            <span className="tabular-nums text-primary font-semibold">
              {savedFetches} ({savedPct}%)
            </span>
          </div>
        </div>
      )}

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
