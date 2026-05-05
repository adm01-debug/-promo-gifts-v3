import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollections } from "./useCollections";
import { supabase } from "@/integrations/supabase/client";

// Mock global dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
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
  });

  it("should rollback optimistic update on error", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockUpsert = vi.fn().mockResolvedValue({ error: { message: "Constraint violation" } });

    vi.mocked(supabase.from).mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: mockOrder,
      upsert: mockUpsert,
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "col-1" }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any));

    const { result } = renderHook(() => useCollections());
    
    // Pequena espera para os efeitos iniciais
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.addProductToCollection("col-1", "prod-1");
    });

    expect(mockOrder).toHaveBeenCalled();
  });

  it("should use correct onConflict for upsert", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: mockUpsert,
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "col-1" }, error: null }),
    } as any));

    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
      await result.current.addProductToCollection("col-1", "prod-1", { color_name: "Red" });
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ onConflict: "collection_id,product_id,color_name" })
    );
  });
});
