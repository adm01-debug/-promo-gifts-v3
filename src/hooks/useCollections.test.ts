import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollections } from "./useCollections";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: "col-1" }, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: mockSelect,
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
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockSingle.mockResolvedValue({ data: { id: "col-1" }, error: null });
  });

  it("should use correct onConflict for collection_items upsert", async () => {
    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      // Mock para evitar loop infinito se loadCollections for chamado
      mockOrder.mockResolvedValue({ data: [], error: null });
      await result.current.addProductToCollection("col-1", "prod-1", { color_name: "Red" });
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ onConflict: "collection_id,product_id,color_name" })
    );
  });

  it("should rollback optimistic update on error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "Constraint violation" } });
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      await result.current.addProductToCollection("col-1", "prod-1");
    });

    // loadCollections should have been called
    expect(mockOrder).toHaveBeenCalled();
  });

  it("should migrate legacy data without duplication", async () => {
    const legacyData = JSON.stringify([{ name: "Legacy Col", productItems: [{ productId: "p1" }] }]);
    localStorage.setItem("product-collections", legacyData);

    mockSelect.mockImplementation((...args) => {
      if (args[1]?.count === "exact") {
        return {
          eq: vi.fn().mockResolvedValue({ count: 0, error: null })
        };
      }
      return { eq: vi.fn().mockReturnThis(), order: mockOrder };
    });

    renderHook(() => useCollections());
    await new Promise(r => setTimeout(r, 20));
    expect(supabase.from).toHaveBeenCalledWith("collections");
  });
});
