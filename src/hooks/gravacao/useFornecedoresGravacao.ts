// Hook CRUD para Fornecedores de Gravação
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseGravacao } from '@/lib/supabase-gravacao';
import type { FornecedorGravacao } from '@/types/gravacao-database';
import { toast } from 'sonner';

const QUERY_KEY = 'fornecedores-gravacao';

interface FornecedorFormData {
  codigo: string;
  nome: string;
  nome_curto: string;
  tipo_integracao: 'api_spot' | 'api_rest' | 'manual';
  api_endpoint?: string;
  api_access_key?: string;
  api_ativo: boolean;
  contato_nome?: string;
  contato_telefone?: string;
  contato_email?: string;
  ativo: boolean;
}

export function useFornecedoresGravacao() {
  const queryClient = useQueryClient();

  // Listar fornecedores
  const fornecedoresQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<FornecedorGravacao[]> => {
      const { data, error } = await supabaseGravacao
        .from('fornecedor_gravacao')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar fornecedores:', error);
        throw new Error(`Erro ao carregar fornecedores: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Criar fornecedor
  const createMutation = useMutation({
    mutationFn: async (formData: FornecedorFormData): Promise<FornecedorGravacao> => {
      const { data, error } = await supabaseGravacao
        .from('fornecedor_gravacao')
        .insert(formData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar fornecedor:', error);
        throw new Error(`Erro ao criar fornecedor: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fornecedor criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Atualizar fornecedor
  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<FornecedorFormData> & { id: string }): Promise<FornecedorGravacao> => {
      const { data, error } = await supabaseGravacao
        .from('fornecedor_gravacao')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Excluir fornecedor
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabaseGravacao
        .from('fornecedor_gravacao')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir fornecedor:', error);
        throw new Error(`Erro ao excluir fornecedor: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fornecedor excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    fornecedores: fornecedoresQuery.data ?? [],
    isLoading: fornecedoresQuery.isLoading,
    isError: fornecedoresQuery.isError,
    error: fornecedoresQuery.error,
    refetch: fornecedoresQuery.refetch,
    
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
