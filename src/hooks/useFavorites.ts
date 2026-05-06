import { useState, useEffect, useCallback, useRef } from 'react';
import { type Product } from '@/hooks/useProducts';
import { useProductAnalytics } from '@/hooks/useProductAnalytics';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'product-favorites';

export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

import { useFavoritesStore } from '@/stores/useFavoritesStore';

export function useFavorites() {
  const { toast } = useToast();
  const {
    favorites,
    isLoaded,
    error,
    addFavorite: storeAdd,
    removeFavorite: storeRemove,
    toggleFavorite: storeToggle,
    clearFavorites: storeClear,
    favoriteCount,
    setError,
  } = useFavoritesStore();

  const trackProductView = useProductAnalytics().trackProductView;

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro nos Favoritos',
        description: error,
        variant: 'destructive',
      });
      setError(null);
    }
  }, [error, toast, setError]);

  const addFavorite = useCallback(
    async (productId: string) => {
      try {
        await storeAdd(productId);
        trackProductView({
          productId,
          productSku: productId,
          productName: productId,
          viewType: 'favorite',
        });
      } catch (err) {
        console.error('Failed to add favorite:', err);
      }
    },
    [storeAdd, trackProductView],
  );

  const removeFavorite = useCallback(
    async (productId: string) => {
      try {
        await storeRemove(productId);
      } catch (err) {
        console.error('Failed to remove favorite:', err);
      }
    },
    [storeRemove],
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      const exists = favorites.some((f) => f.productId === productId);
      try {
        await storeToggle(productId);
        if (!exists) {
          trackProductView({
            productId,
            productSku: productId,
            productName: productId,
            viewType: 'favorite',
          });
        }
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
      }
    },
    [favorites, storeToggle, trackProductView],
  );

  const isFavorite = useCallback(
    (productId: string) => favorites.some((f) => f.productId === productId),
    [favorites],
  );

  const getFavoriteProductsFromMap = useCallback(
    (getProductsByIds: (ids: string[]) => Product[]): Product[] =>
      getProductsByIds(favorites.map((f) => f.productId)),
    [favorites],
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
