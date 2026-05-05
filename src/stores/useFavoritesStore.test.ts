import { renderHook, act } from "@testing-library/react";
import { useFavoritesStore } from "./useFavoritesStore";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock Toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("useFavoritesStore Advanced Scenarios", () => {
  const STORAGE_KEY = "product-favorites";

  beforeEach(() => {
    localStorage.clear();
    const store = useFavoritesStore.getState();
    act(() => {
      // Usamos act para garantir que o estado interno seja limpo se necessário
      // Mas aqui resetamos manualmente a store para cada teste
      useFavoritesStore.setState({ favorites: [], favoriteCount: 0, error: null });
    });
    vi.clearAllMocks();
  });

  it("should migrate legacy data from 'favorites' to 'product-favorites'", async () => {
    const legacyData = JSON.stringify([{ productId: "legacy-1", addedAt: "2023-01-01T00:00:00Z" }]);
    localStorage.setItem("favorites", legacyData);
    
    const store = useFavoritesStore.getState();
    await act(async () => {
      await store.migrateLegacyData();
    });

    const state = useFavoritesStore.getState();
    expect(state.favorites).toContainEqual(expect.objectContaining({ productId: "legacy-1" }));
    expect(localStorage.getItem("favorites")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(1);
  });

  it("should rollback on Supabase failure (Optimistic Update)", async () => {
    // Mock failure
    const mockFrom = vi.mocked(supabase.from);
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: "DB Error" } }),
    } as any);

    const store = useFavoritesStore.getState();
    
    // Initial state empty
    expect(store.favorites).toHaveLength(0);

    await act(async () => {
      await store.addFavorite("prod-fail");
    });

    // Should have rolled back
    const state = useFavoritesStore.getState();
    expect(state.favorites).toHaveLength(0);
    expect(state.error).toBe("Falha na sincronização com a nuvem");
  });

  it("should resolve conflicts using timestamps (Cloud wins if exists)", async () => {
    const cloudItem = { product_id: "p1", added_at: "2024-05-01T10:00:00Z", variant_info: {} };
    const localItem = { productId: "p1", addedAt: "2024-05-01T11:00:00Z" };

    localStorage.setItem(STORAGE_KEY, JSON.stringify([localItem]));
    useFavoritesStore.setState({ favorites: [localItem], favoriteCount: 1 });

    const mockFrom = vi.mocked(supabase.from);
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data: [cloudItem], error: null })),
    } as any);

    const store = useFavoritesStore.getState();
    await act(async () => {
      await store.syncWithCloud("user-123");
    });

    const state = useFavoritesStore.getState();
    // In our current implementation cloud is base, local extras are merged. 
    // If IDs match, cloud one is already in 'merged' and local loop skips it if logic was slightly different, 
    // currently merged = [...cloudItems] then localItems.forEach.
    expect(state.favorites[0].addedAt).toBe(cloudItem.added_at);
  });
});