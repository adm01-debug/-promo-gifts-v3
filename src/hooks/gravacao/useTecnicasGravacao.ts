// Hook CRUD para Técnicas de Gravação (Supabase Externo)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseGravacao } from '@/lib/supabase-gravacao';
import type { 
  TecnicaGravacao, 
  TecnicaGravacaoFormData,
  TecnicaGravacaoWithVariantes 
} from '@/types/gravacao-database';
import { toast } from 'sonner';

const QUERY_KEY = 'tecnicas-gravacao';

// Gerar slug a partir do nome
const generateSlug = (nome: string): string => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export function useTecnicasGravacao() {
  const queryClient = useQueryClient();

  // Listar todas as técnicas com contagem de variantes
  const tecnicasQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<TecnicaGravacaoWithVariantes[]> => {
      // Buscar técnicas
      const { data: tecnicas, error: tecnicasError } = await supabaseGravacao
        .from('tecnica_gravacao')
        .select('*')
        .order('ordem_exibicao', { ascending: true });

      if (tecnicasError) {
        console.error('Erro ao buscar técnicas:', tecnicasError);
        throw new Error(`Erro ao carregar técnicas: ${tecnicasError.message}`);
      }

      // Buscar contagem de variantes por técnica
      const { data: variantes, error: variantesError } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .select('tecnica_gravacao_id');

      if (variantesError) {
        console.error('Erro ao buscar variantes:', variantesError);
      }

      // Contar variantes por técnica
      const variantesCount: Record<string, number> = {};
      variantes?.forEach((v) => {
        variantesCount[v.tecnica_gravacao_id] = (variantesCount[v.tecnica_gravacao_id] || 0) + 1;
      });

      return (tecnicas || []).map((t) => ({
        ...t,
        variantes: [],
        variantes_count: variantesCount[t.id] || 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Criar nova técnica
  const createMutation = useMutation({
    mutationFn: async (formData: TecnicaGravacaoFormData): Promise<TecnicaGravacao> => {
      const slug = generateSlug(formData.nome);
      
      const { data, error } = await supabaseGravacao
        .from('tecnica_gravacao')
        .insert({
          ...formData,
          slug,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar técnica:', error);
        throw new Error(`Erro ao criar técnica: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Técnica criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Atualizar técnica
  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<TecnicaGravacaoFormData> & { id: string }): Promise<TecnicaGravacao> => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Regenerar slug se o nome mudou
      if (updates.nome) {
        updateData.slug = generateSlug(updates.nome);
      }
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseGravacao
        .from('tecnica_gravacao')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar técnica:', error);
        throw new Error(`Erro ao atualizar técnica: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Técnica atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Excluir técnica
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Verificar se tem variantes vinculadas
      const { count, error: countError } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .select('*', { count: 'exact', head: true })
        .eq('tecnica_gravacao_id', id);

      if (countError) {
        throw new Error(`Erro ao verificar variantes: ${countError.message}`);
      }

      if (count && count > 0) {
        throw new Error(`Não é possível excluir: existem ${count} variante(s) vinculada(s)`);
      }

      const { error } = await supabaseGravacao
        .from('tecnica_gravacao')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir técnica:', error);
        throw new Error(`Erro ao excluir técnica: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Técnica excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle status ativo
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }): Promise<void> => {
      const { error } = await supabaseGravacao
        .from('tecnica_gravacao')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao alterar status: ${error.message}`);
      }
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(ativo ? 'Técnica ativada!' : 'Técnica desativada!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    tecnicas: tecnicasQuery.data ?? [],
    isLoading: tecnicasQuery.isLoading,
    isError: tecnicasQuery.isError,
    error: tecnicasQuery.error,
    refetch: tecnicasQuery.refetch,
    
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

// Hook para buscar uma única técnica com suas variantes
export function useTecnicaGravacao(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<TecnicaGravacaoWithVariantes | null> => {
      if (!id) return null;

      const { data: tecnica, error: tecnicaError } = await supabaseGravacao
        .from('tecnica_gravacao')
        .select('*')
        .eq('id', id)
        .single();

      if (tecnicaError) {
        if (tecnicaError.code === 'PGRST116') return null;
        throw new Error(`Erro ao carregar técnica: ${tecnicaError.message}`);
      }

      const { data: variantes, error: variantesError } = await supabaseGravacao
        .from('tecnica_gravacao_variante')
        .select('*')
        .eq('tecnica_gravacao_id', id)
        .order('ordem_exibicao');

      if (variantesError) {
        console.error('Erro ao buscar variantes:', variantesError);
      }

      return {
        ...tecnica,
        variantes: variantes || [],
        variantes_count: variantes?.length || 0,
      };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
