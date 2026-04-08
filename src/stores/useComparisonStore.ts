import { create } from "zustand";

const STORAGE_KEY = "product-comparison";
const MAX_COMPARE_ITEMS = 4;

export interface CompareVariantInfo {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
}

export interface CompareItem {
  productId: string;
  variant?: CompareVariantInfo;
}

interface ComparisonState {
  compareIds: string[];
  compareItems: CompareItem[];
  isLoaded: boolean;
}

interface ComparisonActions {
  addToCompare: (productId: string, variant?: CompareVariantInfo) => boolean;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (productId: string, variant?: CompareVariantInfo) => { added: boolean; isFull: boolean };
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  getCompareVariant: (productId: string) => CompareVariantInfo | undefined;
}

interface ComparisonStore extends ComparisonState, ComparisonActions {
  compareCount: number;
  maxItems: number;
  canAddMore: boolean;
}

function loadFromStorage(): CompareItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Migrate old format (string[]) to new format (CompareItem[])
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      return parsed.map((id: string) => ({ productId: id }));
    }
    return parsed;
  } catch {
    return [];
  }
}

function saveToStorage(items: CompareItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // silently fail
  }
}

export const useComparisonStore = create<ComparisonStore>((set, get) => {
  const initial = loadFromStorage();
  const initialIds = initial.map(i => i.productId);
  return {
    compareIds: initialIds,
    compareItems: initial,
    isLoaded: true,
    compareCount: initial.length,
    maxItems: MAX_COMPARE_ITEMS,
    canAddMore: initial.length < MAX_COMPARE_ITEMS,

    addToCompare: (productId: string, variant?: CompareVariantInfo) => {
      const { compareItems } = get();
      if (compareItems.some(i => i.productId === productId) || compareItems.length >= MAX_COMPARE_ITEMS) {
        return false;
      }
      const next = [...compareItems, { productId, variant }];
      const nextIds = next.map(i => i.productId);
      saveToStorage(next);
      set({
        compareItems: next,
        compareIds: nextIds,
        compareCount: next.length,
        canAddMore: next.length < MAX_COMPARE_ITEMS,
      });
      return true;
    },

    removeFromCompare: (productId: string) => {
      const next = get().compareItems.filter((i) => i.productId !== productId);
      const nextIds = next.map(i => i.productId);
      saveToStorage(next);
      set({
        compareItems: next,
        compareIds: nextIds,
        compareCount: next.length,
        canAddMore: next.length < MAX_COMPARE_ITEMS,
      });
    },

    toggleCompare: (productId: string, variant?: CompareVariantInfo) => {
      const { compareItems } = get();
      if (compareItems.some(i => i.productId === productId)) {
        const next = compareItems.filter((i) => i.productId !== productId);
        const nextIds = next.map(i => i.productId);
        saveToStorage(next);
        set({
          compareItems: next,
          compareIds: nextIds,
          compareCount: next.length,
          canAddMore: next.length < MAX_COMPARE_ITEMS,
        });
        return { added: false, isFull: false };
      }
      if (compareItems.length >= MAX_COMPARE_ITEMS) {
        return { added: false, isFull: true };
      }
      const next = [...compareItems, { productId, variant }];
      const nextIds = next.map(i => i.productId);
      saveToStorage(next);
      set({
        compareItems: next,
        compareIds: nextIds,
        compareCount: next.length,
        canAddMore: next.length < MAX_COMPARE_ITEMS,
      });
      return { added: true, isFull: false };
    },

    isInCompare: (productId: string) => get().compareItems.some((i) => i.productId === productId),

    getCompareVariant: (productId: string) =>
      get().compareItems.find((i) => i.productId === productId)?.variant,

    clearCompare: () => {
      saveToStorage([]);
      set({
        compareItems: [],
        compareIds: [],
        compareCount: 0,
        canAddMore: true,
      });
    },
  };
});
