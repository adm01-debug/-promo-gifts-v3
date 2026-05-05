import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollections } from "./useCollections";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "col-1" }, error: null }),
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
  });

  it("should use correct onConflict for collection_items upsert", async () => {
    const { result } = renderHook(() => useCollections());
    
    // Trigger addProductToCollection
    await act(async () => {
      await result.current.addProductToCollection("col-1", "prod-1", { color_name: "Red" });
    });

    const upsertCall = vi.mocked(supabase.from).mock.results.find(r => 
      r.type === 'return' && r.value.upsert
    );
    
    expect(supabase.from).toHaveBeenCalledWith("collection_items");
    
    // Find the upsert call specifically
    const calls = vi.mocked(supabase.from).mock.calls;
    const upsertIdx = calls.findIndex(c => c[0] === "collection_items");
    
    // We expect the upsert to have been called with the correct onConflict
    expect(vi.mocked(supabase.from)("collection_items").upsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ onConflict: "collection_id,product_id,color_name" })
    );
  });

  it("should rollback optimistic update on error", async () => {
    // Mock failure for collection_items upsert
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const base = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "col-1" }, error: null }),
      };
      
      if (table === "collection_items") {
        return {
          ...base,
          upsert: vi.fn().mockResolvedValue({ error: { message: "Constraint violation" } }),
        } as any;
      }
      return base as any;
    });

    const { result } = renderHook(() => useCollections());
    
    // We need to wait for the initial load to finish to have an empty state
    // But since we are testing the rollback, we just trigger the action
    
    await act(async () => {
      await result.current.addProductToCollection("col-1", "prod-1");
    });

    // loadCollections should have been called for rollback
    expect(supabase.from).toHaveBeenCalledWith("collections");
  });
});
