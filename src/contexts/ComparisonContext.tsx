/**
 * @deprecated Use `useComparisonStore` from `@/stores/useComparisonStore` directly.
 * This file is kept for backward compatibility.
 */
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product } from "@/hooks/useProducts";
import { useCallback } from "react";

export function useComparisonContext() {
  const store = useComparisonStore();
  const { getProductsByIds } = useProductsContext();

  const getCompareProducts = useCallback(
    (): Product[] => getProductsByIds(store.compareIds),
    [getProductsByIds, store.compareIds]
  );

  return { ...store, getCompareProducts };
}

// No-op provider for backward compat — Zustand doesn't need providers
export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import React from "react";
