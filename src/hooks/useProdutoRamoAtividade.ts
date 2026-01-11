import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ramoAtividadeService } from '@/services/ramoAtividadeService';
import { toast } from 'sonner';

// ============================================================
// QUERY KEYS
// ============================================================
const QUERY_KEY = ['produto-ramo-atividade'];

// ============================================================
// QUERIES
// ============================================================

// Buscar ramos de atividade de um produto
export function useRamosAtividadeDoProduto(produtoId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY, produtoId],
    queryFn: async () => {
      if (!produtoId) return [];
      const { associacoes } = await ramoAtividadeService.getRamosDoProduto(produtoId);
      return associacoes.map(a => a.ramo_atividade_filho_id);
    },
    enabled: !!produtoId,
  });
}

// ============================================================
// MUTATIONS
// ============================================================

// Atualizar ramos de atividade de um produto (substituir todos)
export function useUpdateRamosAtividadeDoProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      produtoId, 
      segmentoIds 
    }: { 
      produtoId: string; 
      segmentoIds: string[] 
    }) => {
      await ramoAtividadeService.updateRamosDoProduto(produtoId, segmentoIds);
      return { produtoId, segmentoIds };
    },
    onSuccess: ({ produtoId }) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, produtoId] });
      toast.success('Ramos de atividade atualizados!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

// Adicionar um ramo de atividade a um produto
export function useAddRamoAtividadeAoProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      produtoId, 
      segmentoId 
    }: { 
      produtoId: string; 
      segmentoId: string 
    }) => {
      await ramoAtividadeService.addRamoAoProduto(produtoId, segmentoId);
      return { produtoId, segmentoId };
    },
    onSuccess: (_, { produtoId }) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, produtoId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });
}

// Remover um ramo de atividade de um produto
export function useRemoveRamoAtividadeDoProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      produtoId, 
      segmentoId 
    }: { 
      produtoId: string; 
      segmentoId: string 
    }) => {
      await ramoAtividadeService.removeRamoDoProduto(produtoId, segmentoId);
      return { produtoId, segmentoId };
    },
    onSuccess: (_, { produtoId }) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, produtoId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });
}
