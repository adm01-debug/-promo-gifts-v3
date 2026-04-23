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

/**
 * One end-to-end timing sample from the FIRST hover/focus event of a burst all
 * the way to the moment the bell's `prefetch()` promise resolved (or the
 * drawer-open path completed). Used to verify the debounce keeps end-to-end
 * latency well within the 5s prefetch TTL window.
 */
export interface TriggerToFetchTiming {
  /** Source of the FIRST event in the burst (hover/focus/drawer-open). */
  source: TriggerSource;
  /** ms from first event → debounce timer fired (queued the prefetch call). */
  debounceMs: number;
  /** ms from prefetch() invocation → promise resolved (network or TTL hit). */
  fetchMs: number;
  /** debounceMs + fetchMs. Should always be < TRIGGER_TO_FETCH_TTL_MS. */
  totalMs: number;
  /** Whether `totalMs < TRIGGER_TO_FETCH_TTL_MS` (5s TTL window). */
  withinTtl: boolean;
  /** How many trigger events were coalesced into this single prefetch. */
  coalescedTriggers: number;
  at: number;
}

/** Hit/miss counters for the <16ms badge-render budget. */
export interface BadgeRenderBudget {
  hits: number;
  misses: number;
  total: number;
  /** hits / total (0..1). */
  hitRate: number;
  /** Same breakdown but only counting cache renders (most relevant for the budget). */
  byCache: { hits: number; misses: number; total: number; hitRate: number };
  /** Same breakdown but only counting network renders. */
  byNetwork: { hits: number; misses: number; total: number; hitRate: number };
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
  /** Running hit/miss counters for the <16ms render budget. */
  badgeBudget: BadgeRenderBudget;
  /** Last N trigger→fetch end-to-end timings (most recent first). */
  triggerToFetch: TriggerToFetchTiming[];
  lastTriggerToFetch: TriggerToFetchTiming | null;
  /** Number of timings that exceeded TRIGGER_TO_FETCH_TTL_MS. */
  triggerToFetchTtlBreaches: number;
}

const TRIGGER_TO_FETCH_HISTORY = 20;
/**
 * Hard ceiling for the trigger→prefetch round-trip. Matches the 5 s prefetch
 * TTL inside `useWorkspaceNotifications.prefetch`. Any sample above this is
 * counted as a "TTL breach" and warned to the console.
 */
export const TRIGGER_TO_FETCH_TTL_MS = 5000;

const BADGE_RENDER_HISTORY = 20;
/** Render budget threshold (ms). A render is a "hit" iff `elapsedMs < BUDGET_MS`. */
export const BADGE_RENDER_BUDGET_MS = 16;

const state = {
  triggers: 0,
  fetches: 0,
  byTrigger: { hover: 0, focus: 0, "drawer-open": 0 } as Record<TriggerSource, number>,
  byFetch: { initial: 0, polling: 0, prefetch: 0, mutation: 0 } as Record<FetchSource, number>,
  since: Date.now(),
  badgeRenders: [] as BadgeRenderStat[],
  badgeBudget: {
    cache: { hits: 0, misses: 0 },
    network: { hits: 0, misses: 0 },
  },
  triggerToFetch: [] as TriggerToFetchTiming[],
  triggerToFetchTtlBreaches: 0,
};

type BadgeListener = (stat: BadgeRenderStat) => void;
const badgeListeners = new Set<BadgeListener>();

function buildBudget(): BadgeRenderBudget {
  const c = state.badgeBudget.cache;
  const n = state.badgeBudget.network;
  const cTotal = c.hits + c.misses;
  const nTotal = n.hits + n.misses;
  const total = cTotal + nTotal;
  const hits = c.hits + n.hits;
  const misses = c.misses + n.misses;
  const rate = (h: number, t: number) => (t === 0 ? 0 : Number((h / t).toFixed(3)));
  return {
    hits,
    misses,
    total,
    hitRate: rate(hits, total),
    byCache: { hits: c.hits, misses: c.misses, total: cTotal, hitRate: rate(c.hits, cTotal) },
    byNetwork: { hits: n.hits, misses: n.misses, total: nTotal, hitRate: rate(n.hits, nTotal) },
  };
}

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
    const isHit = stat.elapsedMs < BADGE_RENDER_BUDGET_MS;
    // Trust the running counter to be derived from the same threshold so the
    // hit/miss totals stay consistent even if a caller passes a stale `hit`.
    const normalized: Omit<BadgeRenderStat, "at"> = { ...stat, hit: isHit };
    const full: BadgeRenderStat = { ...normalized, at: Date.now() };
    state.badgeRenders.unshift(full);
    if (state.badgeRenders.length > BADGE_RENDER_HISTORY) {
      state.badgeRenders.length = BADGE_RENDER_HISTORY;
    }
    const bucket = state.badgeBudget[stat.source];
    if (isHit) bucket.hits += 1;
    else bucket.misses += 1;
    debugLog("badge-render", {
      ...(full as unknown as Record<string, unknown>),
      budgetMs: BADGE_RENDER_BUDGET_MS,
    });
    badgeListeners.forEach((l) => {
      try { l(full); } catch { /* ignore */ }
    });
  },

  subscribeBadgeRender(listener: BadgeListener): () => void {
    badgeListeners.add(listener);
    return () => { badgeListeners.delete(listener); };
  },

  /**
   * Emit a one-shot summary log of the current badge-render budget. Safe to
   * call from React unmount cleanups — silently no-ops if debug is OFF or if
   * no badge renders have been recorded yet.
   */
  logBadgeBudgetSummary(reason: string = "unmount") {
    if (!isDebugEnabled()) return;
    const budget = buildBudget();
    if (budget.total === 0) return;
    debugLog("badge-budget-summary", {
      reason,
      budgetMs: BADGE_RENDER_BUDGET_MS,
      ...budget,
    });
  },

  /**
   * Record one end-to-end trigger→prefetch round-trip. Should be called from
   * the bell after the prefetch promise resolves, with the timestamp of the
   * FIRST event in the burst (so debounceMs reflects the wait that actually
   * coalesced events).
   */
  recordTriggerToFetch(sample: Omit<TriggerToFetchTiming, "totalMs" | "withinTtl" | "at">) {
    const totalMs = Number((sample.debounceMs + sample.fetchMs).toFixed(2));
    const withinTtl = totalMs < TRIGGER_TO_FETCH_TTL_MS;
    const full: TriggerToFetchTiming = {
      ...sample,
      debounceMs: Number(sample.debounceMs.toFixed(2)),
      fetchMs: Number(sample.fetchMs.toFixed(2)),
      totalMs,
      withinTtl,
      at: Date.now(),
    };
    state.triggerToFetch.unshift(full);
    if (state.triggerToFetch.length > TRIGGER_TO_FETCH_HISTORY) {
      state.triggerToFetch.length = TRIGGER_TO_FETCH_HISTORY;
    }
    if (!withinTtl) {
      state.triggerToFetchTtlBreaches += 1;
      // Always warn on breach — even with debug OFF — since this signals
      // a real regression of the prefetch debounce vs TTL contract.
      // eslint-disable-next-line no-console
      console.warn(
        `[notifications-metrics] trigger→fetch exceeded TTL window (${totalMs}ms >= ${TRIGGER_TO_FETCH_TTL_MS}ms)`,
        full
      );
    }
    debugLog("trigger-to-fetch", {
      ...(full as unknown as Record<string, unknown>),
      ttlMs: TRIGGER_TO_FETCH_TTL_MS,
    });
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
      badgeBudget: buildBudget(),
      triggerToFetch: [...state.triggerToFetch],
      lastTriggerToFetch: state.triggerToFetch[0] ?? null,
      triggerToFetchTtlBreaches: state.triggerToFetchTtlBreaches,
    };
  },

  reset() {
    state.triggers = 0;
    state.fetches = 0;
    state.byTrigger = { hover: 0, focus: 0, "drawer-open": 0 };
    state.byFetch = { initial: 0, polling: 0, prefetch: 0, mutation: 0 };
    state.badgeRenders = [];
    state.badgeBudget = {
      cache: { hits: 0, misses: 0 },
      network: { hits: 0, misses: 0 },
    };
    state.since = Date.now();
  },
};

// Expose for devtools inspection: window.__notificationsMetrics.snapshot()
if (typeof window !== "undefined") {
  (window as unknown as { __notificationsMetrics?: typeof notificationsMetrics }).__notificationsMetrics =
    notificationsMetrics;
}
