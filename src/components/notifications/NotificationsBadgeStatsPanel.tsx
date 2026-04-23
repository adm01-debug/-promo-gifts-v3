/**
 * NotificationsBadgeStatsPanel — QA-only panel that surfaces the latest badge
 * render stats (source, elapsedMs, cacheAgeMs, networkMs, unreadCount).
 *
 * Subscribes to `notificationsMetrics` so it updates live as the bell mounts
 * and refetches. Gated to DEV builds and admins to avoid leaking devtools to
 * end users.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Database, Wifi, MousePointerClick, Zap, TrendingUp, Download, AlertTriangle, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsMetrics, type BadgeRenderStat, type TriggerSource } from "@/lib/notifications-metrics";
import { cn } from "@/lib/utils";

/** Sliding-window length for the sparkline (60 samples × 1s = 60s). */
const SPARK_WINDOW_SECONDS = 60;

/** Suspicious threshold: ratio at/above this is considered "leaky coalescing". */
const SUSPICIOUS_RATIO_THRESHOLD = 0.7;
/** How many consecutive seconds the ratio must stay ≥ threshold to fire the warning. */
const SUSPICIOUS_STREAK_SECONDS = 10;

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
  /** Anchor for the "Top contributors" jump target (warning badge → section). */
  const topContributorsRef = useRef<HTMLDivElement | null>(null);
  const handleJumpToContributors = () => {
    topContributorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Brief highlight via data attribute → CSS animation defined inline below.
    const el = topContributorsRef.current;
    if (!el) return;
    el.setAttribute("data-jump-flash", "1");
    window.setTimeout(() => el.removeAttribute("data-jump-flash"), 1500);
  };

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

  /**
   * Trailing-streak detector: count contiguous samples (from newest going back)
   * whose ratio is ≥ SUSPICIOUS_RATIO_THRESHOLD. The warning fires once the
   * streak reaches SUSPICIOUS_STREAK_SECONDS, signaling the prefetch debounce
   * + 5s TTL coalescing isn't keeping up. We also require triggers > 0 in the
   * latest sample to suppress noise from "ratio = 0/0 → 0" edge cases.
   */
  const suspiciousStreakSeconds = useMemo(() => {
    let streak = 0;
    for (let i = samples.length - 1; i >= 0; i--) {
      const s = samples[i];
      if (s.triggers > 0 && s.ratio >= SUSPICIOUS_RATIO_THRESHOLD) streak += 1;
      else break;
    }
    return streak;
  }, [samples]);
  const isSuspicious = suspiciousStreakSeconds >= SUSPICIOUS_STREAK_SECONDS;
  /**
   * Index (in the `samples` array) of the FIRST sample that belongs to the
   * current suspicious trailing streak. Returns -1 when no streak is active.
   * Used by the expandable samples panel to highlight the offending segment.
   */
  const streakStartIdx = useMemo(() => {
    if (suspiciousStreakSeconds === 0) return -1;
    return samples.length - suspiciousStreakSeconds;
  }, [samples.length, suspiciousStreakSeconds]);

  /**
   * Per-second samples carry CUMULATIVE counters (totals since last reset),
   * so the # of triggers/fetches that happened *inside* the streak window is
   * the delta between the last sample of the streak and the sample immediately
   * BEFORE the streak started. Falls back to the first streak sample's totals
   * when the streak begins at index 0 (no "before" sample available).
   */
  const streakWindowStats = useMemo(() => {
    if (streakStartIdx < 0 || samples.length === 0) {
      return { triggers: 0, fetches: 0, ratio: 0, fromT: 0, toT: 0, seconds: 0 };
    }
    const first = samples[streakStartIdx];
    const last = samples[samples.length - 1];
    const before = streakStartIdx > 0 ? samples[streakStartIdx - 1] : null;
    const triggers = before
      ? Math.max(0, last.triggers - before.triggers)
      : last.triggers - first.triggers + first.triggers; // == last.triggers when no "before"
    const fetches = before
      ? Math.max(0, last.fetches - before.fetches)
      : last.fetches - first.fetches + first.fetches;
    const ratio = triggers === 0 ? 0 : fetches / triggers;
    return {
      triggers,
      fetches,
      ratio,
      fromT: first.t,
      toT: last.t,
      seconds: suspiciousStreakSeconds,
    };
  }, [samples, streakStartIdx, suspiciousStreakSeconds]);

  /**
   * Trend over the suspicious window: linear-regression slope on the per-second
   * ratios. Buckets:
   *   - `rising`   : slope >= +0.01 / sec → ratio still climbing
   *   - `falling`  : slope <= -0.01 / sec → ratio cooling off
   *   - `flat`     : everything in between (steady-state leak)
   * Falls back to "flat" when there are fewer than 3 samples in the streak
   * (slope is meaningless on a 2-point line and noisy on 1).
   *
   * The recommendation uses a simple heuristic anchored to the current
   * production defaults (debounce 200ms, TTL 5000ms):
   *   - rising  → debounce 200→400ms (absorb growing micro-bursts first)
   *   - flat    → TTL 5s→10s (raise gate before debounce, fewer false misses)
   *   - falling → hold values, observe (self-recovering)
   */
  const streakTrend = useMemo<{
    direction: "rising" | "flat" | "falling";
    slopePerSec: number;
    suggestion: { primary: string; rationale: string } | null;
  }>(() => {
    if (streakStartIdx < 0) {
      return { direction: "flat", slopePerSec: 0, suggestion: null };
    }
    const window = samples.slice(streakStartIdx);
    if (window.length < 3) {
      return {
        direction: "flat",
        slopePerSec: 0,
        suggestion: {
          primary: "Hold current values; need ≥3s of data to recommend.",
          rationale: "Streak too short to fit a trend line.",
        },
      };
    }
    // Linear regression: y = ratio, x = seconds offset from window start.
    const n = window.length;
    const xs = window.map((_, i) => i);
    const ys = window.map((s) => s.ratio);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    const slopePerSec = den === 0 ? 0 : num / den;
    const direction: "rising" | "flat" | "falling" =
      slopePerSec >= 0.01 ? "rising" : slopePerSec <= -0.01 ? "falling" : "flat";

    let suggestion: { primary: string; rationale: string };
    if (direction === "rising") {
      suggestion = {
        primary: "Try debounce 200ms → 400ms",
        rationale: "Ratio still climbing — widen the trailing-edge window first to absorb growing micro-bursts before touching the TTL gate.",
      };
    } else if (direction === "flat") {
      suggestion = {
        primary: "Try TTL 5s → 10s (keep debounce 200ms)",
        rationale: "Ratio plateaued at a high level — debounce is firing per burst; raise the prefetch TTL gate so back-to-back bursts coalesce.",
      };
    } else {
      suggestion = {
        primary: "Hold values — ratio is self-recovering",
        rationale: "Trend is falling. Wait one more streak cycle before tuning to avoid over-correcting.",
      };
    }
    return { direction, slopePerSec, suggestion };
  }, [samples, streakStartIdx]);

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

  /**
   * Build a self-contained debug payload (snapshot + env metadata) and trigger
   * a JSON file download via an in-memory Blob URL. Wrapped in try/catch so a
   * sandboxed environment never crashes the panel.
   */
  /** Trigger a JSON Blob download. Shared by the full and streak-only exports. */
  const downloadJson = (filenameStem: string, payload: unknown) => {
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameStem}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke so Safari has a tick to honor the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[NotificationsBadgeStatsPanel] export failed", err);
    }
  };

  const handleExportDebugJson = () => {
    const snap = notificationsMetrics.snapshot();
    downloadJson("notifications-metrics", {
      exportedAt: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      url: typeof window !== "undefined" ? window.location.href : null,
      debugMode: debugOn,
      sparklineSamples: samples,
      snapshot: snap,
    });
  };

  /**
   * Export a focused payload covering ONLY the suspicious streak window:
   *   - sample range that triggered the warning
   *   - aggregated window stats (triggers/fetches/ratio deltas)
   *   - regression trend + tuning suggestion
   *   - reference sample immediately BEFORE the streak (for delta validation)
   *   - full snapshot for cross-reference
   * Disabled when no streak is active.
   */
  const handleExportSuspiciousStreakJson = () => {
    if (streakStartIdx < 0) return;
    const snap = notificationsMetrics.snapshot();
    const streakSamples = samples.slice(streakStartIdx);
    const beforeStreak = streakStartIdx > 0 ? samples[streakStartIdx - 1] : null;
    downloadJson("notifications-suspicious-streak", {
      exportedAt: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      url: typeof window !== "undefined" ? window.location.href : null,
      streak: {
        thresholdRatio: SUSPICIOUS_RATIO_THRESHOLD,
        minStreakSeconds: SUSPICIOUS_STREAK_SECONDS,
        actualStreakSeconds: suspiciousStreakSeconds,
        startedAt: streakWindowStats.fromT
          ? new Date(streakWindowStats.fromT).toISOString()
          : null,
        endedAt: streakWindowStats.toT
          ? new Date(streakWindowStats.toT).toISOString()
          : null,
      },
      windowStats: streakWindowStats,
      trend: streakTrend,
      sampleBeforeStreak: beforeStreak,
      streakSamples,
      snapshotAtExport: snap,
    });
  };


  return (
    <div className="border-t border-border/40 bg-muted/20 px-3 py-2 text-[11px]">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground uppercase tracking-wide">
          <Activity className="h-3 w-3" aria-hidden="true" />
          Badge stats (QA)
        </span>
        <div className="inline-flex items-center gap-2">
          {isSuspicious && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    role="status"
                    aria-live="polite"
                    aria-label={`Suspicious trigger/fetch ratio held above ${SUSPICIOUS_RATIO_THRESHOLD} for ${suspiciousStreakSeconds} seconds. Window: ${streakWindowStats.triggers} triggers, ${streakWindowStats.fetches} fetches, ratio ${streakWindowStats.ratio.toFixed(2)}`}
                    className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning animate-pulse cursor-help"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                    ratio ≥ {SUSPICIOUS_RATIO_THRESHOLD} for {suspiciousStreakSeconds}s
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="p-2 max-w-[280px]">
                  <div className="font-mono text-[10px] leading-snug space-y-1">
                    <div className="font-semibold text-warning text-[11px] flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                      Suspicious window
                    </div>
                    <div className="text-muted-foreground">
                      ratio ≥ {SUSPICIOUS_RATIO_THRESHOLD} for {suspiciousStreakSeconds}s
                      {streakWindowStats.fromT > 0 && (
                        <span className="block">
                          {new Date(streakWindowStats.fromT).toLocaleTimeString()} →{" "}
                          {new Date(streakWindowStats.toT).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0 pt-1 border-t border-border/40">
                      <span className="text-muted-foreground">triggers (window)</span>
                      <span className="text-right tabular-nums text-foreground">
                        {streakWindowStats.triggers}
                      </span>
                      <span className="text-muted-foreground">fetches (window)</span>
                      <span className="text-right tabular-nums text-foreground">
                        {streakWindowStats.fetches}
                      </span>
                      <span className="text-muted-foreground">saved (window)</span>
                      <span className="text-right tabular-nums text-primary">
                        {Math.max(0, streakWindowStats.triggers - streakWindowStats.fetches)}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-border/40 text-muted-foreground">
                      <span className="block">ratio = fetches / triggers</span>
                      <span className="block">
                        = {streakWindowStats.fetches} / {streakWindowStats.triggers} ={" "}
                        <span className="font-semibold text-warning">
                          {streakWindowStats.ratio.toFixed(3)}
                        </span>
                      </span>
                    </div>
                    <div className="pt-1 border-t border-border/40 text-warning">
                      ⚠ Debounce + 5s TTL not absorbing triggers. Inspect prefetch call sites.
                    </div>
                    {/* Inline recommendation — driven by the regression slope
                        across the current streak window. */}
                    {streakTrend.suggestion && (
                      <div className="pt-1 border-t border-border/40">
                        <div className="text-foreground inline-flex items-center gap-1">
                          <span className="font-semibold">💡 Suggestion</span>
                          <span
                            className={cn(
                              "px-1 rounded text-[9px] font-semibold uppercase tracking-wide",
                              streakTrend.direction === "rising"
                                ? "bg-warning/15 text-warning"
                                : streakTrend.direction === "falling"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                            )}
                            title={`Linear-regression slope: ${streakTrend.slopePerSec.toFixed(3)} ratio/s`}
                          >
                            {streakTrend.direction}
                            {streakTrend.slopePerSec !== 0 && (
                              <>
                                {" "}
                                {streakTrend.slopePerSec > 0 ? "+" : ""}
                                {streakTrend.slopePerSec.toFixed(2)}/s
                              </>
                            )}
                          </span>
                        </div>
                        <div className="text-foreground mt-0.5">
                          → {streakTrend.suggestion.primary}
                        </div>
                        <div className="text-muted-foreground text-[9px] mt-0.5">
                          {streakTrend.suggestion.rationale}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isSuspicious && (
            <button
              type="button"
              onClick={handleJumpToContributors}
              className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/5 px-1.5 py-0.5 text-[10px] font-medium text-warning hover:bg-warning/15 hover:border-warning/60 transition-colors"
              title="Jump to the breakdown of which trigger sources are driving the high ratio"
              aria-label="Jump to top trigger contributors"
            >
              <ArrowDown className="h-2.5 w-2.5" aria-hidden="true" />
              Top contributors
            </button>
          )}
          <span className="text-muted-foreground tabular-nums">
            T{triggers} · F{fetches} · {ratio.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={handleExportDebugJson}
            className="inline-flex items-center gap-1 rounded border border-border/50 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-background hover:border-border transition-colors"
            title="Download a JSON snapshot of all notifications metrics (triggers, fetches, breakdowns, badge renders, sparkline samples)"
            aria-label="Export debug JSON"
          >
            <Download className="h-2.5 w-2.5" aria-hidden="true" />
            Export JSON
          </button>
        </div>
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
            <TooltipProvider delayDuration={150}>
              <div className="space-y-0.5">
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
                  const ratioPerFetch = c.fetches === 0 ? 0 : c.triggers / c.fetches;
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <div
                          className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 cursor-help rounded px-1 -mx-1 hover:bg-muted/40"
                          aria-label={`${label}: ${c.triggers} triggers, ${c.fetches} fetches, ${c.saved} saved (${pct}% efficiency)`}
                        >
                          <span className="text-muted-foreground pl-2.5 underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
                            · {label}
                          </span>
                          <div
                            className="h-1.5 rounded bg-muted/60 overflow-hidden"
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
                          {/* Raw counts inline: triggers → fetches. Hover title also surfaces saved. */}
                          <span
                            className="tabular-nums text-right text-[10px] text-muted-foreground"
                            title={`${c.triggers} triggers → ${c.fetches} fetches (${c.saved} saved)`}
                          >
                            {c.triggers}
                            <span className="opacity-50 mx-0.5">→</span>
                            {c.fetches}
                          </span>
                          <span
                            className={cn(
                              "tabular-nums text-right text-[10px] font-semibold min-w-[2.5rem]",
                              tone
                            )}
                          >
                            {c.triggers === 0 ? "—" : `${pct}%`}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" align="center" className="p-2">
                        <div className="font-mono text-[10px] leading-snug max-w-[260px] space-y-1">
                          <div className="font-semibold text-foreground capitalize text-[11px]">
                            {label}
                          </div>
                          {c.triggers === 0 ? (
                            <div className="text-muted-foreground">
                              No samples yet for this source.
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0">
                                <span className="text-muted-foreground">triggers</span>
                                <span className="text-right tabular-nums">{c.triggers}</span>
                                <span className="text-muted-foreground">fetches</span>
                                <span className="text-right tabular-nums">{c.fetches}</span>
                                <span className="text-muted-foreground">saved</span>
                                <span className="text-right tabular-nums text-primary">
                                  {c.saved}
                                </span>
                                <span className="text-muted-foreground">triggers/fetch</span>
                                <span className="text-right tabular-nums">
                                  {ratioPerFetch.toFixed(2)}
                                </span>
                              </div>
                              <div className="pt-1 border-t border-border/40 text-muted-foreground">
                                <span className="block">efficiency = saved / triggers</span>
                                <span className="block">
                                  = {c.saved} / {c.triggers} ={" "}
                                  <span className={cn("font-semibold", tone)}>
                                    {c.efficiency.toFixed(3)} ({pct}%)
                                  </span>
                                </span>
                              </div>
                              <div className="pt-1 border-t border-border/40">
                                {c.efficiency >= 0.7 ? (
                                  <span className="text-primary">
                                    ✓ Excellent — debounce + 5s TTL absorbing most triggers.
                                  </span>
                                ) : c.efficiency >= 0.3 ? (
                                  <span className="text-foreground">
                                    · Healthy — typical coalescing range.
                                  </span>
                                ) : (
                                  <span className="text-warning">
                                    ⚠ Low — most triggers reach the network. Check debounce
                                    window or call sites.
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>

          {/* Top trigger contributors — ranks hover/focus/drawer-open by their
              contribution to the global trigger/fetch ratio. The contribution
              for a source S is: (triggers_S - saved_S) / max(1, fetches), i.e.
              the share of actual fetches attributable to that source after
              coalescing. Highlighted (jump-flash) when the user clicks the
              warning-badge button. */}
          <div
            ref={topContributorsRef}
            className={cn(
              "mt-1.5 pt-1.5 border-t border-border/30 rounded transition-all",
              "data-[jump-flash=1]:ring-2 data-[jump-flash=1]:ring-warning/60 data-[jump-flash=1]:ring-offset-1 data-[jump-flash=1]:ring-offset-background"
            )}
            aria-label="Top trigger sources contributing to the trigger/fetch ratio"
          >
            <div className="flex items-center justify-between gap-2 mb-0.5 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle
                  className={cn("h-2.5 w-2.5", isSuspicious ? "text-warning" : "text-muted-foreground")}
                  aria-hidden="true"
                />
                Top contributors
              </span>
              <span className="text-[10px]">share of fetches</span>
            </div>
            {(() => {
              const ranked = coalescingRows
                .map(({ key, label }) => {
                  const c = coalescingByTrigger[key];
                  // Net fetches attributable to this source ≈ triggers that
                  // weren't coalesced. Cap at fetches to avoid >100% rounding.
                  const netFetches = Math.max(0, c.triggers - c.saved);
                  const share = fetches === 0 ? 0 : Math.min(1, netFetches / fetches);
                  return { key, label, c, netFetches, share };
                })
                .sort((a, b) => b.netFetches - a.netFetches);
              const totalNet = ranked.reduce((sum, r) => sum + r.netFetches, 0);
              if (totalNet === 0) {
                return (
                  <p className="text-[10px] text-muted-foreground italic pl-3.5">
                    No coalescing-leak fetches yet — all sources are absorbed.
                  </p>
                );
              }
              return (
                <div className="space-y-0.5">
                  {ranked.map(({ key, label, c, netFetches, share }, idx) => {
                    const pct = Math.round(share * 100);
                    const isTop = idx === 0 && netFetches > 0;
                    const tone = isTop && isSuspicious ? "text-warning" : "text-foreground";
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 px-1 -mx-1 rounded"
                      >
                        <span
                          className={cn(
                            "text-muted-foreground inline-flex items-center gap-1 pl-1.5",
                            isTop && "font-semibold"
                          )}
                        >
                          <span className="tabular-nums text-[10px] text-muted-foreground/70 w-3 inline-block">
                            #{idx + 1}
                          </span>
                          {label}
                          {isTop && isSuspicious && (
                            <span className="text-[9px] text-warning uppercase tracking-wide">
                              ◆ top
                            </span>
                          )}
                        </span>
                        <div
                          className="h-1.5 rounded bg-muted/60 overflow-hidden"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                          aria-label={`${label} contributes ${pct}% of actual fetches`}
                        >
                          <div
                            className={cn(
                              "h-full transition-all",
                              netFetches === 0
                                ? "bg-muted-foreground/20"
                                : isTop && isSuspicious
                                  ? "bg-warning"
                                  : "bg-foreground/60"
                            )}
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </div>
                        <span
                          className={cn("tabular-nums text-right text-[10px] font-semibold min-w-[3.5rem]", tone)}
                          title={`${c.triggers} triggers → ${c.saved} saved → ${netFetches} actual fetches (${pct}% of all ${fetches} fetches)`}
                        >
                          {netFetches}/{fetches} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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

          {/* Click-to-expand panel: per-second ratio samples (newest first).
              When a suspicious streak is active, the rows belonging to it get
              a warning-tinted background + left bar so the offending segment
              is immediately spottable. */}
          <details className="mt-1.5">
            <summary
              className={cn(
                "cursor-pointer select-none text-[10px] inline-flex items-center gap-1",
                isSuspicious ? "text-warning hover:text-warning/80" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Toggle per-second ratio samples"
            >
              <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
              Samples ({samples.length}/{SPARK_WINDOW_SECONDS})
              {isSuspicious && (
                <span className="ml-1 text-warning">
                  · streak {suspiciousStreakSeconds}s
                </span>
              )}
            </summary>
            {samples.length === 0 ? (
              <p className="mt-1 text-[10px] text-muted-foreground italic pl-3.5">
                collecting…
              </p>
            ) : (
              <ScrollArea className="max-h-40 mt-1 rounded border border-border/30 bg-background/40">
                <div className="font-mono text-[10px]">
                  {/* Header */}
                  <div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-x-2 px-1.5 py-0.5 border-b border-border/30 text-muted-foreground sticky top-0 bg-background/80 backdrop-blur">
                    <span>#</span>
                    <span>time</span>
                    <span>ratio</span>
                    <span className="text-right">T</span>
                    <span className="text-right">F</span>
                  </div>
                  {/* Newest first → reverse a copy. */}
                  {[...samples].reverse().map((s, revIdx) => {
                    const realIdx = samples.length - 1 - revIdx;
                    const inStreak = streakStartIdx >= 0 && realIdx >= streakStartIdx;
                    const isStreakStart = realIdx === streakStartIdx;
                    const date = new Date(s.t);
                    const hh = String(date.getHours()).padStart(2, "0");
                    const mm = String(date.getMinutes()).padStart(2, "0");
                    const ss = String(date.getSeconds()).padStart(2, "0");
                    const tone = ratioTone(s.ratio, s.triggers);
                    return (
                      <div
                        key={`${s.t}-${realIdx}`}
                        className={cn(
                          "grid grid-cols-[auto_auto_1fr_auto_auto] gap-x-2 px-1.5 py-0.5 items-center border-l-2 transition-colors",
                          inStreak
                            ? "bg-warning/10 border-l-warning"
                            : "border-l-transparent",
                          isStreakStart && "border-t border-t-warning/60"
                        )}
                        title={
                          isStreakStart
                            ? `Suspicious streak started here (ratio ≥ ${SUSPICIOUS_RATIO_THRESHOLD})`
                            : inStreak
                              ? "Part of the current suspicious streak"
                              : undefined
                        }
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {realIdx}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {hh}:{mm}:{ss}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className={cn("tabular-nums font-semibold", tone)}>
                            {s.triggers === 0 ? "—" : s.ratio.toFixed(2)}
                          </span>
                          {isStreakStart && (
                            <span className="text-[9px] text-warning font-semibold uppercase tracking-wide">
                              ◆ start
                            </span>
                          )}
                        </span>
                        <span className="text-right tabular-nums text-muted-foreground">
                          {s.triggers}
                        </span>
                        <span className="text-right tabular-nums text-muted-foreground">
                          {s.fetches}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </details>

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
