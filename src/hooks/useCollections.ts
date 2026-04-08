import { useState, useEffect, useCallback } from "react";
import { Product } from "@/hooks/useProducts";

const STORAGE_KEY = "product-collections";

export interface CollectionVariantInfo {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
}

export interface CollectionProductItem {
  productId: string;
  variant?: CollectionVariantInfo;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  /** @deprecated Use productItems instead */
  productIds: string[];
  productItems: CollectionProductItem[];
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

/** Migrate old collections that only have productIds to the new productItems format */
function migrateCollections(collections: any[]): Collection[] {
  return collections.map((col) => {
    if (!col.productItems) {
      return {
        ...col,
        productItems: (col.productIds || []).map((id: string) => ({ productId: id })),
      };
    }
    // Keep productIds in sync for backward compatibility
    if (!col.productIds || col.productIds.length !== col.productItems.length) {
      return {
        ...col,
        productIds: col.productItems.map((item: CollectionProductItem) => item.productId),
      };
    }
    return col;
  });
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCollections(migrateCollections(JSON.parse(stored)));
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
        productItems: [],
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
    (collectionId: string, productId: string, variant?: CollectionVariantInfo) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          // Check if already exists
          if (col.productIds.includes(productId)) return col;
          return {
            ...col,
            productIds: [...col.productIds, productId],
            productItems: [...col.productItems, { productId, variant }],
            updatedAt: new Date().toISOString(),
          };
        })
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
                productItems: col.productItems.filter((item) => item.productId !== productId),
                updatedAt: new Date().toISOString(),
              }
            : col
        )
      );
    },
    []
  );

  const addProductToMultipleCollections = useCallback(
    (productId: string, collectionIds: string[], variant?: CollectionVariantInfo) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (collectionIds.includes(col.id) && !col.productIds.includes(productId)) {
            return {
              ...col,
              productIds: [...col.productIds, productId],
              productItems: [...col.productItems, { productId, variant }],
              updatedAt: new Date().toISOString(),
            };
          }
          return col;
        })
      );
    },
    []
  );

  /** Get variant info for a product in a collection */
  const getCollectionProductVariant = useCallback(
    (collectionId: string, productId: string): CollectionVariantInfo | undefined => {
      const collection = collections.find((col) => col.id === collectionId);
      if (!collection) return undefined;
      const item = collection.productItems.find((i) => i.productId === productId);
      return item?.variant;
    },
    [collections]
  );

  /** Get all product items with variant info for a collection */
  const getCollectionProductItems = useCallback(
    (collectionId: string): CollectionProductItem[] => {
      const collection = collections.find((col) => col.id === collectionId);
      return collection?.productItems || [];
    },
    [collections]
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
    getCollectionProductItems,
    getCollectionProductVariant,
    getProductCollections,
    isProductInCollection,
    defaultColors: DEFAULT_COLORS,
    defaultIcons: DEFAULT_ICONS,
  };
}
