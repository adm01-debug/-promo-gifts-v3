import { useState, useEffect, useCallback } from "react";

interface RecentItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UseRecentItemsOptions {
  storageKey: string;
  maxItems?: number;
}

export function useRecentItems({
  storageKey,
  maxItems = 10,
}: UseRecentItemsOptions) {
  const [items, setItems] = useState<RecentItem[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RecentItem[];
        setItems(parsed);
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  // Save to localStorage
  const saveItems = useCallback(
    (newItems: RecentItem[]) => {
      localStorage.setItem(storageKey, JSON.stringify(newItems));
      setItems(newItems);
    },
    [storageKey]
  );

  const addItem = useCallback(
    (item: Omit<RecentItem, "timestamp">) => {
      setItems((current) => {
        // Remove existing item with same id
        const filtered = current.filter((i) => i.id !== item.id);
        // Add new item at the beginning
        const newItems = [
          { ...item, timestamp: Date.now() },
          ...filtered,
        ].slice(0, maxItems);
        
        saveItems(newItems);
        return newItems;
      });
    },
    [maxItems, saveItems]
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((current) => {
        const newItems = current.filter((i) => i.id !== id);
        saveItems(newItems);
        return newItems;
      });
    },
    [saveItems]
  );

  const clearItems = useCallback(() => {
    localStorage.removeItem(storageKey);
    setItems([]);
  }, [storageKey]);

  const getItemsByType = useCallback(
    (type: string) => {
      return items.filter((i) => i.type === type);
    },
    [items]
  );

  return {
    items,
    addItem,
    removeItem,
    clearItems,
    getItemsByType,
  };
}

// Hook for recently viewed products
export function useRecentProducts() {
  return useRecentItems({
    storageKey: "recent-products",
    maxItems: 20,
  });
}

// Hook for recently viewed clients
export function useRecentClients() {
  return useRecentItems({
    storageKey: "recent-clients",
    maxItems: 15,
  });
}

// Hook for recent searches
export function useRecentSearches() {
  const { items, addItem, removeItem, clearItems } = useRecentItems({
    storageKey: "recent-searches",
    maxItems: 10,
  });

  const addSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        addItem({
          id: query.toLowerCase(),
          type: "search",
          title: query,
        });
      }
    },
    [addItem]
  );

  return {
    searches: items.map((i) => i.title),
    addSearch,
    removeSearch: removeItem,
    clearSearches: clearItems,
  };
}

// Hook for saved filters
export function useSavedFilters<T extends Record<string, any>>(filterKey: string) {
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: T }>>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`saved-filters-${filterKey}`);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch {
        localStorage.removeItem(`saved-filters-${filterKey}`);
      }
    }
  }, [filterKey]);

  const saveFilter = useCallback(
    (name: string, filters: T) => {
      const newFilters = [
        { name, filters },
        ...savedFilters.filter((f) => f.name !== name),
      ].slice(0, 10);
      
      localStorage.setItem(`saved-filters-${filterKey}`, JSON.stringify(newFilters));
      setSavedFilters(newFilters);
    },
    [filterKey, savedFilters]
  );

  const deleteFilter = useCallback(
    (name: string) => {
      const newFilters = savedFilters.filter((f) => f.name !== name);
      localStorage.setItem(`saved-filters-${filterKey}`, JSON.stringify(newFilters));
      setSavedFilters(newFilters);
    },
    [filterKey, savedFilters]
  );

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
  };
}
