import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollections } from "./useCollections";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: "col-1" }, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: mockEq,
      in: vi.fn().mockReturnThis(),
      order: mockOrder,
      upsert: mockUpsert,
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: mockSingle,
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("useCollections - Persistence and Constraints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnThis();
    mockSingle.mockResolvedValue({ data: { id: "col-1" }, error: null });
  });

  it("should rollback optimistic update on error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "Constraint violation" } });

    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      await result.current.addProductToCollection("col-1", "prod-1");
    });

    // Check if reload happened
    expect(mockOrder).toHaveBeenCalled();
  });
});
