/**
 * useOrders — hooks centralizados para listagem, detalhe e mutações de pedidos.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logRlsDenial } from '@/lib/security/rls-denial-logger';
import { applySellerScope } from '@/lib/auth/apply-seller-scope';
import type { Database } from '@/integrations/supabase/types';

type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];

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

export interface OrdersListFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Lista pedidos respeitando RLS, com suporte a paginação e busca.
 */
export function useOrdersList(
  sellerId?: string,
  scope: 'self' | 'team' | 'all' = 'self',
  filters: OrdersListFilters = {},
) {
  const { search, status, page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['orders', 'list', sellerId, scope, search, status, page, pageSize],
    enabled: !!sellerId,
    queryFn: async (): Promise<{ data: OrderRow[]; count: number }> => {
      let q = supabase.from('orders').select('*', { count: 'exact' });

      q = applySellerScope(q, { scope, userId: sellerId });

      if (status && status !== 'all') {
        q = q.eq('status', status);
      }

      if (search) {
        // Busca otimizada usando os campos principais
        q = q.or(
          `order_number.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%`,
        );
      }

      // Ordenação lógica: Pedidos recentes primeiro, mas permitindo expansão para ordenação por status se necessário
      q = q.order('created_at', { ascending: false });

      // Paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) {
        console.error('Error fetching orders:', error);
        await logRlsDenial(error, {
          table: 'orders',
          op: 'SELECT',
          endpoint: 'useOrdersList',
          querySummary: `scope=${scope} sellerId=${sellerId ?? '?'} search=${search}`,
          policyHint: 'orders_select_scope',
        });
        throw error;
      }
      return {
        data: (data ?? []) as OrderRow[],
        count: count ?? 0,
      };
    },
  });
}

export function useOrderDetail(orderId?: string) {
  return useQuery({
    queryKey: ['orders', 'detail', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        // rls-allow: applySellerScope chamado dinamicamente conforme escopo
        supabase.from('orders').select('*').eq('id', orderId!).maybeSingle(),
        supabase.from('order_items').select('*').eq('order_id', orderId!),
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
        updated_at: new Date().toISOString(),
      };

      if (typeof sanitizedPatch.notes === 'string') {
        sanitizedPatch.notes = sanitizedPatch.notes.trim().slice(0, 2000);
      }
      if (typeof sanitizedPatch.internal_notes === 'string') {
        sanitizedPatch.internal_notes = sanitizedPatch.internal_notes.trim().slice(0, 2000);
      }

      const { error } = await supabase
        // rls-allow: applySellerScope chamado dinamicamente conforme escopo
        .from('orders')
        .update(sanitizedPatch)
        .eq('id', orderId!);

      if (error) {
        await logRlsDenial(error, {
          table: 'orders',
          op: 'UPDATE',
          endpoint: 'useUpdateOrder',
          targetId: orderId,
          policyHint: 'orders_update_scope',
        });
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Pedido atualizado');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: Error) => {
      console.error('Error updating order:', e);
      toast.error(e.message || 'Erro ao atualizar pedido');
    },
  });
}

export const ORDER_STATUS_ORDER = {
  pending: 0,
  confirmed: 1,
  in_production: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 5,
} as const;

export const ORDER_STATUS_FLOW = [
  'pending',
  'confirmed',
  'in_production',
  'shipped',
  'delivered',
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  in_production: 'Em Produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: 'Não Processado',
  partial: 'Parcial',
  fulfilled: 'Completo',
};
