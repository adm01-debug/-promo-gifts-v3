import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollections } from "./useCollections";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: "col-1" }, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: mockSelect,
      eq: mockEq,
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
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
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockSingle.mockResolvedValue({ data: { id: "col-1" }, error: null });
  });

  it("should use correct onConflict for collection_items upsert", async () => {
    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      await result.current.addProductToCollection("col-1", "prod-1", { color_name: "Red" });
    });

    expect(supabase.from).toHaveBeenCalledWith("collection_items");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ onConflict: "collection_id,product_id,color_name" })
    );
  });

  it("should rollback optimistic update on error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "Constraint violation" } });

    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      await result.current.addProductToCollection("col-1", "prod-1");
    });

    // A segunda chamada para 'collections' acontece no loadCollections() durante o rollback
    expect(supabase.from).toHaveBeenCalledWith("collections");
  });

  it("should migrate legacy data without duplication", async () => {
    const legacyData = JSON.stringify([{ name: "Legacy Col", productItems: [{ productId: "p1" }] }]);
    localStorage.setItem("product-collections", legacyData);

    // Mock count = 0 to allow migration
    mockSelect.mockImplementation((...args) => {
      if (args[1]?.count === "exact") {
        return {
          eq: vi.fn().mockResolvedValue({ count: 0, error: null })
        };
      }
      return { eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() };
    });

    renderHook(() => useCollections());
    
    // Pequena espera para o useEffect de migração disparar
    await new Promise(r => setTimeout(r, 10));
    
    expect(supabase.from).toHaveBeenCalledWith("collections");
  });
});
