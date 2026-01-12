import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/hooks/useProducts";
import { PRODUCTS } from "@/data/mockData";

const STORAGE_KEY = "recently-viewed-products";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: string;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastAddedRef = useRef<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading recently viewed:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addToRecentlyViewed = useCallback((productId: string) => {
    // Prevent duplicate additions in quick succession
    if (lastAddedRef.current === productId) return;
    lastAddedRef.current = productId;
    
    // Reset after a short delay
    setTimeout(() => {
      if (lastAddedRef.current === productId) {
        lastAddedRef.current = null;
      }
    }, 1000);

    setItems((prev) => {
      // Remove if already exists
      const filtered = prev.filter((item) => item.productId !== productId);
      
      // Add to the beginning
      const newItems = [
        { productId, viewedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_ITEMS);

      return newItems;
    });
  }, []);

  const removeFromRecentlyViewed = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setItems([]);
  }, []);

  const getRecentlyViewedProducts = useCallback((): Product[] => {
    return items
      .map((item) => PRODUCTS.find((p) => p.id === item.productId))
      .filter((p): p is Product => p !== undefined);
  }, [items]);

  return {
    items,
    itemCount: items.length,
    addToRecentlyViewed,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    getRecentlyViewedProducts,
    isLoaded,
  };
}
