import { renderHook, act } from "@testing-library/react";
import { useFavoritesStore } from "./useFavoritesStore";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("useFavoritesStore Sync & Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    const store = useFavoritesStore.getState();
    act(() => {
      store.clearFavorites();
    });
  });

  it("should sync state across tabs using storage event", () => {
    const { result } = renderHook(() => useFavoritesStore());
    
    // Simulate another tab adding a favorite
    const newItem = { productId: "p1", addedAt: new Date().toISOString() };
    localStorage.setItem("product-favorites", JSON.stringify([newItem]));
    
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: "product-favorites",
        newValue: JSON.stringify([newItem])
      }));
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].productId).toBe("p1");
  });

  it("should handle persistence errors", async () => {
    const store = useFavoritesStore.getState();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });

    await act(async () => {
      try {
        await store.addFavorite("p2");
      } catch (e) {
        // Expected
      }
    });

    expect(useFavoritesStore.getState().error).toBe("Erro ao salvar favorito localmente");
    setItemSpy.mockRestore();
  });
});
