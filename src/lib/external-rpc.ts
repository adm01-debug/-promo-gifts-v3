/**
 * Módulo compartilhado para invocar RPCs no banco externo Promobrind.
 * 
 * IMPORTANTE: Este é o ÚNICO local onde invokeExternalRpc deve ser definido.
 * Todos os hooks e utils devem importar daqui.
 * 
 * Usa a edge function 'external-db-bridge' como proxy autenticado.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Invoca uma RPC no banco externo via edge function.
 * 
 * @param rpcName Nome da função RPC (deve estar na whitelist da edge function)
 * @param params Parâmetros da RPC
 * @returns Dados retornados pela RPC
 * @throws Error se a RPC falhar ou não estiver na whitelist
 * 
 * RPCs permitidas:
 * - fn_get_product_print_areas
 * - fn_get_customization_price
 * - fn_get_customization_price_v2
 * - fn_link_product_print_areas
 * - fn_backfill_product_print_areas
 * - fn_find_fornecedor_price_table
 * - get_category_descendants
 */
export async function invokeExternalRpc<T>(
  rpcName: string,
  params: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      operation: 'rpc',
      rpcName,
      rpcParams: params,
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro na RPC');
  
  return data.data as T;
}
