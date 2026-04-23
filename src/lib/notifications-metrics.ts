/**
 * notifications-metrics — lightweight in-memory counters for the bell prefetch flow.
 *
 * Tracks how often the UI *attempts* to prefetch (hover/focus, drawer open) versus
 * how often those attempts actually reach the network (cleared the 5s TTL gate
 * inside `useWorkspaceNotifications.prefetch`).
 *
 * Zero dependencies, no React. Safe to import from anywhere. In dev (or when
 * `localStorage["debug:notifications"] === "1"`) every increment also emits a
 * console line so you can eyeball the ratio in real time.
 *
 * Usage:
 *   import { notificationsMetrics } from "@/lib/notifications-metrics";
 *   notificationsMetrics.recordTrigger("hover");
 *   notificationsMetrics.recordFetch("prefetch");
 *   notificationsMetrics.snapshot();   // { triggers, fetches, byTrigger, byFetch, ratio }
 *
 * Exposed on window as `__notificationsMetrics` for ad-hoc inspection.
 */

export type TriggerSource = "hover" | "focus" | "drawer-open";
export type FetchSource = "initial" | "polling" | "prefetch" | "mutation";
export type BadgeRenderSource = "cache" | "network";

export interface BadgeRenderStat {
  source: BadgeRenderSource;
  /** Time from hook mount to badge first paint (ms). Target: <16ms for cache. */
  elapsedMs: number;
  /** For cache renders: age of the cached payload (ms). null for network renders. */
  cacheAgeMs: number | null;
  /** For network renders: round-trip duration (ms). null for cache renders. */
  networkMs: number | null;
  unreadCount: number;
  hit: boolean;
  at: number;
}

interface Snapshot {
  triggers: number;
  fetches: number;
  byTrigger: Record<TriggerSource, number>;
  byFetch: Record<FetchSource, number>;
  /** fetches / triggers — lower is better (more coalescing / TTL hits). */
  ratio: number;
  since: number;
  /** Last N badge render stats (most recent first). */
  badgeRenders: BadgeRenderStat[];
  lastBadgeRender: BadgeRenderStat | null;
}

const BADGE_RENDER_HISTORY = 20;

const state = {
  triggers: 0,
  fetches: 0,
  byTrigger: { hover: 0, focus: 0, "drawer-open": 0 } as Record<TriggerSource, number>,
  byFetch: { initial: 0, polling: 0, prefetch: 0, mutation: 0 } as Record<FetchSource, number>,
  since: Date.now(),
  badgeRenders: [] as BadgeRenderStat[],
};

type BadgeListener = (stat: BadgeRenderStat) => void;
const badgeListeners = new Set<BadgeListener>();

function isDebugEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.localStorage?.getItem("debug:notifications") === "1") return true;
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

function debugLog(event: string, payload: Record<string, unknown>) {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(
    `%c[notifications-metrics:${event}]`,
    "color:#0891b2;font-weight:600",
    payload
  );
}

export const notificationsMetrics = {
  recordTrigger(source: TriggerSource) {
    state.triggers += 1;
    state.byTrigger[source] += 1;
    debugLog("trigger", {
      source,
      triggers: state.triggers,
      fetches: state.fetches,
      ratio: state.triggers === 0 ? 0 : Number((state.fetches / state.triggers).toFixed(3)),
    });
  },

  recordFetch(source: FetchSource) {
    state.fetches += 1;
    state.byFetch[source] += 1;
    debugLog("fetch", {
      source,
      triggers: state.triggers,
      fetches: state.fetches,
      ratio: state.triggers === 0 ? 0 : Number((state.fetches / state.triggers).toFixed(3)),
    });
  },

  recordBadgeRender(stat: Omit<BadgeRenderStat, "at">) {
    const full: BadgeRenderStat = { ...stat, at: Date.now() };
    state.badgeRenders.unshift(full);
    if (state.badgeRenders.length > BADGE_RENDER_HISTORY) {
      state.badgeRenders.length = BADGE_RENDER_HISTORY;
    }
    debugLog("badge-render", full as unknown as Record<string, unknown>);
    badgeListeners.forEach((l) => {
      try { l(full); } catch { /* ignore */ }
    });
  },

  subscribeBadgeRender(listener: BadgeListener): () => void {
    badgeListeners.add(listener);
    return () => { badgeListeners.delete(listener); };
  },

  snapshot(): Snapshot {
    return {
      triggers: state.triggers,
      fetches: state.fetches,
      byTrigger: { ...state.byTrigger },
      byFetch: { ...state.byFetch },
      ratio: state.triggers === 0 ? 0 : Number((state.fetches / state.triggers).toFixed(3)),
      since: state.since,
      badgeRenders: [...state.badgeRenders],
      lastBadgeRender: state.badgeRenders[0] ?? null,
    };
  },

  reset() {
    state.triggers = 0;
    state.fetches = 0;
    state.byTrigger = { hover: 0, focus: 0, "drawer-open": 0 };
    state.byFetch = { initial: 0, polling: 0, prefetch: 0, mutation: 0 };
    state.badgeRenders = [];
    state.since = Date.now();
  },
};

// Expose for devtools inspection: window.__notificationsMetrics.snapshot()
if (typeof window !== "undefined") {
  (window as unknown as { __notificationsMetrics?: typeof notificationsMetrics }).__notificationsMetrics =
    notificationsMetrics;
}
