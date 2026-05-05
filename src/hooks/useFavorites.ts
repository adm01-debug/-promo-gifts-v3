import { useState, useEffect, useCallback, useRef } from "react";
import { type Product } from "@/hooks/useProducts";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";

const STORAGE_KEY = "product-favorites";

export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

import { useFavoritesStore } from "@/stores/useFavoritesStore";

export function useFavorites(options?: UseFavoritesOptions) {
  const {
    favorites,
    isLoaded,
    addFavorite: storeAdd,
    removeFavorite: storeRemove,
    toggleFavorite: storeToggle,
    clearFavorites: storeClear,
    favoriteCount
  } = useFavoritesStore();

  const addFavorite = useCallback((productId: string) => {
    storeAdd(productId);
    onFavoriteAddedRef.current?.();
    trackProductViewRef.current({
      productId,
      productSku: productId,
      productName: productId,
      viewType: "favorite",
    });
  }, [storeAdd]);

  const removeFavorite = useCallback((productId: string) => {
    storeRemove(productId);
  }, [storeRemove]);

  const toggleFavorite = useCallback((productId: string) => {
    const exists = favorites.some((f) => f.productId === productId);
    storeToggle(productId);
    if (!exists) {
      onFavoriteAddedRef.current?.();
      trackProductViewRef.current({
        productId,
        productSku: productId,
        productName: productId,
        viewType: "favorite",
      });
    }
  }, [favorites, storeToggle]);

  const isFavorite = useCallback(
    (productId: string) => favorites.some((f) => f.productId === productId),
    [favorites]
  );

  const getFavoriteProductsFromMap = useCallback(
    (getProductsByIds: (ids: string[]) => Product[]): Product[] =>
      getProductsByIds(favorites.map((f) => f.productId)),
    [favorites]
  );

  return {
    favorites,
    favoriteCount,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getFavoriteProductsFromMap,
    clearFavorites: storeClear,
    isLoaded,
  };
}
