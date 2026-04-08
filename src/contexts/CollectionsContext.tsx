import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { useCollections, Collection, CollectionVariantInfo, CollectionProductItem } from "@/hooks/useCollections";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product } from "@/hooks/useProducts";

interface CollectionsContextType {
  collections: Collection[];
  isLoaded: boolean;
  createCollection: (
    name: string,
    description?: string,
    color?: string,
    icon?: string
  ) => Collection;
  updateCollection: (
    id: string,
    updates: Partial<Omit<Collection, "id" | "createdAt">>
  ) => void;
  deleteCollection: (id: string) => void;
  addProductToCollection: (collectionId: string, productId: string, variant?: CollectionVariantInfo) => void;
  removeProductFromCollection: (collectionId: string, productId: string) => void;
  addProductToMultipleCollections: (productId: string, collectionIds: string[], variant?: CollectionVariantInfo) => void;
  getCollectionProducts: (collectionId: string) => Product[];
  getCollectionProductItems: (collectionId: string) => CollectionProductItem[];
  getCollectionProductVariant: (collectionId: string, productId: string) => CollectionVariantInfo | undefined;
  getProductCollections: (productId: string) => Collection[];
  isProductInCollection: (productId: string, collectionId: string) => boolean;
  defaultColors: string[];
  defaultIcons: string[];
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const collectionsHook = useCollections();
  const { getProductsByIds } = useProductsContext();

  const getCollectionProducts = useCallback(
    (collectionId: string): Product[] =>
      collectionsHook.getCollectionProductsFromMap(collectionId, getProductsByIds),
    [collectionsHook.getCollectionProductsFromMap, getProductsByIds]
  );

  return (
    <CollectionsContext.Provider
      value={{ ...collectionsHook, getCollectionProducts }}
    >
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollectionsContext() {
  const context = useContext(CollectionsContext);
  if (context === undefined) {
    throw new Error("useCollectionsContext must be used within a CollectionsProvider");
  }
  return context;
}
