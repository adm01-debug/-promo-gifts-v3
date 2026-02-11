/**
 * CRM Database Access Layer
 * 
 * Acessa o banco externo CRM (pgxfvjmuubtbowutlide) via Edge Function crm-db-bridge.
 * Substitui completamente o acesso a bitrix_clients.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CrmQuery {
  table: string;
  operation: "select" | "search";
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
  relations?: string;
}

export interface CrmResponse<T> {
  data: T;
  count?: number;
}

/**
 * Invoca o crm-db-bridge para acessar dados do CRM externo
 */
export async function invokeCrmDb<T>(query: CrmQuery): Promise<CrmResponse<T>> {
  const { data, error } = await supabase.functions.invoke("crm-db-bridge", {
    body: query,
  });

  if (error) {
    console.error("[CRM-DB] Edge function error:", error);
    throw new Error(`CRM DB error: ${error.message}`);
  }

  if (data?.error) {
    console.error("[CRM-DB] Query error:", data.error);
    throw new Error(`CRM query error: ${data.error}`);
  }

  return data as CrmResponse<T>;
}

/**
 * SELECT de tabela do CRM
 */
export async function selectCrm<T>(
  table: string,
  options?: {
    filters?: Record<string, unknown>;
    select?: string;
    orderBy?: string | { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
    relations?: string;
  }
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "select",
    ...options,
  });
  return result.data || [];
}

/**
 * SELECT single do CRM por ID
 */
export async function selectCrmById<T>(
  table: string,
  id: string,
  select?: string
): Promise<T | null> {
  try {
    const result = await invokeCrmDb<T>({
      table,
      operation: "select",
      id,
      select,
    });
    return result.data || null;
  } catch (err) {
    if (String(err).includes("404")) return null;
    throw err;
  }
}

/**
 * Busca textual no CRM
 */
export async function searchCrm<T>(
  table: string,
  column: string,
  term: string,
  options?: {
    select?: string;
    orderBy?: string | { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "search",
    search: { column, term },
    ...options,
  });
  return result.data || [];
}
