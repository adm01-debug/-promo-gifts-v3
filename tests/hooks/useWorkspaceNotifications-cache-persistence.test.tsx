/**
 * useWorkspaceNotifications — cross-mount cache persistence
 *
 * Verifies the full sessionStorage round-trip:
 *
 *   Mount #1 (cold cache):
 *     - readCache() returns null → first badge-render is `source: "network"`.
 *     - After fetch resolves, writeCache() persists the payload to
 *       `sessionStorage["workspace_notifications_cache:<userId>"]` with the
 *       expected shape: `{ cachedAt: <number ≈ Date.now()>, notifications: [...] }`.
 *     - cachedAt is fresh (age < CACHE_TTL_MS = 60s).
 *
 *   Unmount, then Mount #2 (warm cache, same user):
 *     - readCache() finds the persisted entry, hydration path runs synchronously,
 *       first badge-render is `source: "cache"` with cacheAgeMs reflecting the
 *       gap between mounts.
 *     - The cached notifications array is restored verbatim into hook state.
 *     - The Supabase client is NOT called for an extra round-trip on the cache
 *       path before state is committed (the background fetch still fires, but
 *       the badge-render source ref was already pinned to "cache").
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

const STABLE_USER = { id: "user-cache-persistence-1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: STABLE_USER }),
}));

const CACHE_KEY = `workspace_notifications_cache:${STABLE_USER.id}`;
const CACHE_TTL_MS = 60_000;

const SEED = [
  {
    id: "n1",
    user_id: STABLE_USER.id,
    title: "First",
    message: "Hello",
    type: "info",
    category: "general",
    is_read: false,
    action_url: null,
    metadata: { foo: "bar" },
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "n2",
    user_id: STABLE_USER.id,
    title: "Second",
    message: "World",
    type: "warning",
    category: "system",
    is_read: true,
    action_url: "/somewhere",
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

describe("useWorkspaceNotifications — cross-mount sessionStorage persistence", () => {
  it("Mount #1 writes a fresh cache entry; Mount #2 hydrates from it (source: cache)", async () => {
    expect(sessionStorage.getItem(CACHE_KEY)).toBeNull();
    limitMock.mockResolvedValue({ data: SEED, error: null });

    const { useWorkspaceNotifications, metrics } = await loadHookAndMetrics();

    // ── Mount #1 (cold cache) ───────────────────────────────────────────────
    const before = Date.now();
    const first = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => {
      expect(first.result.current.notifications.length).toBe(SEED.length);
    });

    // First badge-render must be "network" (cache was empty).
    const firstNetworkLogs = findBadgeRenderLogs().filter((p) => p?.source === "network");
    const firstCacheLogs = findBadgeRenderLogs().filter((p) => p?.source === "cache");
    expect(firstNetworkLogs.length).toBeGreaterThanOrEqual(1);
    expect(firstCacheLogs.length).toBe(0);

    // sessionStorage must now contain a well-formed entry.
    const persistedRaw = sessionStorage.getItem(CACHE_KEY);
    expect(persistedRaw).not.toBeNull();
    const persisted = JSON.parse(persistedRaw as string) as {
      cachedAt: number;
      notifications: typeof SEED;
    };
    expect(typeof persisted.cachedAt).toBe("number");
    expect(persisted.cachedAt).toBeGreaterThanOrEqual(before);
    expect(persisted.cachedAt).toBeLessThanOrEqual(Date.now());
    // TTL metadata: the entry must be considered fresh (< 60s).
    expect(Date.now() - persisted.cachedAt).toBeLessThan(CACHE_TTL_MS);
    // Payload round-trip: every field preserved.
    expect(persisted.notifications).toHaveLength(SEED.length);
    expect(persisted.notifications[0]).toMatchObject({
      id: "n1",
      title: "First",
      message: "Hello",
      is_read: false,
      metadata: { foo: "bar" },
    });
    expect(persisted.notifications[1]).toMatchObject({
      id: "n2",
      title: "Second",
      is_read: true,
      action_url: "/somewhere",
    });

    const fetchCallsAfterMount1 = limitMock.mock.calls.length;
    expect(fetchCallsAfterMount1).toBeGreaterThanOrEqual(1);

    // Snapshot lastBadgeRender for the network mount.
    expect(metrics.snapshot().lastBadgeRender?.source).toBe("network");

    // Unmount mount #1 cleanly.
    first.unmount();

    // Reset the metrics counters so mount #2 assertions are isolated, but do
    // NOT clear sessionStorage — that's the surface under test.
    metrics.reset();
    consoleSpy.mockClear();

    // Wait a small slice so cacheAgeMs on mount #2 is provably > 0.
    await new Promise((r) => setTimeout(r, 25));

    // ── Mount #2 (warm cache, same user) ────────────────────────────────────
    const fetchCallsBeforeMount2 = limitMock.mock.calls.length;
    const second = renderHook(() => useWorkspaceNotifications());

    // Hydration is synchronous: notifications restored from cache immediately.
    await waitFor(() => {
      expect(second.result.current.notifications.length).toBe(SEED.length);
    });

    // First badge-render on mount #2 MUST be "cache".
    const secondCacheLogs = findBadgeRenderLogs().filter((p) => p?.source === "cache");
    const secondNetworkLogs = findBadgeRenderLogs().filter((p) => p?.source === "network");
    expect(secondCacheLogs.length).toBeGreaterThanOrEqual(1);
    expect(secondNetworkLogs.length).toBe(0);

    const cachePayload = secondCacheLogs[0];
    expect(cachePayload.source).toBe("cache");
    expect(cachePayload.unreadCount).toBe(1); // SEED has exactly 1 unread.
    expect(typeof cachePayload.cacheAgeMs).toBe("number");
    expect(cachePayload.cacheAgeMs as number).toBeGreaterThanOrEqual(20);
    expect(cachePayload.cacheAgeMs as number).toBeLessThan(CACHE_TTL_MS);

    // Programmatic surface mirrors the log.
    const snap = metrics.snapshot();
    expect(snap.lastBadgeRender?.source).toBe("cache");
    expect(snap.lastBadgeRender?.cacheAgeMs).not.toBeNull();
    expect(snap.lastBadgeRender?.networkMs).toBeNull();
    expect(snap.lastBadgeRender?.unreadCount).toBe(1);

    // Hook state mirrors the persisted payload (deep equality on identifiers).
    const restoredIds = second.result.current.notifications.map((n) => n.id);
    expect(restoredIds).toEqual(SEED.map((n) => n.id));
    expect(second.result.current.unreadCount).toBe(1);

    // The background-refresh fetch DOES still fire on mount #2 (the hook always
    // re-fetches), but it must NOT have happened BEFORE the cache hydration
    // committed state — otherwise the badge-render source could have flipped.
    // We can only assert the post-condition: at least one extra call queued.
    await waitFor(() => {
      expect(limitMock.mock.calls.length).toBeGreaterThan(fetchCallsBeforeMount2);
    });
    // And the source ref pinned to "cache" was NOT overwritten by the network
    // response (no late "network" badge-render snuck in).
    const lateNetworkLogs = findBadgeRenderLogs().filter((p) => p?.source === "network");
    expect(lateNetworkLogs.length).toBe(0);

    second.unmount();
  });

  it("Mount #2 ignores the persisted entry once it crosses the TTL boundary", async () => {
    // Pre-seed a stale entry directly (simulates a session where >60s elapsed
    // between mounts) and confirm mount #2 falls back to "network".
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now() - (CACHE_TTL_MS + 1000), // 61s old
        notifications: SEED,
      })
    );
    limitMock.mockResolvedValue({ data: SEED, error: null });

    const { useWorkspaceNotifications, metrics } = await loadHookAndMetrics();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(SEED.length);
    });

    const cacheLogs = findBadgeRenderLogs().filter((p) => p?.source === "cache");
    const networkLogs = findBadgeRenderLogs().filter((p) => p?.source === "network");
    expect(cacheLogs.length).toBe(0);
    expect(networkLogs.length).toBeGreaterThanOrEqual(1);

    // The stale entry is replaced with a fresh one after the network fetch.
    const refreshedRaw = sessionStorage.getItem(CACHE_KEY);
    expect(refreshedRaw).not.toBeNull();
    const refreshed = JSON.parse(refreshedRaw as string) as { cachedAt: number };
    expect(Date.now() - refreshed.cachedAt).toBeLessThan(CACHE_TTL_MS);

    expect(metrics.snapshot().lastBadgeRender?.source).toBe("network");
  });
});
