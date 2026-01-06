// ============================================
// FUNCIONALIDADE: SOFT DELETE + RESTORE
// STATUS: ❌ Ausente → ✅ Implementado
// PRIORIDADE: 🔴 CRÍTICA
// ============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SoftDeleteConfig {
  tableName: string;
  queryKey: string[];
  entityName: string;
}

export function useSoftDelete<T extends { id: string; deleted_at?: string | null }>(
  config: SoftDeleteConfig
) {
  const queryClient = useQueryClient();
  const { tableName, queryKey, entityName } = config;

  // Soft delete
  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(`Erro ao arquivar ${entityName}: ${error.message}`);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<T[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<T[]>(
          queryKey,
          previous.filter((item) => item.id !== id)
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'deleted'] });
      toast.success(`${entityName} arquivado! Você pode restaurá-lo da lixeira.`);
    },
  });

  // Restore
  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw new Error(`Erro ao restaurar ${entityName}: ${error.message}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'deleted'] });
      toast.success(`${entityName} restaurado com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Permanent delete
  const permanentDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Erro ao deletar ${entityName} permanentemente: ${error.message}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'deleted'] });
      toast.success(`${entityName} deletado permanentemente.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Query para itens deletados
  const deletedItems = useQuery<T[]>({
    queryKey: [...queryKey, 'deleted'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw new Error(`Erro ao buscar itens deletados: ${error.message}`);
      return data as T[];
    },
    staleTime: 30 * 1000, // 30 segundos
  });

  // Bulk soft delete
  const bulkSoftDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw new Error(`Erro ao arquivar ${entityName}s: ${error.message}`);
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'deleted'] });
      toast.success(`${ids.length} ${entityName}(s) arquivado(s)!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk restore
  const bulkRestore = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: null })
        .in('id', ids);

      if (error) throw new Error(`Erro ao restaurar ${entityName}s: ${error.message}`);
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'deleted'] });
      toast.success(`${ids.length} ${entityName}(s) restaurado(s)!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    softDelete,
    restore,
    permanentDelete,
    bulkSoftDelete,
    bulkRestore,
    deletedItems,
    isLoadingDeleted: deletedItems.isPending,
  };
}
