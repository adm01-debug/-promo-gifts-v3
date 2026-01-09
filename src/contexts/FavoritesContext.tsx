import React, { createContext, useContext, ReactNode } from "react";
import { useFavorites, FavoriteItem } from "@/hooks/useFavorites";
import { Product } from "@/data/mockData";

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

  return (
    <FavoritesContext.Provider value={favoritesHook}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavoritesContext must be used within a FavoritesProvider");
  }
  return context;
}
