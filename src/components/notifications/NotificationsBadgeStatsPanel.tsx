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
import { notificationsMetrics, type BadgeRenderStat, type TriggerSource } from "@/lib/notifications-metrics";
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
  /** Sliding-window samples (most recent at the END). */
  const [samples, setSamples] = useState<RatioSample[]>([]);
  const lastCountsRef = useRef<{ triggers: number; fetches: number }>({ triggers: 0, fetches: 0 });

  useEffect(() => {
    if (!visible) return;
    const initial = notificationsMetrics.snapshot();
    setSnapshot(initial);
    lastCountsRef.current = { triggers: initial.triggers, fetches: initial.fetches };

    const unsub = notificationsMetrics.subscribeBadgeRender(() => {
      setSnapshot(notificationsMetrics.snapshot());
    });
    const id = window.setInterval(() => {
      const snap = notificationsMetrics.snapshot();
      setSnapshot(snap);
      setDebugOn(isDebugMode());
      // Detect auto-reset (every 15 min) and clear samples so the sparkline
      // doesn't draw a phantom drop to 0.
      const prev = lastCountsRef.current;
      if (snap.triggers < prev.triggers || snap.fetches < prev.fetches) {
        setSamples([]);
      }
      lastCountsRef.current = { triggers: snap.triggers, fetches: snap.fetches };
      setSamples((prevSamples) => {
        const next = [
          ...prevSamples,
          { t: Date.now(), ratio: snap.ratio, triggers: snap.triggers, fetches: snap.fetches },
        ];
        return next.length > SPARK_WINDOW_SECONDS
          ? next.slice(next.length - SPARK_WINDOW_SECONDS)
          : next;
      });
    }, 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [visible]);

  // Sparkline math — memoized so we don't rebuild the polyline on every render.
  // MUST be declared BEFORE the `if (!visible)` early return to obey the Rules
  // of Hooks (visible can change between renders if isAdmin loads async).
  const SPARK_W = 160;
  const SPARK_H = 24;
  const sparkPoints = useMemo(() => buildSparkPath(samples, SPARK_W, SPARK_H), [samples]);
  const sparkStats = useMemo(() => {
    if (samples.length === 0) return { avg: 0, peak: 0, latest: 0 };
    const ratios = samples.map((s) => s.ratio);
    const sum = ratios.reduce((a, b) => a + b, 0);
    return {
      avg: sum / ratios.length,
      peak: Math.max(...ratios),
      latest: ratios[ratios.length - 1],
    };
  }, [samples]);

  if (!visible) return null;

  const { lastBadgeRender, badgeRenders, triggers, fetches, ratio, byTrigger, byFetch, fetchesByTtlWindow, coalescingByTrigger } = snapshot;
  const savedFetches = Math.max(0, triggers - fetches);
  const savedPct = triggers === 0 ? 0 : Math.round((savedFetches / triggers) * 100);
  const ttlWithinPct = fetches === 0 ? 0 : Math.round((fetchesByTtlWindow.withinTtl / fetches) * 100);
  const ttlAfterPct = fetches === 0 ? 0 : Math.round((fetchesByTtlWindow.afterTtl / fetches) * 100);
  /** Per-source coalescing rows for the efficiency block. */
  const coalescingRows: Array<{ key: TriggerSource; label: string }> = [
    { key: "hover", label: "hover" },
    { key: "focus", label: "focus" },
    { key: "drawer-open", label: "drawer-open" },
  ];

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
            {/* TTL-window split: how many fetches landed inside the 5s prefetch
                TTL since the previous fetch (= candidates that *could* have
                been coalesced) vs after the window expired (= legitimately
                fresh fetches). High `within TTL` count = TTL gate is leaky. */}
            <span className="pl-3.5 inline-flex items-center gap-1 mt-0.5">
              <Zap className="h-2.5 w-2.5" aria-hidden="true" />
              within TTL (&lt;5s)
            </span>
            <span
              className={cn(
                "tabular-nums text-right mt-0.5 font-semibold",
                fetchesByTtlWindow.withinTtl === 0 ? "text-muted-foreground" : "text-warning"
              )}
              title="Fetches that fired within 5s of the previous fetch — should normally be 0 thanks to the prefetch TTL gate."
            >
              {fetchesByTtlWindow.withinTtl} ({ttlWithinPct}%)
            </span>
            <span className="pl-3.5">· after TTL (≥5s)</span>
            <span
              className="tabular-nums text-right text-primary font-semibold"
              title="Fetches that fired after the 5s window expired (or were the very first fetch). Healthy default."
            >
              {fetchesByTtlWindow.afterTtl} ({ttlAfterPct}%)
            </span>
          </div>
          {/* Per-source coalescing efficiency: how many would-be fetches each
              trigger source absorbed via debounce + 5s TTL. Higher = better
              (e.g. 80% means only 1 in 5 triggers actually hit the network). */}
          <div className="mt-1.5 pt-1.5 border-t border-border/30">
            <div className="flex items-center justify-between gap-2 mb-0.5 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" aria-hidden="true" />
                Coalescing efficiency by source
              </span>
              <span className="text-[10px]">saved %</span>
            </div>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5">
              {coalescingRows.map(({ key, label }) => {
                const c = coalescingByTrigger[key];
                const pct = Math.round(c.efficiency * 100);
                const tone =
                  c.triggers === 0
                    ? "text-muted-foreground"
                    : c.efficiency >= 0.7
                      ? "text-primary"
                      : c.efficiency >= 0.3
                        ? "text-foreground"
                        : "text-warning";
                return (
                  <div className="contents" key={key}>
                    <span className="text-muted-foreground pl-3.5">· {label}</span>
                    {/* Inline efficiency bar — width reflects efficiency 0..1. */}
                    <div
                      className="h-1.5 self-center rounded bg-muted/60 overflow-hidden"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      aria-label={`${label} coalescing efficiency ${pct}%`}
                    >
                      <div
                        className={cn(
                          "h-full transition-all",
                          c.triggers === 0
                            ? "bg-muted-foreground/20"
                            : c.efficiency >= 0.7
                              ? "bg-primary"
                              : c.efficiency >= 0.3
                                ? "bg-foreground/60"
                                : "bg-warning"
                        )}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                    <span
                      className={cn("tabular-nums text-right text-[10px] font-semibold", tone)}
                      title={`${c.saved} saved fetches out of ${c.triggers} triggers (${c.fetches} actual fetches)`}
                    >
                      {c.triggers === 0 ? "—" : `${pct}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* 60-second sparkline of the trigger/fetch ratio. */}
          <div className="mt-1.5 pt-1.5 border-t border-border/30">
            <div className="flex items-center justify-between gap-2 mb-0.5 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
                Ratio (last 60s)
              </span>
              <span className="tabular-nums text-[10px]">
                avg {sparkStats.avg.toFixed(2)} · peak {sparkStats.peak.toFixed(2)} · n={samples.length}
              </span>
            </div>
            <svg
              width={SPARK_W}
              height={SPARK_H}
              viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
              className="w-full h-6 block"
              role="img"
              aria-label={`Ratio sparkline over the last ${samples.length} seconds, latest ${sparkStats.latest.toFixed(2)}`}
            >
              {/* Reference lines at 0.3 and 0.7 (the ratioTone thresholds). */}
              <line
                x1="0" x2={SPARK_W}
                y1={SPARK_H - 0.3 * SPARK_H} y2={SPARK_H - 0.3 * SPARK_H}
                className="stroke-primary/20" strokeDasharray="2 2" strokeWidth="0.5"
              />
              <line
                x1="0" x2={SPARK_W}
                y1={SPARK_H - 0.7 * SPARK_H} y2={SPARK_H - 0.7 * SPARK_H}
                className="stroke-warning/30" strokeDasharray="2 2" strokeWidth="0.5"
              />
              {samples.length === 0 ? (
                <text
                  x={SPARK_W / 2} y={SPARK_H / 2 + 3}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  collecting…
                </text>
              ) : (
                <polyline
                  points={sparkPoints}
                  fill="none"
                  className={cn(
                    "stroke-2",
                    sparkStats.latest < 0.3
                      ? "stroke-primary"
                      : sparkStats.latest < 0.7
                        ? "stroke-foreground"
                        : "stroke-warning"
                  )}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </svg>
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
