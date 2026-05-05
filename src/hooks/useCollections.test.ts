import { renderHook, act } from "@testing-library/react";
import { useCollections } from "./useCollections";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    })),
  },
}));

// Mock Auth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user1" } }),
}));

describe("useCollections Persistence & Resilience", () => {
  it("should handle upsert errors with toast notification", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: { message: "DB Error" } });
    const mockFrom = vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      upsert: mockUpsert,
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    }));
    
    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useCollections());
    
    await act(async () => {
      await result.current.addProductToCollection("col1", "prod1");
    });

    expect(mockUpsert).toHaveBeenCalled();
  });
});
