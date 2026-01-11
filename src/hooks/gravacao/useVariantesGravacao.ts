// Hook CRUD para Variantes de Técnicas de Gravação
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseGravacao } from '@/lib/supabase-gravacao';
import type { 
  TecnicaGravacaoVariante, 
  VarianteFormData 
} from '@/types/gravacao-database';
import { toast } from 'sonner';

const QUERY_KEY = 'variantes-gravacao';

// Gerar slug a partir do nome
const generateSlug = (nome: string): string => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export function useVariantesGravacao(tecnicaId?: string) {
  const queryClient = useQueryClient();

  // Listar variantes (opcionalmente filtradas por técnica)
  const variantesQuery = useQuery({
    queryKey: [QUERY_KEY, tecnicaId],
    queryFn: async (): Promise<TecnicaGravacaoVariante[]> => {
      let query = supabaseGravacao
        .from('tecnica_gravacao_variante')
        .select('*')
        .order('ordem_exibicao', { ascending: true });

      if (tecnicaId) {
        query = query.eq('tecnica_gravacao_id', tecnicaId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar variantes:', error);
        throw new Error(`Erro ao carregar variantes: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Criar nova variante
  const createMutation = useMutation({
    mutationFn: async (formData: VarianteFormData): Promise<TecnicaGravacaoVariante> => {
      const slug = generateSlug(formData.nome);
      
      const { data, error } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .insert({
          ...formData,
          slug,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar variante:', error);
        throw new Error(`Erro ao criar variante: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['tecnicas-gravacao'] });
      toast.success('Variante criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Atualizar variante
  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<VarianteFormData> & { id: string }): Promise<TecnicaGravacaoVariante> => {
      const updateData: Record<string, unknown> = { ...updates };
      
      if (updates.nome) {
        updateData.slug = generateSlug(updates.nome);
      }
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar variante:', error);
        throw new Error(`Erro ao atualizar variante: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Variante atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Excluir variante
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir variante:', error);
        throw new Error(`Erro ao excluir variante: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['tecnicas-gravacao'] });
      toast.success('Variante excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle status ativo
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }): Promise<void> => {
      const { error } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao alterar status: ${error.message}`);
      }
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(ativo ? 'Variante ativada!' : 'Variante desativada!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    variantes: variantesQuery.data ?? [],
    isLoading: variantesQuery.isLoading,
    isError: variantesQuery.isError,
    error: variantesQuery.error,
    refetch: variantesQuery.refetch,
    
    // Mutations
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutate,
    
    // Estados das mutations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook para todas as variantes (para selects/dropdowns)
export function useAllVariantes() {
  return useQuery({
    queryKey: [QUERY_KEY, 'all'],
    queryFn: async (): Promise<TecnicaGravacaoVariante[]> => {
      const { data, error } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        throw new Error(`Erro ao carregar variantes: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}
