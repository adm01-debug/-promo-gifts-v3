import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "recently-viewed-products";
const MAX_LOCAL_ITEMS = 100; // Aumentado para 100 para ser ferramenta de navegação completa

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: string;
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  isLoaded: boolean;
  isLoading: boolean;
}

interface RecentlyViewedActions {
  addToRecentlyViewed: (productId: string, userId?: string) => Promise<void>;
  removeFromRecentlyViewed: (productId: string, userId?: string) => Promise<void>;
  clearRecentlyViewed: (userId?: string) => Promise<void>;
  syncWithCloud: (userId: string) => Promise<void>;
}

interface RecentlyViewedStore extends RecentlyViewedState, RecentlyViewedActions {
  itemCount: number;
}

function loadFromStorage(): RecentlyViewedItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: RecentlyViewedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // silently fail
  }
}

let lastAddedId: string | null = null;
let lastAddedTimer: ReturnType<typeof setTimeout> | null = null;

export const useRecentlyViewedStore = create<RecentlyViewedStore>((set, get) => {
  const initial = loadFromStorage();
  
  return {
    items: initial,
    itemCount: initial.length,
    isLoaded: true,
    isLoading: false,

    addToRecentlyViewed: async (productId: string, userId?: string) => {
      if (lastAddedId === productId) return;
      lastAddedId = productId;
      if (lastAddedTimer) clearTimeout(lastAddedTimer);
      lastAddedTimer = setTimeout(() => {
        lastAddedId = null;
      }, 1000);

      const { items } = get();
      const viewedAt = new Date().toISOString();
      const filtered = items.filter((item) => item.productId !== productId);
      const next = [
        { productId, viewedAt },
        ...filtered,
      ].slice(0, MAX_LOCAL_ITEMS);
      
      saveToStorage(next);
      set({ items: next, itemCount: next.length });

      if (userId) {
        try {
          await supabase.from("recently_viewed_products").upsert({
            user_id: userId,
            product_id: productId,
            viewed_at: viewedAt
          }, { onConflict: "user_id, product_id" });
        } catch (error) {
          console.error("Erro ao sincronizar produto visto no cloud:", error);
        }
      }
    },

    removeFromRecentlyViewed: async (productId: string, userId?: string) => {
      const next = get().items.filter((item) => item.productId !== productId);
      saveToStorage(next);
      set({ items: next, itemCount: next.length });

      if (userId) {
        try {
          await supabase
            .from("recently_viewed_products")
            .delete()
            .eq("user_id", userId)
            .eq("product_id", productId);
        } catch (error) {
          console.error("Erro ao remover produto do cloud:", error);
        }
      }
    },

    clearRecentlyViewed: async (userId?: string) => {
      saveToStorage([]);
      set({ items: [], itemCount: 0 });

      if (userId) {
        try {
          await supabase
            .from("recently_viewed_products")
            .delete()
            .eq("user_id", userId);
        } catch (error) {
          console.error("Erro ao limpar histórico no cloud:", error);
        }
      }
    },

    syncWithCloud: async (userId: string) => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from("recently_viewed_products")
          .select("product_id, viewed_at")
          .eq("user_id", userId)
          .order("viewed_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        if (data) {
          const cloudItems: RecentlyViewedItem[] = data.map(d => ({
            productId: d.product_id,
            viewedAt: d.viewed_at
          }));
          
          // Merge local with cloud, favoring cloud if duplicate
          const localItems = loadFromStorage();
          const merged = [...cloudItems];
          
          localItems.forEach(local => {
            if (!merged.find(m => m.productId === local.productId)) {
              merged.push(local);
            }
          });

          const final = merged
            .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
            .slice(0, 50);

          saveToStorage(final);
          set({ items: final, itemCount: final.length });
        }
      } catch (error) {
        console.error("Erro ao sincronizar com Lovable Cloud:", error);
      } finally {
        set({ isLoading: false });
      }
    }
  };
});
