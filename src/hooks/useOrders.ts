/**
 * useOrders — hooks centralizados para listagem, detalhe e mutações de pedidos.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function useOrdersList(sellerId?: string) {
  return useQuery({
    queryKey: ["orders", "list", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", sellerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
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
    mutationFn: async (patch: Partial<OrderRow>) => {
      const { error } = await supabase
        .from("orders")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", orderId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
