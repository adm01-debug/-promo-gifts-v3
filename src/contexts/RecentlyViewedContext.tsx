import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { useRecentlyViewed, RecentlyViewedItem } from "@/hooks/useRecentlyViewed";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product } from "@/hooks/useProducts";

interface RecentlyViewedContextType {
  items: RecentlyViewedItem[];
  itemCount: number;
  addToRecentlyViewed: (productId: string) => void;
  removeFromRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
  getRecentlyViewedProducts: () => Product[];
  isLoaded: boolean;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(
  undefined
);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const recentlyViewedHook = useRecentlyViewed();
  const { getProductsByIds } = useProductsContext();

  const getRecentlyViewedProducts = useCallback(
    (): Product[] =>
      getProductsByIds(recentlyViewedHook.items.map((i) => i.productId)),
    [getProductsByIds, recentlyViewedHook.items]
  );

  return (
    <RecentlyViewedContext.Provider
      value={{ ...recentlyViewedHook, getRecentlyViewedProducts }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewedContext() {
  const context = useContext(RecentlyViewedContext);
  if (context === undefined) {
    throw new Error(
      "useRecentlyViewedContext must be used within a RecentlyViewedProvider"
    );
  }
  return context;
}
