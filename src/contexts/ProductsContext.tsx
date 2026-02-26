import React, { createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { useProducts, Product } from "@/hooks/useProducts";

interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  getProductById: (id: string) => Product | undefined;
  getProductsByIds: (ids: string[]) => Product[];
}

export const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { data: products = [], isLoading } = useProducts(undefined, {
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const getProductById = useCallback(
    (id: string): Product | undefined => productMap.get(id),
    [productMap]
  );

  const getProductsByIds = useCallback(
    (ids: string[]): Product[] =>
      ids.map((id) => productMap.get(id)).filter((p): p is Product => p !== undefined),
    [productMap]
  );

  return (
    <ProductsContext.Provider value={{ products, isLoading, getProductById, getProductsByIds }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProductsContext must be used within a ProductsProvider");
  }
  return context;
}
