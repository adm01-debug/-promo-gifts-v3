import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseDuplicateOptions {
  tableName: string;
  queryKey: string[];
  entityName?: string;
  excludeFields?: string[];
  transformData?: (data: Record<string, unknown>) => Record<string, unknown>;
}

export function useDuplicate<T extends { id: string }>({
  tableName,
  queryKey,
  entityName = 'item',
  excludeFields = ['id', 'created_at', 'updated_at', 'deleted_at'],
  transformData,
}: UseDuplicateOptions) {
  const queryClient = useQueryClient();

  // Duplicar um item
  const duplicate = useMutation({
    mutationFn: async (item: T) => {
      const duplicateData = { ...item } as Record<string, unknown>;
      excludeFields.forEach((f) => delete duplicateData[f]);
      
      if (duplicateData.name) duplicateData.name = `${duplicateData.name} (Cópia)`;
      if (duplicateData.titulo) duplicateData.titulo = `${duplicateData.titulo} (Cópia)`;
      if (duplicateData.title) duplicateData.title = `${duplicateData.title} (Cópia)`;
      
      const finalData = transformData ? transformData(duplicateData) : duplicateData;
      const { data, error } = await supabase.from(tableName).insert(finalData).select().single();
      
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${entityName} duplicado com sucesso!`);
    },
    onError: (error: Error) => toast.error(`Erro ao duplicar: ${error.message}`),
  });

  // Duplicar múltiplos itens
  const bulkDuplicate = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .in('id', ids);

      if (fetchError) throw fetchError;
      if (!items || items.length === 0) throw new Error('Nenhum item encontrado');

      const duplicates = items.map((item: Record<string, unknown>) => {
        const duplicateData = { ...item };
        excludeFields.forEach((f) => delete duplicateData[f]);
        
        if (duplicateData.name) duplicateData.name = `${duplicateData.name} (Cópia)`;
        if (duplicateData.titulo) duplicateData.titulo = `${duplicateData.titulo} (Cópia)`;
        if (duplicateData.title) duplicateData.title = `${duplicateData.title} (Cópia)`;
        
        return transformData ? transformData(duplicateData) : duplicateData;
      });

      const { data, error } = await supabase.from(tableName).insert(duplicates).select();
      if (error) throw error;
      return data as T[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${data.length} ${entityName}(s) duplicado(s)!`);
    },
    onError: (error: Error) => toast.error(`Erro ao duplicar: ${error.message}`),
  });

  return {
    duplicate,
    bulkDuplicate,
    isDuplicating: duplicate.isPending || bulkDuplicate.isPending,
  };
}
