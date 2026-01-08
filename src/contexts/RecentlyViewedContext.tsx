import React, { createContext, useContext, ReactNode } from "react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Product } from "@/data/mockData";

interface RecentlyViewedContextType {
  items: { productId: string; viewedAt: string }[];
  itemCount: number;
  addToRecentlyViewed: (productId: string) => void;
  removeFromRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
  getRecentlyViewedProducts: () => Product[];
  isLoaded: boolean;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const recentlyViewedHook = useRecentlyViewed();

  return (
    <RecentlyViewedContext.Provider value={recentlyViewedHook}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewedContext() {
  const context = useContext(RecentlyViewedContext);
  if (context === undefined) {
    throw new Error("useRecentlyViewedContext must be used within a RecentlyViewedProvider");
  }
  return context;
}
