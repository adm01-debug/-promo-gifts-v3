import { useState, useEffect, useCallback } from "react";

export type HistoryType = "product" | "company" | "general";

export interface HistoryItem {
  id: string;
  label: string;
  type: HistoryType;
  timestamp: number;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = "global-search-history-v2";
const MAX_HISTORY = 10;

export function useSearchHistory(type?: HistoryType) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: HistoryItem[] = JSON.parse(stored);
        if (type) {
          setHistory(parsed.filter(item => item.type === type));
        } else {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load search history", e);
    }
  }, [type]);

  useEffect(() => {
    loadHistory();
    
    // Listen for storage changes from other tabs/components
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) loadHistory();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadHistory]);

  const addToHistory = useCallback((item: Omit<HistoryItem, "timestamp">) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let allItems: HistoryItem[] = stored ? JSON.parse(stored) : [];
      
      const newItem: HistoryItem = { ...item, timestamp: Date.now() };
      
      // Remove existing item with same ID/Label to avoid duplicates
      const filtered = allItems.filter(i => 
        !(i.id === newItem.id && i.type === newItem.type) && 
        !(i.label.toLowerCase() === newItem.label.toLowerCase() && i.type === newItem.type)
      );
      
      const updated = [newItem, ...filtered].slice(0, 50); // Keep 50 total across all types
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      if (!type || newItem.type === type) {
        setHistory(updated.filter(i => !type || i.type === type).slice(0, MAX_HISTORY));
      }
      
      // Dispatch event for same-tab updates
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  }, [type]);

  const removeFromHistory = useCallback((id: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      
      const allItems: HistoryItem[] = JSON.parse(stored);
      const updated = allItems.filter(i => i.id !== id);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setHistory(prev => prev.filter(i => i.id !== id));
      
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to remove search history", e);
    }
  }, []);

  const clearHistory = useCallback(() => {
    try {
      if (type) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const allItems: HistoryItem[] = JSON.parse(stored);
        const updated = allItems.filter(i => i.type !== type);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setHistory([]);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setHistory([]);
      }
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to clear search history", e);
    }
  }, [type]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    refreshHistory: loadHistory
  };
}
