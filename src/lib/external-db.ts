// Helper para invocar o external-db-bridge (banco Promobrind)
import { supabase } from '@/integrations/supabase/client';

type Operation = 'select' | 'insert' | 'update' | 'delete';

interface InvokeOptions<T = Record<string, unknown>> {
  table: string;
  operation: Operation;
  data?: T;
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

interface InvokeResult<T> {
  records: T[];
  count: number;
}

/**
 * Invoca o external-db-bridge para operações CRUD no banco Promobrind.
 * Esse é o método seguro e padronizado de acessar o banco externo,
 * passando pelo edge function que valida autenticação e permissões.
 */
export async function invokeExternalDb<T>(
  options: InvokeOptions
): Promise<InvokeResult<T>> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: options,
  });

  if (error) {
    throw new Error(`Erro na bridge: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro desconhecido no banco externo');
  }

  // Para operações que retornam um único registro
  if (options.operation !== 'select' && data.data && !Array.isArray(data.data)) {
    return { records: [data.data as T], count: 1 };
  }

  return data.data as InvokeResult<T>;
}

/**
 * Versão para operações que retornam um único registro (insert, update)
 */
export async function invokeExternalDbSingle<T>(
  options: InvokeOptions
): Promise<T> {
  const result = await invokeExternalDb<T>(options);
  if (!result.records?.length) {
    throw new Error('Nenhum registro retornado');
  }
  return result.records[0];
}

/**
 * Versão para operações de delete (não retorna dados)
 */
export async function invokeExternalDbDelete(
  table: string,
  id: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table, operation: 'delete', id },
  });

  if (error) {
    throw new Error(`Erro na bridge: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro ao excluir registro');
  }
}
