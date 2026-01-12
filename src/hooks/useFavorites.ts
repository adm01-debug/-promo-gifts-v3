import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/hooks/useProducts";
import { PRODUCTS } from "@/data/mockData";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";

const STORAGE_KEY = "product-favorites";

export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

interface UseFavoritesOptions {
  onFavoriteAdded?: () => void;
}

export function useFavorites(options?: UseFavoritesOptions) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const onFavoriteAddedRef = useRef(options?.onFavoriteAdded);
  const { trackProductView } = useProductAnalytics();
  const trackProductViewRef = useRef(trackProductView);

  // Keep refs updated
  useEffect(() => {
    onFavoriteAddedRef.current = options?.onFavoriteAdded;
    trackProductViewRef.current = trackProductView;
  }, [options?.onFavoriteAdded, trackProductView]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading favorites:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites, isLoaded]);

  const addFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.productId === productId)) {
        return prev;
      }
      // Call the callback
      onFavoriteAddedRef.current?.();
      // Track analytics
      const product = PRODUCTS.find((p) => p.id === productId);
      if (product) {
        trackProductViewRef.current({
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          viewType: "favorite",
        });
      }
      return [
        ...prev,
        {
          productId,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setFavorites((prev) => prev.filter((f) => f.productId !== productId));
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.productId === productId);
      if (exists) {
        return prev.filter((f) => f.productId !== productId);
      }
      // Call the callback when adding
      onFavoriteAddedRef.current?.();
      // Track analytics when adding
      const product = PRODUCTS.find((p) => p.id === productId);
      if (product) {
        trackProductViewRef.current({
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          viewType: "favorite",
        });
      }
      return [
        ...prev,
        {
          productId,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const isFavorite = useCallback(
    (productId: string) => {
      return favorites.some((f) => f.productId === productId);
    },
    [favorites]
  );

  const getFavoriteProducts = useCallback((): Product[] => {
    return favorites
      .map((f) => PRODUCTS.find((p) => p.id === f.productId))
      .filter((p): p is Product => p !== undefined);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    favoriteCount: favorites.length,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getFavoriteProducts,
    clearFavorites,
    isLoaded,
  };
}
