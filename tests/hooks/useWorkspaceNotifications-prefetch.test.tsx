import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Track every call to .limit() so we can count actual fetches (initial + prefetch + polling)
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
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
  return {
    supabase: {
      from: vi.fn(() => buildSelectChain()),
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-prefetch-1" } }),
}));

const CACHE_KEY = "workspace_notifications_cache:user-prefetch-1";

const SAMPLE_NOTIFICATIONS = [
  {
    id: "n1",
    user_id: "user-prefetch-1",
    title: "Cached title",
    message: "Cached message",
    type: "info",
    category: "general",
    is_read: false,
    action_url: null,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "n2",
    user_id: "user-prefetch-1",
    title: "Cached title 2",
    message: "Cached message 2",
    type: "success",
    category: "general",
    is_read: true,
    action_url: null,
    metadata: {},
    created_at: "2024-01-02T00:00:00Z",
  },
];

beforeEach(() => {
  sessionStorage.clear();
  limitMock.mockReset();
  limitMock.mockResolvedValue({ data: [], error: null });
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

async function loadHook() {
  vi.resetModules();
  const mod = await import("@/hooks/useWorkspaceNotifications");
  return mod.useWorkspaceNotifications;
}

describe("useWorkspaceNotifications — prefetch TTL idempotency", () => {
  it("does not refetch when called within 5s of last fetch", async () => {
    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    // Wait for the initial mount fetch
    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(1));

    // Immediate prefetch should be a no-op (within 5s window)
    await act(async () => {
      await result.current.prefetch();
    });
    expect(limitMock).toHaveBeenCalledTimes(1);

    // Advance ~3s — still inside the TTL window
    await act(async () => {
      vi.advanceTimersByTime(3_000);
      await result.current.prefetch();
    });
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when prefetch is called after the 5s TTL window", async () => {
    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(1));

    // Move the clock past the 5s threshold
    await act(async () => {
      vi.advanceTimersByTime(5_500);
      await result.current.prefetch();
    });

    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(2));
  });

  it("never toggles isLoading=true during a silent prefetch", async () => {
    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(1));

    let observedLoadingDuringPrefetch = false;
    await act(async () => {
      vi.advanceTimersByTime(6_000);
      const promise = result.current.prefetch();
      if (result.current.isLoading) observedLoadingDuringPrefetch = true;
      await promise;
    });

    expect(observedLoadingDuringPrefetch).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useWorkspaceNotifications — sessionStorage hydration", () => {
  it("hydrates notifications + unreadCount synchronously from cache and skips initial loading state", async () => {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now(), notifications: SAMPLE_NOTIFICATIONS })
    );

    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    // Cache hit must populate state on first render — never showing the skeleton trigger
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("ignores cache entries older than the 60s TTL", async () => {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now() - 120_000, // 2 minutes old
        notifications: SAMPLE_NOTIFICATIONS,
      })
    );

    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    // Stale cache must NOT hydrate — empty list is the expected initial state
    expect(result.current.notifications).toHaveLength(0);
  });

  it("writes a fresh cache entry after a successful fetch", async () => {
    limitMock.mockResolvedValueOnce({ data: SAMPLE_NOTIFICATIONS, error: null });

    const useWorkspaceNotifications = await loadHook();
    const { result } = renderHook(() => useWorkspaceNotifications());

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    const raw = sessionStorage.getItem(CACHE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { cachedAt: number; notifications: unknown[] };
    expect(parsed.notifications).toHaveLength(2);
    expect(typeof parsed.cachedAt).toBe("number");
  });
});
