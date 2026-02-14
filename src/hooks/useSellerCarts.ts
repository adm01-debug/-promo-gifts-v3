/**
 * useSellerCarts - Hook para gerenciar carrinhos de vendedor
 * Persiste no banco de dados, máx 3 carrinhos simultâneos
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export interface SellerCart {
  id: string;
  seller_id: string;
  company_id: string;
  company_name: string;
  company_location: string | null;
  company_logo_url: string | null;
  created_at: string;
  updated_at: string;
  items: SellerCartItem[];
}

export interface SellerCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  product_price: number;
  quantity: number;
  color_name: string | null;
  color_hex: string | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface AddToCartInput {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string;
  product_price: number;
  quantity?: number;
  color_name?: string;
  color_hex?: string;
}

export interface CreateCartInput {
  company_id: string;
  company_name: string;
  company_location?: string;
  company_logo_url?: string;
}

const QUERY_KEY = "seller-carts";

// ============================================
// HOOK
// ============================================

export function useSellerCarts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Fetch all carts with items
  const cartsQuery = useQuery<SellerCart[]>({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: carts, error: cartsError } = await supabase
        .from("seller_carts")
        .select("*")
        .eq("seller_id", userId)
        .order("updated_at", { ascending: false });

      if (cartsError) throw cartsError;
      if (!carts?.length) return [];

      const { data: items, error: itemsError } = await supabase
        .from("seller_cart_items")
        .select("*")
        .in("cart_id", carts.map(c => c.id))
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      return carts.map(cart => ({
        ...cart,
        items: (items || []).filter(i => i.cart_id === cart.id),
      }));
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Create cart
  const createCart = useMutation({
    mutationFn: async (input: CreateCartInput) => {
      if (!userId) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("seller_carts")
        .insert({
          seller_id: userId,
          company_id: input.company_id,
          company_name: input.company_name,
          company_location: input.company_location || null,
          company_logo_url: input.company_logo_url || null,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes("Limite de 3")) {
          throw new Error("Você já tem 3 carrinhos ativos. Finalize ou exclua um antes de criar outro.");
        }
        throw error;
      }
      return { ...data, items: [] } as SellerCart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete cart
  const deleteCart = useMutation({
    mutationFn: async (cartId: string) => {
      const { error } = await supabase
        .from("seller_carts")
        .delete()
        .eq("id", cartId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Carrinho removido");
    },
  });

  // Add item to cart
  const addItem = useMutation({
    mutationFn: async ({ cartId, item }: { cartId: string; item: AddToCartInput }) => {
      // Check if product already exists in cart
      const { data: existing } = await supabase
        .from("seller_cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("product_id", item.product_id)
        .maybeSingle();

      if (existing) {
        // Update quantity
        const { error } = await supabase
          .from("seller_cart_items")
          .update({ quantity: existing.quantity + (item.quantity || 1) })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("seller_cart_items")
          .insert({
            cart_id: cartId,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku || null,
            product_image_url: item.product_image_url || null,
            product_price: item.product_price,
            quantity: item.quantity || 1,
            color_name: item.color_name || null,
            color_hex: item.color_hex || null,
          });
        if (error) throw error;
      }

      // Touch cart updated_at
      await supabase
        .from("seller_carts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", cartId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Remove item
  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("seller_cart_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Update item quantity
  const updateItemQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { error } = await supabase
        .from("seller_cart_items")
        .update({ quantity })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Computed
  const carts = cartsQuery.data || [];
  const totalItems = carts.reduce((sum, c) => sum + c.items.length, 0);
  const canCreateCart = carts.length < 3;

  return {
    carts,
    isLoading: cartsQuery.isLoading,
    totalItems,
    canCreateCart,
    createCart,
    deleteCart,
    addItem,
    removeItem,
    updateItemQuantity,
    refetch: cartsQuery.refetch,
  };
}
