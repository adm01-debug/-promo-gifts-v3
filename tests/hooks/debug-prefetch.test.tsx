import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const limitMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: limitMock,
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

describe("debug", () => {
  it("runs", async () => {
    const { useWorkspaceNotifications } = await import("@/hooks/useWorkspaceNotifications");
    const { result } = renderHook(() => useWorkspaceNotifications());
    await new Promise((r) => setTimeout(r, 200));
    console.log("CALL COUNT:", limitMock.mock.calls.length);
    console.log("notifications:", result.current.notifications.length);
    expect(limitMock.mock.calls.length).toBeLessThan(5);
  });
});
