import React, { createContext, useContext, ReactNode, useCallback, useState } from "react";
import type { Product } from "@/data/mockData";

interface QuickQuoteItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

interface QuickQuoteContextType {
  items: QuickQuoteItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearAll: () => void;
  isInQuote: (productId: string) => boolean;
  totalItems: number;
  totalValue: number;
  createQuote: () => void;
}

const QuickQuoteContext = createContext<QuickQuoteContextType | undefined>(undefined);

export function QuickQuoteProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuickQuoteItem[]>([]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const minQty = product.minQuantity || 1;
      return [...prev, { product, quantity: Math.max(minQty, quantity) }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const isInQuote = useCallback(
    (productId: string) => items.some((item) => item.product.id === productId),
    [items]
  );

  const createQuote = useCallback(() => {
    // Esta função é chamada pelo FAB de Quick Quote
    // A navegação real é feita pelo componente que usa esse contexto
    // O componente QuickQuoteFAB já redireciona para /orcamentos/novo
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <QuickQuoteContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearAll,
        isInQuote,
        totalItems,
        totalValue,
        createQuote,
      }}
    >
      {children}
    </QuickQuoteContext.Provider>
  );
}

export function useQuickQuoteContext() {
  const context = useContext(QuickQuoteContext);
  if (context === undefined) {
    throw new Error("useQuickQuoteContext must be used within a QuickQuoteProvider");
  }
  return context;
}
