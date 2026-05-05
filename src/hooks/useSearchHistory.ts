import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type HistoryType = "product" | "company" | "general";

export interface HistoryItem {
  id: string;
  label: string;
  type: HistoryType;
  timestamp: number;
  isPinned?: boolean;
  resultCount?: number;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = "global-search-history-v2";
const MAX_HISTORY = 10;

export function useSearchHistory(type?: HistoryType) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Load from localStorage first for immediate UI
      const stored = localStorage.getItem(STORAGE_KEY);
      let items: HistoryItem[] = stored ? JSON.parse(stored) : [];

      // 2. Try to sync with Supabase if logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: remoteItems, error } = await supabase
          .from("user_search_history")
          .select("*")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });

        if (!error && remoteItems) {
          items = remoteItems.map(item => ({
            id: item.id,
            label: item.query_text,
            type: item.history_type as HistoryType,
            timestamp: new Date(item.created_at).getTime(),
            isPinned: item.is_pinned,
            resultCount: item.result_count,
            metadata: item.metadata as Record<string, any>
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
      }

      const filtered = type ? items.filter(item => item.type === type) : items;
      setHistory(filtered.slice(0, MAX_HISTORY));
    } catch (e) {
      console.error("Failed to load search history", e);
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadHistory();
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = type ? parsed.filter((item: any) => item.type === type) : parsed;
          setHistory(filtered.slice(0, MAX_HISTORY));
        }
      }
    };
    
    const handleCustomUpdate = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = type ? parsed.filter((item: any) => item.type === type) : parsed;
        setHistory(filtered.slice(0, MAX_HISTORY));
      }
    };
    
    window.addEventListener("storage", handleStorage);
    window.addEventListener("search-history-update", handleCustomUpdate);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("search-history-update", handleCustomUpdate);
    };
  }, [loadHistory, type]);

  const addToHistory = useCallback(async (item: Omit<HistoryItem, "timestamp">) => {
    try {
      const newItem: HistoryItem = { ...item, timestamp: Date.now() };
      
      const stored = localStorage.getItem(STORAGE_KEY);
      let allItems: HistoryItem[] = stored ? JSON.parse(stored) : [];
      
      // Remove duplicates
      const filtered = allItems.filter(i => 
        !(i.id === newItem.id && i.type === newItem.type) && 
        !(i.label.toLowerCase() === newItem.label.toLowerCase() && i.type === newItem.type)
      );
      
      const updated = [newItem, ...filtered].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("user_search_history").upsert({
          user_id: session.user.id,
          query_text: newItem.label,
          history_type: newItem.type,
          result_count: newItem.resultCount || 0,
          is_pinned: newItem.isPinned || false,
          metadata: newItem.metadata || {}
        }, {
          onConflict: 'user_id,query_text,history_type'
        });
      }
      
      window.dispatchEvent(new Event("search-history-update"));
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  }, []);

  const togglePin = useCallback(async (id: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      
      const allItems: HistoryItem[] = JSON.parse(stored);
      const item = allItems.find(i => i.id === id);
      if (!item) return;

      const newPinned = !item.isPinned;
      const updated = allItems.map(i => i.id === id ? { ...i, isPinned: newPinned } : i);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("user_search_history")
          .update({ is_pinned: newPinned })
          .eq("id", id)
          .eq("user_id", session.user.id);
      }
      
      window.dispatchEvent(new Event("search-history-update"));
      toast.success(newPinned ? "Busca fixada" : "Busca desfixada");
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      
      const allItems: HistoryItem[] = JSON.parse(stored);
      const updated = allItems.filter(i => i.id !== id);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("user_search_history")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id);
      }
      
      window.dispatchEvent(new Event("search-history-update"));
    } catch (e) {
      console.error("Failed to remove search history", e);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      if (type) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const allItems: HistoryItem[] = JSON.parse(stored);
        const updated = allItems.filter(i => i.type !== type);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const query = supabase
          .from("user_search_history")
          .delete()
          .eq("user_id", session.user.id);
        
        if (type) {
          query.eq("history_type", type);
        }
        
        await query;
      }

      window.dispatchEvent(new Event("search-history-update"));
      toast.success("Histórico limpo");
    } catch (e) {
      console.error("Failed to clear search history", e);
    }
  }, [type]);

  return {
    history,
    isLoading,
    addToHistory,
    togglePin,
    removeFromHistory,
    clearHistory,
    refreshHistory: loadHistory
  };
}
