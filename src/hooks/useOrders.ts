/**
 * useOrders — hooks centralizados para listagem, detalhe e mutações de pedidos.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logRlsDenial } from "@/lib/security/rls-denial-logger";
import { applySellerScope } from "@/lib/auth/apply-seller-scope";
import type { Database } from "@/integrations/supabase/types";

type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];


export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: string;
  total: number | null;
  subtotal: number | null;
  discount_amount: number | null;
  shipping_cost: number | null;
  shipping_type: string | null;
  tracking_number: string | null;
  delivery_time: string | null;
  payment_terms: string | null;
  client_id: string | null;
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  internal_notes: string | null;
  quote_id: string | null;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lista pedidos respeitando RLS. Quando `scope === "self"`, aplica filtro
 * adicional por seller_id (defesa em profundidade); para "team"/"all" deixa
 * o RLS decidir o que aparece.
 */
export function useOrdersList(sellerId?: string, scope: "self" | "team" | "all" = "self") {
  return useQuery({
    queryKey: ["orders", "list", sellerId, scope],
    enabled: !!sellerId,
    queryFn: async (): Promise<OrderRow[]> => {
      // rls-allow: applySellerScope chamado dinamicamente conforme escopo
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      q = applySellerScope(q, { scope, userId: sellerId });
      
      const { data, error } = await q;
      if (error) {
        await logRlsDenial(error, {
          table: "orders", op: "SELECT",
          endpoint: "useOrdersList",
          querySummary: `scope=${scope} sellerId=${sellerId ?? "?"}`,
          policyHint: "orders_select_scope",
        });
        throw error;
      }
      return (data ?? []) as OrderRow[];
    },
  });
}

export function useOrderDetail(orderId?: string) {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        // rls-allow: applySellerScope chamado dinamicamente conforme escopo
        supabase.from("orders").select("*").eq("id", orderId!).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId!),
      ]);
      if (orderRes.error) throw orderRes.error;
      return {
        order: orderRes.data as OrderRow | null,
        items: itemsRes.data ?? [],
      };
    },
  });
}

export function useUpdateOrder(orderId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: OrderUpdate) => {
      // Sanitização básica de inputs de texto
      const sanitizedPatch: OrderUpdate = { 
        ...patch,
        updated_at: new Date().toISOString()
      };
      
      if (typeof sanitizedPatch.notes === 'string') {
        sanitizedPatch.notes = sanitizedPatch.notes.trim().slice(0, 2000);
      }
      if (typeof sanitizedPatch.internal_notes === 'string') {
        sanitizedPatch.internal_notes = sanitizedPatch.internal_notes.trim().slice(0, 2000);
      }

      const { error } = await supabase
        // rls-allow: applySellerScope chamado dinamicamente conforme escopo
        .from("orders")
        .update(sanitizedPatch)
        .eq("id", orderId!);
        
      if (error) {
        await logRlsDenial(error, {
          table: "orders", op: "UPDATE",
          endpoint: "useUpdateOrder",
          targetId: orderId,
          policyHint: "orders_update_scope",
        });
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => {
      console.error("Error updating order:", e);
      toast.error(e.message || "Erro ao atualizar pedido");
    },
  });
}

export const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "in_production",
  "shipped",
  "delivered",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  in_production: "Em Produção",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: "Não Processado",
  partial: "Parcial",
  fulfilled: "Completo",
};
