/**
 * @deprecated Use `useFavoritesStore` from `@/stores/useFavoritesStore` directly.
 * This file is kept for backward compatibility.
 */
import React from "react";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product } from "@/hooks/useProducts";
import { useCallback } from "react";

export type { FavoriteItem } from "@/stores/useFavoritesStore";

export function useFavoritesContext() {
  const store = useFavoritesStore();
  const { getProductsByIds } = useProductsContext();

  const getFavoriteProducts = useCallback(
    (): Product[] => getProductsByIds(store.favorites.map((f) => f.productId)),
    [getProductsByIds, store.favorites]
  );

  return { ...store, getFavoriteProducts };
}

// No-op provider for backward compat — Zustand doesn't need providers
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
