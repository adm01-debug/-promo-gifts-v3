import { create } from "zustand";

const STORAGE_KEY = "product-favorites";

export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  isLoaded: boolean;
}

interface FavoritesActions {
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

interface FavoritesStore extends FavoritesState, FavoritesActions {
  favoriteCount: number;
}

function loadFromStorage(): FavoriteItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: FavoriteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // silently fail
  }
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => {
  const initial = loadFromStorage();
  return {
    favorites: initial,
    favoriteCount: initial.length,
    isLoaded: true,

    addFavorite: (productId: string) => {
      const { favorites } = get();
      if (favorites.some((f) => f.productId === productId)) return;
      const next = [...favorites, { productId, addedAt: new Date().toISOString() }];
      saveToStorage(next);
      set({ favorites: next, favoriteCount: next.length });
    },

    removeFavorite: (productId: string) => {
      const next = get().favorites.filter((f) => f.productId !== productId);
      saveToStorage(next);
      set({ favorites: next, favoriteCount: next.length });
    },

    toggleFavorite: (productId: string) => {
      const { favorites } = get();
      const exists = favorites.some((f) => f.productId === productId);
      const next = exists
        ? favorites.filter((f) => f.productId !== productId)
        : [...favorites, { productId, addedAt: new Date().toISOString() }];
      saveToStorage(next);
      set({ favorites: next, favoriteCount: next.length });
    },

    isFavorite: (productId: string) =>
      get().favorites.some((f) => f.productId === productId),

    clearFavorites: () => {
      saveToStorage([]);
      set({ favorites: [], favoriteCount: 0 });
    },
  };
});
