import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  version?: number; // Para controle de concorrência se necessário
}

interface FavoritesState {
  favorites: FavoriteItem[];
  isLoaded: boolean;
  isSyncing: boolean;
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
  syncWithCloud: (userId?: string) => Promise<void>;
  migrateLegacyData: () => Promise<void>;
}

interface FavoritesStore extends FavoritesState, FavoritesActions {
  favoriteCount: number;
}

function loadFromStorage(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
    isSyncing: false,
    error: null,

    setError: (error: string | null) => set({ error }),

    migrateLegacyData: async () => {
      const legacyKey = "favorites"; // Nome anterior se houver
      const legacyData = localStorage.getItem(legacyKey);
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          if (Array.isArray(parsed)) {
            const current = get().favorites;
            const migrated = [...current];
            
            parsed.forEach((item: any) => {
              const id = typeof item === "string" ? item : item.productId;
              if (!migrated.some(f => f.productId === id)) {
                migrated.push({
                  productId: id,
                  addedAt: item.addedAt || new Date().toISOString(),
                  variant: item.variant
                });
              }
            });

            saveToStorage(migrated);
            set({ favorites: migrated, favoriteCount: migrated.length });
            localStorage.removeItem(legacyKey);
          }
        } catch (e) {
          console.error("Migration failed", e);
        }
      }
    },

    syncWithCloud: async (userId?: string) => {
      if (!userId) return;
      set({ isSyncing: true });
      try {
        const { data, error } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", userId)
          .eq("is_deleted", false);

        if (error) throw error;

        if (data) {
          const cloudItems: FavoriteItem[] = data.map(f => ({
            productId: f.product_id,
            addedAt: f.added_at,
            variant: f.variant_info as FavoriteVariantInfo
          }));

          // Merge local with cloud based on timestamp (SSOT)
          const localItems = get().favorites;
          const merged = [...cloudItems];
          
          localItems.forEach(local => {
            const existsInCloud = cloudItems.find(c => c.productId === local.productId);
            if (!existsInCloud) {
              merged.push(local);
              // Async push to cloud
              get().addFavorite(local.productId, local.variant);
            }
          });

          saveToStorage(merged);
          set({ favorites: merged, favoriteCount: merged.length });
        }
      } catch (err) {
        console.error("Sync failed", err);
      } finally {
        set({ isSyncing: false });
      }
    },

    addFavorite: async (productId: string, variant?: FavoriteVariantInfo) => {
      const previousFavorites = get().favorites;
      if (previousFavorites.some((f) => f.productId === productId)) return;
      
      const newItem = { productId, addedAt: new Date().toISOString(), variant };
      const next = [...previousFavorites, newItem];
      
      // Optimistic Update
      set({ favorites: next, favoriteCount: next.length, error: null });
      saveToStorage(next);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { error } = await supabase
            .from("favorites")
            .upsert({
              user_id: user.id,
              product_id: productId,
              variant_info: variant,
              added_at: newItem.addedAt,
              is_deleted: false
            }, { onConflict: "user_id, product_id" });

          if (error) throw error;
        } catch (err) {
          // Rollback
          set({ favorites: previousFavorites, favoriteCount: previousFavorites.length, error: "Falha na sincronização com a nuvem" });
          saveToStorage(previousFavorites);
          toast({
            title: "Erro de Sincronização",
            description: "Não foi possível salvar o favorito no servidor. A alteração foi revertida.",
            variant: "destructive"
          });
        }
      }
    },

    removeFavorite: async (productId: string) => {
      const previousFavorites = get().favorites;
      const next = previousFavorites.filter((f) => f.productId !== productId);
      
      // Optimistic Update
      set({ favorites: next, favoriteCount: next.length, error: null });
      saveToStorage(next);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { error } = await supabase
            .from("favorites")
            .update({ is_deleted: true })
            .eq("user_id", user.id)
            .eq("product_id", productId);

          if (error) throw error;
        } catch (err) {
          // Rollback
          set({ favorites: previousFavorites, favoriteCount: previousFavorites.length, error: "Falha ao remover favorito na nuvem" });
          saveToStorage(previousFavorites);
          toast({
            title: "Erro ao Remover",
            description: "Falha ao sincronizar remoção. Tente novamente.",
            variant: "destructive"
          });
        }
      }
    },

    toggleFavorite: async (productId: string, variant?: FavoriteVariantInfo) => {
      const { favorites } = get();
      const exists = favorites.some((f) => f.productId === productId);
      if (exists) {
        await get().removeFavorite(productId);
      } else {
        await get().addFavorite(productId, variant);
      }
    },

    isFavorite: (productId: string) =>
      get().favorites.some((f) => f.productId === productId),

    getFavoriteVariant: (productId: string) =>
      get().favorites.find((f) => f.productId === productId)?.variant,

    clearFavorites: async () => {
      const previousFavorites = get().favorites;
      set({ favorites: [], favoriteCount: 0, error: null });
      saveToStorage([]);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { error } = await supabase
            .from("favorites")
            .update({ is_deleted: true })
            .eq("user_id", user.id);

          if (error) throw error;
        } catch (err) {
          set({ favorites: previousFavorites, favoriteCount: previousFavorites.length });
          saveToStorage(previousFavorites);
          toast({
            title: "Erro",
            description: "Falha ao limpar favoritos no servidor.",
            variant: "destructive"
          });
        }
      }
    },
  };
});
