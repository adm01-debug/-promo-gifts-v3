import { create } from "zustand";

const STORAGE_KEY = "product-favorites";

export interface FavoriteVariantInfo {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
}

export interface FavoriteItem {
  productId: string;
  addedAt: string;
  variant?: FavoriteVariantInfo;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  isLoaded: boolean;
  error: string | null;
}

interface FavoritesActions {
  addFavorite: (productId: string, variant?: FavoriteVariantInfo) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  toggleFavorite: (productId: string, variant?: FavoriteVariantInfo) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => Promise<void>;
  getFavoriteVariant: (productId: string) => FavoriteVariantInfo | undefined;
  setError: (error: string | null) => void;
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

  // Listen for storage changes to sync across tabs
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        const next = loadFromStorage();
        set({ favorites: next, favoriteCount: next.length });
      }
    });
  }

  return {
    favorites: initial,
    favoriteCount: initial.length,
    isLoaded: true,
    error: null,

    setError: (error: string | null) => set({ error }),

    addFavorite: async (productId: string, variant?: FavoriteVariantInfo) => {
      const { favorites } = get();
      if (favorites.some((f) => f.productId === productId)) return;
      const next = [...favorites, { productId, addedAt: new Date().toISOString(), variant }];
      
      try {
        saveToStorage(next);
        set({ favorites: next, favoriteCount: next.length, error: null });
      } catch (err) {
        set({ error: "Erro ao salvar favorito localmente" });
        throw err;
      }
    },

    removeFavorite: async (productId: string) => {
      const next = get().favorites.filter((f) => f.productId !== productId);
      try {
        saveToStorage(next);
        set({ favorites: next, favoriteCount: next.length, error: null });
      } catch (err) {
        set({ error: "Erro ao remover favorito" });
        throw err;
      }
    },

    toggleFavorite: async (productId: string, variant?: FavoriteVariantInfo) => {
      const { favorites } = get();
      const exists = favorites.some((f) => f.productId === productId);
      const next = exists
        ? favorites.filter((f) => f.productId !== productId)
        : [...favorites, { productId, addedAt: new Date().toISOString(), variant }];
      
      try {
        saveToStorage(next);
        set({ favorites: next, favoriteCount: next.length, error: null });
      } catch (err) {
        set({ error: "Erro ao atualizar favoritos" });
        throw err;
      }
    },

    isFavorite: (productId: string) =>
      get().favorites.some((f) => f.productId === productId),

    getFavoriteVariant: (productId: string) =>
      get().favorites.find((f) => f.productId === productId)?.variant,

    clearFavorites: async () => {
      try {
        saveToStorage([]);
        set({ favorites: [], favoriteCount: 0, error: null });
      } catch (err) {
        set({ error: "Erro ao limpar favoritos" });
        throw err;
      }
    },
  };
});
