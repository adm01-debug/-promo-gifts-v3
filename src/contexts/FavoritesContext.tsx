import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { useFavorites, FavoriteItem } from "@/hooks/useFavorites";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product } from "@/hooks/useProducts";

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoriteCount: number;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  getFavoriteProducts: () => Product[];
  clearFavorites: () => void;
  isLoaded: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favoritesHook = useFavorites();
  const { getProductsByIds } = useProductsContext();

  const getFavoriteProducts = useCallback(
    (): Product[] => getProductsByIds(favoritesHook.favorites.map((f) => f.productId)),
    [getProductsByIds, favoritesHook.favorites]
  );

  return (
    <FavoritesContext.Provider value={{ ...favoritesHook, getFavoriteProducts }}>
      {children}
    </FavoritesContext.Provider>
  );
}

const fallbackContext: FavoritesContextType = {
  favorites: [],
  favoriteCount: 0,
  addFavorite: () => {},
  removeFavorite: () => {},
  toggleFavorite: () => {},
  isFavorite: () => false,
  getFavoriteProducts: () => [],
  clearFavorites: () => {},
  isLoaded: false,
};

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    console.warn("useFavoritesContext called outside FavoritesProvider – using fallback");
    return fallbackContext;
  }
  return context;
}
