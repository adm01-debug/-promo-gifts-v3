import { create } from "zustand";

const STORAGE_KEY = "product-comparison";
const MAX_COMPARE_ITEMS = 4;

interface ComparisonState {
  compareIds: string[];
  isLoaded: boolean;
}

interface ComparisonActions {
  addToCompare: (productId: string) => boolean;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (productId: string) => { added: boolean; isFull: boolean };
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
}

interface ComparisonStore extends ComparisonState, ComparisonActions {
  compareCount: number;
  maxItems: number;
  canAddMore: boolean;
}

function loadFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // silently fail
  }
}

export const useComparisonStore = create<ComparisonStore>((set, get) => {
  const initial = loadFromStorage();
  return {
    compareIds: initial,
    isLoaded: true,
    compareCount: initial.length,
    maxItems: MAX_COMPARE_ITEMS,
    canAddMore: initial.length < MAX_COMPARE_ITEMS,

    addToCompare: (productId: string) => {
      const { compareIds } = get();
      if (compareIds.includes(productId) || compareIds.length >= MAX_COMPARE_ITEMS) {
        return false;
      }
      const next = [...compareIds, productId];
      saveToStorage(next);
      set({
        compareIds: next,
        compareCount: next.length,
        canAddMore: next.length < MAX_COMPARE_ITEMS,
      });
      return true;
    },

    removeFromCompare: (productId: string) => {
      const next = get().compareIds.filter((id) => id !== productId);
      saveToStorage(next);
      set({
        compareIds: next,
        compareCount: next.length,
        canAddMore: next.length < MAX_COMPARE_ITEMS,
      });
    },

    toggleCompare: (productId: string) => {
      const { compareIds } = get();
      if (compareIds.includes(productId)) {
        const next = compareIds.filter((id) => id !== productId);
        saveToStorage(next);
        set({
          compareIds: next,
          compareCount: next.length,
          canAddMore: next.length < MAX_COMPARE_ITEMS,
        });
        return { added: false, isFull: false };
      }
      if (compareIds.length >= MAX_COMPARE_ITEMS) {
        return { added: false, isFull: true };
      }
      const next = [...compareIds, productId];
      saveToStorage(next);
      set({
        compareIds: next,
        compareCount: next.length,
        canAddMore: next.length < MAX_COMPARE_ITEMS,
      });
      return { added: true, isFull: false };
    },

    isInCompare: (productId: string) => get().compareIds.includes(productId),

    clearCompare: () => {
      saveToStorage([]);
      set({
        compareIds: [],
        compareCount: 0,
        canAddMore: true,
      });
    },
  };
});
