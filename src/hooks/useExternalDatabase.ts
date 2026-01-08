import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Resource = 'companies' | 'products';
type Operation = 'select' | 'insert' | 'update' | 'delete';

interface UseExternalDatabaseOptions {
  resource: Resource;
}

interface ExternalDatabaseState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
}

export function useExternalDatabase<T = Record<string, unknown>>({ resource }: UseExternalDatabaseOptions) {
  const [state, setState] = useState<ExternalDatabaseState<T>>({
    data: [],
    isLoading: false,
    error: null,
  });

  const invoke = useCallback(async (
    operation: Operation,
    options?: {
      data?: Partial<T>;
      filters?: Record<string, unknown>;
      id?: string;
    }
  ): Promise<T | T[] | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          resource,
          operation,
          data: options?.data,
          filters: options?.filters,
          id: options?.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      if (operation === 'select') {
        setState(prev => ({ ...prev, data: data.data as T[], isLoading: false }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao acessar banco externo';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(errorMessage);
      return null;
    }
  }, [resource]);

  // Métodos convenientes
  const fetchAll = useCallback(async (filters?: Record<string, unknown>) => {
    return invoke('select', { filters }) as Promise<T[] | null>;
  }, [invoke]);

  const fetchOne = useCallback(async (id: string) => {
    const result = await invoke('select', { filters: { id } });
    return Array.isArray(result) ? result[0] || null : null;
  }, [invoke]);

  const create = useCallback(async (data: Partial<T>) => {
    const result = await invoke('insert', { data });
    if (result) {
      toast.success('Registro criado com sucesso!');
    }
    return result as T | null;
  }, [invoke]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    const result = await invoke('update', { id, data });
    if (result) {
      toast.success('Registro atualizado com sucesso!');
    }
    return result as T | null;
  }, [invoke]);

  const remove = useCallback(async (id: string) => {
    const result = await invoke('delete', { id });
    if (result) {
      toast.success('Registro excluído com sucesso!');
    }
    return !!result;
  }, [invoke]);

  const refetch = useCallback(async (filters?: Record<string, unknown>) => {
    return fetchAll(filters);
  }, [fetchAll]);

  return {
    ...state,
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    refetch,
    invoke,
  };
}

// Hooks específicos para cada recurso
export function useExternalCompanies() {
  return useExternalDatabase<ExternalCompany>({ resource: 'companies' });
}

export function useExternalProducts() {
  return useExternalDatabase<ExternalProduct>({ resource: 'products' });
}

// Tipos base (ajuste conforme estrutura do seu banco externo)
export interface ExternalCompany {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ramo?: string;
  nicho?: string;
  logo_url?: string;
  cor_primaria?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalProduct {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  price?: number;
  category_name?: string;
  subcategory?: string;
  image_url?: string;
  colors?: unknown;
  materials?: string[];
  is_active?: boolean;
  stock?: number;
  min_quantity?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}
