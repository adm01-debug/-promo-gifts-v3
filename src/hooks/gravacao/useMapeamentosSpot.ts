// Hook CRUD para Mapeamentos SPOT
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseGravacao } from '@/lib/supabase-gravacao';
import type { 
  SpotTecnicaMapeamento,
  SpotMapeamentoWithVariante,
  TecnicaGravacaoVariante 
} from '@/types/gravacao-database';
import { toast } from 'sonner';

const QUERY_KEY = 'mapeamentos-spot';

interface MapeamentoFormData {
  spot_customization_type: string;
  spot_table_code: string;
  tecnica_variante_id: string;
  regra_formato?: string;
  regra_observacao?: string;
  mapeamento_automatico: boolean;
  ativo: boolean;
}

export function useMapeamentosSpot() {
  const queryClient = useQueryClient();

  // Listar mapeamentos com dados da variante
  const mapeamentosQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<SpotMapeamentoWithVariante[]> => {
      // Buscar mapeamentos
      const { data: mapeamentos, error: mapError } = await supabaseGravacao
        .from('spot_tecnica_mapeamento')
        .select('*')
        .order('spot_table_code', { ascending: true });

      if (mapError) {
        console.error('Erro ao buscar mapeamentos:', mapError);
        throw new Error(`Erro ao carregar mapeamentos: ${mapError.message}`);
      }

      // Buscar variantes para enriquecer os dados
      const varianteIds = [...new Set(mapeamentos?.map(m => m.tecnica_variante_id) || [])];
      
      const { data: variantes, error: varError } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .select('*')
        .in('id', varianteIds);

      if (varError) {
        console.error('Erro ao buscar variantes:', varError);
      }

      const variantesMap: Record<string, TecnicaGravacaoVariante> = {};
      variantes?.forEach(v => {
        variantesMap[v.id] = v;
      });

      return (mapeamentos || []).map(m => ({
        ...m,
        variante: variantesMap[m.tecnica_variante_id],
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Criar mapeamento
  const createMutation = useMutation({
    mutationFn: async (formData: MapeamentoFormData): Promise<SpotTecnicaMapeamento> => {
      const { data, error } = await supabaseGravacao
        .from('spot_tecnica_mapeamento')
        .insert(formData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar mapeamento:', error);
        throw new Error(`Erro ao criar mapeamento: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Mapeamento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Atualizar mapeamento
  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<MapeamentoFormData> & { id: string }): Promise<SpotTecnicaMapeamento> => {
      const { data, error } = await supabaseGravacao
        .from('spot_tecnica_mapeamento')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar mapeamento:', error);
        throw new Error(`Erro ao atualizar mapeamento: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Mapeamento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Excluir mapeamento
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabaseGravacao
        .from('spot_tecnica_mapeamento')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir mapeamento:', error);
        throw new Error(`Erro ao excluir mapeamento: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Mapeamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    mapeamentos: mapeamentosQuery.data ?? [],
    isLoading: mapeamentosQuery.isLoading,
    isError: mapeamentosQuery.isError,
    error: mapeamentosQuery.error,
    refetch: mapeamentosQuery.refetch,
    
    // Mutations
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    
    // Estados
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
