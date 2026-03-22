/**
 * Custom Kit Persistence Hook
 * CRUD para a tabela custom_kits (banco local)
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { KitState } from '@/lib/kit-builder';

// ============================================
// TYPES
// ============================================

export interface CustomKitRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  box_data: Record<string, unknown> | null;
  items_data: Record<string, unknown>[];
  personalization_data: Record<string, unknown>;
  kit_quantity: number;
  box_price: number;
  items_price: number;
  personalization_price: number;
  total_price: number;
  volume_usage_percent: number;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['custom-kits'] as const;

// ============================================
// HOOK
// ============================================

export function useCustomKitPersistence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Lista os kits do usuário
  const { data: savedKits = [], isLoading: isLoadingKits } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_kits')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CustomKitRow[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Salvar kit (insert ou update)
  const saveMutation = useMutation({
    mutationFn: async ({ kitId, kitState, kitQuantity }: {
      kitId?: string;
      kitState: KitState;
      kitQuantity: number;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const payload = {
        user_id: user.id,
        name: kitState.name || 'Kit sem nome',
        status: kitState.isValid ? 'complete' : 'draft',
        box_data: kitState.box ? JSON.parse(JSON.stringify(kitState.box)) : null,
        items_data: JSON.parse(JSON.stringify(kitState.items)),
        personalization_data: JSON.parse(JSON.stringify(kitState.personalization)),
        kit_quantity: kitQuantity,
        box_price: kitState.boxPrice,
        items_price: kitState.itemsPrice,
        personalization_price: kitState.personalizationPrice,
        total_price: kitState.totalPrice,
        volume_usage_percent: kitState.volumeUsagePercent,
        updated_at: new Date().toISOString(),
      };

      if (kitId) {
        const { data, error } = await supabase
          .from('custom_kits')
          .update(payload)
          .eq('id', kitId)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('custom_kits')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Kit salvo com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar kit: ${err.message}`);
    },
  });

  // Deletar kit
  const deleteMutation = useMutation({
    mutationFn: async (kitId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('custom_kits')
        .delete()
        .eq('id', kitId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Kit removido');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });

  const saveKit = useCallback(
    (kitState: KitState, kitQuantity: number, kitId?: string) =>
      saveMutation.mutateAsync({ kitId, kitState, kitQuantity }),
    [saveMutation]
  );

  const deleteKit = useCallback(
    (kitId: string) => deleteMutation.mutateAsync(kitId),
    [deleteMutation]
  );

  return {
    savedKits,
    isLoadingKits,
    saveKit,
    deleteKit,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
