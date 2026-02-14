/**
 * SellerCartContext - Contexto global para carrinhos de vendedor
 * Expõe dados e operações do carrinho em toda a aplicação
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useSellerCarts, SellerCart, AddToCartInput, CreateCartInput } from "@/hooks/useSellerCarts";
import { toast } from "sonner";

interface SellerCartContextType {
  // Data
  carts: SellerCart[];
  activeCart: SellerCart | null;
  activeCartId: string | null;
  isLoading: boolean;
  totalItems: number;
  canCreateCart: boolean;
  
  // Active cart management
  setActiveCartId: (id: string | null) => void;
  
  // Operations
  createCart: (input: CreateCartInput) => Promise<SellerCart | undefined>;
  deleteCart: (cartId: string) => void;
  addToActiveCart: (item: AddToCartInput) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
}

const SellerCartContext = createContext<SellerCartContextType | undefined>(undefined);

export function SellerCartProvider({ children }: { children: ReactNode }) {
  const {
    carts,
    isLoading,
    totalItems,
    canCreateCart,
    createCart: createCartMutation,
    deleteCart: deleteCartMutation,
    addItem,
    removeItem: removeItemMutation,
    updateItemQuantity: updateQtyMutation,
  } = useSellerCarts();

  const [activeCartId, setActiveCartId] = useState<string | null>(null);

  // Auto-select first cart if no active cart
  const resolvedActiveCartId = activeCartId && carts.find(c => c.id === activeCartId)
    ? activeCartId
    : carts.length > 0 ? carts[0].id : null;

  const activeCart = carts.find(c => c.id === resolvedActiveCartId) || null;

  const createCart = useCallback(async (input: CreateCartInput) => {
    try {
      const result = await createCartMutation.mutateAsync(input);
      if (result) {
        setActiveCartId(result.id);
        toast.success(`Carrinho criado para ${input.company_name}`);
      }
      return result;
    } catch {
      return undefined;
    }
  }, [createCartMutation]);

  const deleteCart = useCallback((cartId: string) => {
    deleteCartMutation.mutate(cartId);
    if (activeCartId === cartId) {
      setActiveCartId(null);
    }
  }, [deleteCartMutation, activeCartId]);

  const addToActiveCart = useCallback((item: AddToCartInput) => {
    if (!resolvedActiveCartId) {
      toast.error("Selecione uma empresa antes de adicionar produtos", {
        description: "Crie um carrinho vinculado a uma empresa primeiro.",
      });
      return;
    }
    addItem.mutate(
      { cartId: resolvedActiveCartId, item },
      {
        onSuccess: () => {
          toast.success(`${item.product_name} adicionado ao carrinho`, {
            description: activeCart?.company_name,
          });
        },
      }
    );
  }, [resolvedActiveCartId, addItem, activeCart]);

  const removeItem = useCallback((itemId: string) => {
    removeItemMutation.mutate(itemId);
  }, [removeItemMutation]);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    updateQtyMutation.mutate({ itemId, quantity });
  }, [updateQtyMutation]);

  return (
    <SellerCartContext.Provider
      value={{
        carts,
        activeCart,
        activeCartId: resolvedActiveCartId,
        isLoading,
        totalItems,
        canCreateCart,
        setActiveCartId,
        createCart,
        deleteCart,
        addToActiveCart,
        removeItem,
        updateItemQuantity,
      }}
    >
      {children}
    </SellerCartContext.Provider>
  );
}

export function useSellerCartContext() {
  const context = useContext(SellerCartContext);
  if (!context) {
    throw new Error("useSellerCartContext must be used within SellerCartProvider");
  }
  return context;
}
