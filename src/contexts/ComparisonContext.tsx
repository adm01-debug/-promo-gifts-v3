import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { useComparison } from "@/hooks/useComparison";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product } from "@/hooks/useProducts";

interface ComparisonContextType {
  compareIds: string[];
  compareCount: number;
  maxItems: number;
  addToCompare: (productId: string) => boolean;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (productId: string) => { added: boolean; isFull: boolean };
  isInCompare: (productId: string) => boolean;
  getCompareProducts: () => Product[];
  clearCompare: () => void;
  canAddMore: boolean;
  isLoaded: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const comparisonHook = useComparison();
  const { getProductsByIds } = useProductsContext();

  const getCompareProducts = useCallback(
    (): Product[] => getProductsByIds(comparisonHook.compareIds),
    [getProductsByIds, comparisonHook.compareIds]
  );

  return (
    <ComparisonContext.Provider value={{ ...comparisonHook, getCompareProducts }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparisonContext() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error("useComparisonContext must be used within a ComparisonProvider");
  }
  return context;
}
