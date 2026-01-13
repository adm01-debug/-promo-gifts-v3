/**
 * External Database Operations with Result Pattern
 * 
 * Funções para acessar o BD externo Promobrind
 * usando Result<T, E> para tratamento explícito de erros.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  Result,
  ok,
  fail,
  AsyncResult,
  DomainError,
  DomainErrors,
  fromPromise,
  map,
} from './result';

// ============================================
// ERROS ESPECÍFICOS DE BD EXTERNO
// ============================================

export const ExternalDbErrors = {
  connectionFailed: (message: string) =>
    DomainErrors.externalService('Promobrind DB', message),
  
  queryFailed: (table: string, operation: string, message: string) =>
    DomainErrors.externalService(
      'Promobrind DB',
      `Falha em ${operation} na tabela ${table}: ${message}`
    ),
  
  recordNotFound: (table: string, id: string) =>
    DomainErrors.notFound(table, id),
  
  unauthorized: () =>
    DomainErrors.unauthorized('acesso ao BD externo'),
  
  invalidResponse: (expected: string) =>
    DomainErrors.externalService('Promobrind DB', `Resposta inválida: esperado ${expected}`),
};

// ============================================
// TIPOS
// ============================================

export interface ExternalDbQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  id?: string;
  select?: string;
  orderBy?: string;
  limit?: number;
}

export interface ExternalDbResponse<T> {
  data: T;
  count?: number;
}

// ============================================
// FUNÇÕES COM RESULT
// ============================================

/**
 * Invoca bridge do BD externo com Result
 */
export async function invokeExternalDbResult<T>(
  query: ExternalDbQuery
): AsyncResult<ExternalDbResponse<T>, DomainError> {
  const result = await fromPromise(
    supabase.functions.invoke('external-db-bridge', {
      body: query,
    }),
    (error) => ExternalDbErrors.connectionFailed(String(error))
  );

  if (!result.ok) {
    return result;
  }

  const { data, error } = result.value;

  if (error) {
    return fail(
      ExternalDbErrors.queryFailed(
        query.table,
        query.operation,
        error.message || 'Erro desconhecido'
      )
    );
  }

  if (!data) {
    return fail(ExternalDbErrors.invalidResponse('data'));
  }

  return ok(data as ExternalDbResponse<T>);
}

/**
 * SELECT com Result
 */
export async function selectFromExternal<T>(
  table: string,
  options?: {
    filters?: Record<string, unknown>;
    select?: string;
    orderBy?: string;
    limit?: number;
  }
): AsyncResult<T[], DomainError> {
  const result = await invokeExternalDbResult<T[]>({
    table,
    operation: 'select',
    ...options,
  });

  return map(result, (response) => response.data);
}

/**
 * SELECT single com Result
 */
export async function selectOneFromExternal<T>(
  table: string,
  id: string
): AsyncResult<T, DomainError> {
  const result = await invokeExternalDbResult<T[]>({
    table,
    operation: 'select',
    id,
  });

  if (!result.ok) {
    return result;
  }

  const records = result.value.data;
  
  if (!records || records.length === 0) {
    return fail(ExternalDbErrors.recordNotFound(table, id));
  }

  return ok(records[0]);
}

/**
 * INSERT com Result
 */
export async function insertIntoExternal<T>(
  table: string,
  data: Record<string, unknown>
): AsyncResult<T, DomainError> {
  const result = await invokeExternalDbResult<T>({
    table,
    operation: 'insert',
    data,
  });

  return map(result, (response) => response.data);
}

/**
 * UPDATE com Result
 */
export async function updateInExternal<T>(
  table: string,
  id: string,
  data: Record<string, unknown>
): AsyncResult<T, DomainError> {
  const result = await invokeExternalDbResult<T>({
    table,
    operation: 'update',
    id,
    data,
  });

  return map(result, (response) => response.data);
}

/**
 * DELETE com Result
 */
export async function deleteFromExternal(
  table: string,
  id: string
): AsyncResult<void, DomainError> {
  const result = await invokeExternalDbResult<null>({
    table,
    operation: 'delete',
    id,
  });

  return map(result, () => undefined);
}

// ============================================
// HELPERS DE ALTA ORDEM
// ============================================

/**
 * Busca com fallback
 */
export async function selectWithFallback<T>(
  table: string,
  options?: {
    filters?: Record<string, unknown>;
    select?: string;
    orderBy?: string;
    limit?: number;
  },
  fallback: T[] = []
): Promise<T[]> {
  const result = await selectFromExternal<T>(table, options);
  return result.ok ? result.value : fallback;
}

/**
 * Busca única com fallback null
 */
export async function selectOneOrNull<T>(
  table: string,
  id: string
): Promise<T | null> {
  const result = await selectOneFromExternal<T>(table, id);
  return result.ok ? result.value : null;
}
