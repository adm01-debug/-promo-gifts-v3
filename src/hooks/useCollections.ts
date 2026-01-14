import { useState, useEffect, useCallback } from "react";
import { Product } from "@/hooks/useProducts";

const STORAGE_KEY = "product-collections";

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_COLORS = [
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#3B82F6", // blue
  "#EF4444", // red
  "#6366F1", // indigo
  "#14B8A6", // teal
];

const DEFAULT_ICONS = ["📁", "⭐", "🎁", "💼", "🎯", "💡", "🔥", "❤️"];

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCollections(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading collections:", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    }
  }, [collections, isLoaded]);

  const createCollection = useCallback(
    (name: string, description?: string, color?: string, icon?: string): Collection => {
      const newCollection: Collection = {
        id: `col-${Date.now()}`,
        name,
        description,
        color:
          color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
        icon: icon || DEFAULT_ICONS[0],
        productIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCollections((prev) => [...prev, newCollection]);
      return newCollection;
    },
    []
  );

  const updateCollection = useCallback(
    (id: string, updates: Partial<Omit<Collection, "id" | "createdAt">>) => {
      setCollections((prev) =>
        prev.map((col) =>
          col.id === id
            ? { ...col, ...updates, updatedAt: new Date().toISOString() }
            : col
        )
      );
    },
    []
  );

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((col) => col.id !== id));
  }, []);

  const addProductToCollection = useCallback(
    (collectionId: string, productId: string) => {
      setCollections((prev) =>
        prev.map((col) =>
          col.id === collectionId && !col.productIds.includes(productId)
            ? {
                ...col,
                productIds: [...col.productIds, productId],
                updatedAt: new Date().toISOString(),
              }
            : col
        )
      );
    },
    []
  );

  const removeProductFromCollection = useCallback(
    (collectionId: string, productId: string) => {
      setCollections((prev) =>
        prev.map((col) =>
          col.id === collectionId
            ? {
                ...col,
                productIds: col.productIds.filter((id) => id !== productId),
                updatedAt: new Date().toISOString(),
              }
            : col
        )
      );
    },
    []
  );

  const addProductToMultipleCollections = useCallback(
    (productId: string, collectionIds: string[]) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (collectionIds.includes(col.id) && !col.productIds.includes(productId)) {
            return {
              ...col,
              productIds: [...col.productIds, productId],
              updatedAt: new Date().toISOString(),
            };
          }
          return col;
        })
      );
    },
    []
  );

  /** Resolver produtos usando a função do ProductsContext */
  const getCollectionProductsFromMap = useCallback(
    (
      collectionId: string,
      getProductsByIds: (ids: string[]) => Product[]
    ): Product[] => {
      const collection = collections.find((col) => col.id === collectionId);
      if (!collection) return [];
      return getProductsByIds(collection.productIds);
    },
    [collections]
  );

  const getProductCollections = useCallback(
    (productId: string): Collection[] =>
      collections.filter((col) => col.productIds.includes(productId)),
    [collections]
  );

  const isProductInCollection = useCallback(
    (productId: string, collectionId: string): boolean => {
      const collection = collections.find((col) => col.id === collectionId);
      return collection?.productIds.includes(productId) ?? false;
    },
    [collections]
  );

  return {
    collections,
    isLoaded,
    createCollection,
    updateCollection,
    deleteCollection,
    addProductToCollection,
    removeProductFromCollection,
    addProductToMultipleCollections,
    getCollectionProductsFromMap,
    getProductCollections,
    isProductInCollection,
    defaultColors: DEFAULT_COLORS,
    defaultIcons: DEFAULT_ICONS,
  };
}
