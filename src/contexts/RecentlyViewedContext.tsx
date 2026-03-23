/**
 * @deprecated Use `useRecentlyViewedStore` from `@/stores/useRecentlyViewedStore` directly.
 * This file is kept for backward compatibility.
 */
import React from "react";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product } from "@/hooks/useProducts";
import { useCallback } from "react";

export type { RecentlyViewedItem } from "@/stores/useRecentlyViewedStore";

export function useRecentlyViewedContext() {
  const store = useRecentlyViewedStore();
  const { getProductsByIds } = useProductsContext();

  const getRecentlyViewedProducts = useCallback(
    (): Product[] => getProductsByIds(store.items.map((i) => i.productId)),
    [getProductsByIds, store.items]
  );

  return { ...store, getRecentlyViewedProducts };
}

// No-op provider for backward compat — Zustand doesn't need providers
export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
