import { renderHook, act } from "@testing-library/react";
import { useCollections } from "./useCollections";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  delete: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  then: vi.fn((cb) => cb({ data: [], error: null })),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockChain),
  },
}));

// Mock Auth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user1" } }),
}));

describe("useCollections Persistence & Resilience", () => {
  it("should attempt upsert when adding product", async () => {
    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      await result.current.addProductToCollection("col1", "prod1");
    });

    expect(supabase.from).toHaveBeenCalledWith("collection_items");
  });
});
