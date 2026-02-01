import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FutureStockEntry {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  variant_id: string | null;
  color_name: string | null;
  color_hex: string | null;
  variant_sku: string | null;
  expected_quantity: number;
  expected_date: string;
  order_date: string | null;
  source: 'purchase_order' | 'production' | 'transfer' | 'manual';
  source_reference: string | null;
  status: 'pending' | 'confirmed' | 'in_transit' | 'partial' | 'completed' | 'cancelled';
  supplier_id: string | null;
  supplier_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateFutureStockInput {
  product_id: string;
  product_name: string;
  product_sku: string;
  variant_id?: string;
  color_name?: string;
  color_hex?: string;
  variant_sku?: string;
  expected_quantity: number;
  expected_date: string;
  order_date?: string;
  source?: 'purchase_order' | 'production' | 'transfer' | 'manual';
  source_reference?: string;
  status?: 'pending' | 'confirmed' | 'in_transit' | 'partial' | 'completed' | 'cancelled';
  supplier_id?: string;
  supplier_name?: string;
  notes?: string;
}

/**
 * Busca entradas de estoque futuro para um produto específico
 */
export function useFutureStockByProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['future-stock', productId],
    queryFn: async (): Promise<FutureStockEntry[]> => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('future_stock_entries')
        .select('*')
        .eq('product_id', productId)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('expected_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar estoque futuro:', error);
        throw error;
      }

      return (data || []) as FutureStockEntry[];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

/**
 * Busca todas as entradas de estoque futuro pendentes/em trânsito
 */
export function usePendingFutureStock() {
  return useQuery({
    queryKey: ['future-stock', 'pending'],
    queryFn: async (): Promise<FutureStockEntry[]> => {
      const { data, error } = await supabase
        .from('future_stock_entries')
        .select('*')
        .in('status', ['pending', 'confirmed', 'in_transit'])
        .order('expected_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar estoque futuro pendente:', error);
        throw error;
      }

      return (data || []) as FutureStockEntry[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Cria uma nova entrada de estoque futuro
 */
export function useCreateFutureStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFutureStockInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('future_stock_entries')
        .insert({
          ...input,
          created_by: user.user?.id,
          updated_by: user.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar estoque futuro:', error);
        throw error;
      }

      return data as FutureStockEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['future-stock', data.product_id] });
      queryClient.invalidateQueries({ queryKey: ['future-stock', 'pending'] });
    },
  });
}

/**
 * Atualiza o status de uma entrada de estoque futuro
 */
export function useUpdateFutureStockStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, productId }: { id: string; status: FutureStockEntry['status']; productId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('future_stock_entries')
        .update({
          status,
          updated_by: user.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }

      return { entry: data as FutureStockEntry, productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ['future-stock', productId] });
      queryClient.invalidateQueries({ queryKey: ['future-stock', 'pending'] });
    },
  });
}

/**
 * Deleta uma entrada de estoque futuro
 */
export function useDeleteFutureStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('future_stock_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar estoque futuro:', error);
        throw error;
      }

      return { productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ['future-stock', productId] });
      queryClient.invalidateQueries({ queryKey: ['future-stock', 'pending'] });
    },
  });
}
