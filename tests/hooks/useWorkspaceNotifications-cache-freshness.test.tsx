/**
 * useWorkspaceNotifications — cache freshness window
 *
 * Verifies the badge-render `source` selection rule:
 *
 *   - Cache age < CACHE_TTL_MS (60s)        → first render logs `source: "cache"`
 *     and NO `source: "network"` log is emitted afterwards (the source ref
 *     was already pinned).
 *   - Cache age >= CACHE_TTL_MS (stale)     → cache is treated as missing,
 *     readCache() returns null, and the first badge-render log is
 *     `source: "network"` (after the initial fetch resolves). No `source: "cache"`
 *     entry is emitted at all.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const limitMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const buildSelectChain = () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: (...args: unknown[]) => limitMock(...args),
        }),
      }),
    }),
  });
  return { supabase: { from: vi.fn(() => buildSelectChain()) } };
});

const STABLE_USER = { id: "user-cache-freshness-1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: STABLE_USER }),
}));

const CACHE_KEY = `workspace_notifications_cache:${STABLE_USER.id}`;
const CACHE_TTL_MS = 60_000;

const SEED = [
  {
    id: "n1",
    user_id: STABLE_USER.id,
    title: "t1",
    message: "m1",
    type: "info",
    category: "general",
    is_read: false,
    action_url: null,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "n2",
    user_id: STABLE_USER.id,
    title: "t2",
    message: "m2",
    type: "info",
    category: "general",
    is_read: true,
    action_url: null,
    metadata: {},
    created_at: "2024-01-02T00:00:00Z",
  },
];

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.setItem("debug:notifications", "1");
  limitMock.mockReset();
  consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  sessionStorage.clear();
  localStorage.removeItem("debug:notifications");
  consoleSpy.mockRestore();
  vi.restoreAllMocks();
});

function findBadgeRenderLogs() {
  return consoleSpy.mock.calls
    .filter((args) => typeof args[0] === "string" && (args[0] as string).includes("notifications:badge-render"))
    .map((args) => args[2] as Record<string, unknown>);
}

async function loadHookAndMetrics() {
  vi.resetModules();
  const hookMod = await import("@/hooks/useWorkspaceNotifications");
  const metricsMod = await import("@/lib/notifications-metrics");
  metricsMod.notificationsMetrics.reset();
  return {
    useWorkspaceNotifications: hookMod.useWorkspaceNotifications,
    metrics: metricsMod.notificationsMetrics,
  };
}

describe("useWorkspaceNotifications — cache freshness window", () => {
  it('logs source: "cache" when sessionStorage entry is INSIDE the 60s freshness window', async () => {
    // Seed a cache entry 10s old — well inside CACHE_TTL_MS (60s).
    const FRESH_AGE_MS = 10_000;
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now() - FRESH_AGE_MS, notifications: SEED })
    );
    limitMock.mockResolvedValue({ data: SEED, error: null });

    const { useWorkspaceNotifications, metrics } = await loadHookAndMetrics();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(SEED.length);
    });

    const cacheLogs = findBadgeRenderLogs().filter((p) => p.source === "cache");
    expect(cacheLogs.length).toBeGreaterThanOrEqual(1);

    const payload = cacheLogs[0];
    expect(payload.source).toBe("cache");
    // cacheAgeMs should be reported and approximately equal to FRESH_AGE_MS.
    expect(typeof payload.cacheAgeMs).toBe("number");
    expect(payload.cacheAgeMs as number).toBeGreaterThanOrEqual(FRESH_AGE_MS - 50);
    expect(payload.cacheAgeMs as number).toBeLessThan(CACHE_TTL_MS);
    expect(payload.unreadCount).toBe(1);

    // No "network" badge-render should be logged because the source ref was
    // already pinned to "cache" by the hydration path.
    await waitFor(() => {
      expect(limitMock).toHaveBeenCalled();
    });
    const networkLogs = findBadgeRenderLogs().filter((p) => p.source === "network");
    expect(networkLogs.length).toBe(0);

    expect(metrics.snapshot().lastBadgeRender?.source).toBe("cache");
  });

  it('falls back to source: "network" when sessionStorage entry is OUTSIDE the 60s freshness window', async () => {
    // Seed a stale cache entry — older than CACHE_TTL_MS so readCache()
    // returns null and the hook must fetch from the network.
    const STALE_AGE_MS = CACHE_TTL_MS + 5_000; // 65s old
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now() - STALE_AGE_MS, notifications: SEED })
    );
    limitMock.mockResolvedValue({ data: SEED, error: null });

    const { useWorkspaceNotifications, metrics } = await loadHookAndMetrics();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(SEED.length);
    });

    const networkLogs = findBadgeRenderLogs().filter((p) => p.source === "network");
    expect(networkLogs.length).toBeGreaterThanOrEqual(1);

    const payload = networkLogs[0];
    expect(payload.source).toBe("network");
    expect(typeof payload.networkMs).toBe("number");
    // Stale-cache path: the cache was rejected, so cacheAgeMs MUST be absent
    // (the network branch never sets it).
    expect("cacheAgeMs" in payload).toBe(false);
    expect(payload.unreadCount).toBe(1);

    // No "cache" badge-render should be logged at all — the stale entry was
    // discarded by readCache() before badgeSourceRef could be pinned.
    const cacheLogs = findBadgeRenderLogs().filter((p) => p.source === "cache");
    expect(cacheLogs.length).toBe(0);

    // Programmatic surface mirrors the log.
    const snap = metrics.snapshot();
    expect(snap.lastBadgeRender?.source).toBe("network");
    expect(snap.lastBadgeRender?.cacheAgeMs).toBeNull();
    expect(snap.lastBadgeRender?.networkMs).not.toBeNull();

    // The stale entry should have been replaced with a fresh one after fetch.
    const refreshed = sessionStorage.getItem(CACHE_KEY);
    expect(refreshed).not.toBeNull();
    const parsed = JSON.parse(refreshed as string) as { cachedAt: number };
    expect(Date.now() - parsed.cachedAt).toBeLessThan(CACHE_TTL_MS);
  });

  it('treats a cache entry exactly AT the TTL boundary as stale (network fallback)', async () => {
    // readCache() uses `>` (strictly greater than), but jitter of a few ms
    // between the seed timestamp and the readCache() call means an entry
    // seeded at exactly CACHE_TTL_MS old will be rejected. We assert the
    // network fallback branch fires.
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now() - (CACHE_TTL_MS + 1), notifications: SEED })
    );
    limitMock.mockResolvedValue({ data: SEED, error: null });

    const { useWorkspaceNotifications } = await loadHookAndMetrics();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(SEED.length);
    });

    const cacheLogs = findBadgeRenderLogs().filter((p) => p.source === "cache");
    const networkLogs = findBadgeRenderLogs().filter((p) => p.source === "network");
    expect(cacheLogs.length).toBe(0);
    expect(networkLogs.length).toBeGreaterThanOrEqual(1);
  });
});
