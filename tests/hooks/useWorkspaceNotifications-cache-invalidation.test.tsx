import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

/**
 * Verifies that markAllAsRead and clearAll:
 *  1. Remove the sessionStorage cache entry for the current user.
 *  2. Trigger a silent re-fetch (fetchNotifications({ silent: true }))
 *     so unreadCount cannot drift from the server.
 *
 * "Silent" is observable by the fact that isLoading never toggles to true
 * during the operation — only isRefetching does.
 */

const limitMock = vi.fn();
const updateEqEqMock = vi.fn().mockResolvedValue({ error: null });
const updateEqMock = vi.fn(() => ({ eq: updateEqEqMock }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));

vi.mock("@/integrations/supabase/client", () => {
  const buildSelectChain = () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: (...args: unknown[]) => limitMock(...args),
        }),
      }),
    }),
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  });
  return { supabase: { from: vi.fn(() => buildSelectChain()) } };
});

const STABLE_USER = { id: "user-cache-inv-1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: STABLE_USER }),
}));

const CACHE_KEY = "workspace_notifications_cache:user-cache-inv-1";

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
    is_read: false,
    action_url: null,
    metadata: {},
    created_at: "2024-01-02T00:00:00Z",
  },
];

beforeEach(() => {
  sessionStorage.clear();
  limitMock.mockReset();
  updateMock.mockClear();
  updateEqMock.mockClear();
  updateEqEqMock.mockClear();
  updateEqEqMock.mockResolvedValue({ error: null });
  deleteMock.mockClear();
  deleteEqMock.mockClear();
  deleteEqMock.mockResolvedValue({ error: null });
  // Initial fetch returns SEED; subsequent silent re-fetch returns server-fresh state (all read / empty).
  limitMock.mockResolvedValueOnce({ data: SEED, error: null });
});

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

async function loadHook() {
  vi.resetModules();
  const mod = await import("@/hooks/useWorkspaceNotifications");
  return mod.useWorkspaceNotifications;
}

describe("useWorkspaceNotifications — cache invalidation after mutations", () => {
  it("markAllAsRead removes the sessionStorage cache entry and triggers a silent re-fetch", async () => {
    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    // initial fetch + cache write
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(sessionStorage.getItem(CACHE_KEY)).toBeTruthy();
    expect(limitMock).toHaveBeenCalledTimes(1);

    // The silent re-fetch after markAllAsRead returns the server-of-truth
    // (everything already read) — this is what re-hydrates unreadCount.
    const SERVER_AFTER_MARK = SEED.map((n) => ({ ...n, is_read: true }));
    limitMock.mockResolvedValueOnce({ data: SERVER_AFTER_MARK, error: null });

    let observedLoading = false;
    await act(async () => {
      const promise = result.current.markAllAsRead();
      if (result.current.isLoading) observedLoading = true;
      await promise;
    });

    // Mutation actually issued
    expect(updateMock).toHaveBeenCalledTimes(1);

    // Silent re-fetch happened (limit called a 2nd time) and never flipped isLoading
    expect(limitMock).toHaveBeenCalledTimes(2);
    expect(observedLoading).toBe(false);
    expect(result.current.isLoading).toBe(false);

    // unreadCount reflects the server-truth, not just the optimistic update
    expect(result.current.unreadCount).toBe(0);

    // Cache was invalidated then re-written from the silent fetch result.
    // The crucial guarantee is that the entry on disk now matches the server,
    // not the previous (pre-mutation) snapshot.
    const raw = sessionStorage.getItem(CACHE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { notifications: Array<{ is_read: boolean }> };
    expect(parsed.notifications.every((n) => n.is_read)).toBe(true);
  });

  it("clearAll removes the sessionStorage cache entry and triggers a silent re-fetch", async () => {
    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(sessionStorage.getItem(CACHE_KEY)).toBeTruthy();
    expect(limitMock).toHaveBeenCalledTimes(1);

    // Server is empty after clearAll
    limitMock.mockResolvedValueOnce({ data: [], error: null });

    let observedLoading = false;
    await act(async () => {
      const promise = result.current.clearAll();
      if (result.current.isLoading) observedLoading = true;
      await promise;
    });

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(limitMock).toHaveBeenCalledTimes(2); // silent re-fetch happened
    expect(observedLoading).toBe(false);
    expect(result.current.isLoading).toBe(false);

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);

    // Cache rewritten with server-truth (empty list)
    const raw = sessionStorage.getItem(CACHE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { notifications: unknown[] };
    expect(parsed.notifications).toHaveLength(0);
  });

  it("re-fetch after markAllAsRead bypasses the 5s prefetch TTL window", async () => {
    // Regression guard: lastFetchAtRef must be reset to 0 inside markAllAsRead,
    // otherwise the silent re-fetch would be skipped because the initial fetch
    // happened <5s ago.
    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(1));

    limitMock.mockResolvedValueOnce({ data: [], error: null });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    // The silent re-fetch must have run even though only milliseconds passed
    expect(limitMock).toHaveBeenCalledTimes(2);
  });
});
