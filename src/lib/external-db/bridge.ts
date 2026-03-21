/**
 * External DB Bridge — Core invocation layer.
 * Handles retry, error parsing, batch queries.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type Operation = 'select' | 'insert' | 'update' | 'delete';

export interface InvokeOptions<T = Record<string, unknown>> {
  table: string;
  operation: Operation;
  data?: T;
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  countMode?: 'exact' | 'planned' | 'estimated' | 'none';
}

export interface InvokeResult<T> {
  records: T[];
  count: number | null;
}

export interface BridgeResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface BatchQuery {
  table: string;
  operation?: 'select';
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  cacheKey?: string;
}

export interface BatchResult {
  success: boolean;
  data?: { records: unknown[]; count: number | null };
  error?: string;
  fromCache?: boolean;
}

const BOOT_RETRY_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function buildBridgeError(error: unknown): Promise<{ message: string; retryable: boolean }> {
  let baseMessage = 'Erro desconhecido';
  let status: number | undefined;
  let responseBody = '';

  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; context?: Response };
    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      baseMessage = maybeError.message;
    }
    if (maybeError.context instanceof Response) {
      status = maybeError.context.status;
      try { responseBody = await maybeError.context.clone().text(); } catch { /* ignore */ }
    }
  }

  const diagnostic = `${baseMessage} ${responseBody}`.toLowerCase();
  const retryable =
    status === 502 || status === 503 || status === 504 ||
    diagnostic.includes('boot_error') ||
    diagnostic.includes('bad gateway') ||
    diagnostic.includes('function failed to start') ||
    diagnostic.includes('statement timeout') ||
    diagnostic.includes('canceling statement due to statement timeout') ||
    diagnostic.includes('57014');

  const details = responseBody ? `${baseMessage} | ${responseBody}` : baseMessage;
  return { message: `Erro na bridge: ${details}`, retryable };
}

export async function invokeBridge<T>(body: Record<string, unknown>): Promise<BridgeResponse<T>> {
  const op = body.operation as string | undefined;
  if (op !== 'batch' && (!body.table || typeof body.table !== 'string')) {
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    logger.error(`[external-db] invokeBridge called without table! operation=${op}, caller=${caller}`, body);
    throw new Error(`invokeBridge: tabela não informada (operation=${op})`);
  }

  for (let attempt = 1; attempt <= BOOT_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', { body });
    if (error) {
      const parsed = await buildBridgeError(error);
      if (parsed.retryable && attempt < BOOT_RETRY_ATTEMPTS) {
        await sleep(250 * attempt);
        continue;
      }
      throw new Error(parsed.message);
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Erro desconhecido no banco externo');
    }
    return data as BridgeResponse<T>;
  }
  throw new Error('Erro na bridge: tentativas esgotadas');
}

// ============================================
// BATCH BRIDGE
// ============================================
const BATCH_MAX_QUERIES = 10;

function extractBatchResults(payload: unknown): BatchResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const directResults = (payload as { results?: BatchResult[] }).results;
  if (Array.isArray(directResults)) return directResults;
  const nestedResults = (payload as { data?: { results?: BatchResult[] } }).data?.results;
  if (Array.isArray(nestedResults)) return nestedResults;
  return [];
}

export async function invokeBatchBridge(queries: BatchQuery[]): Promise<BatchResult[]> {
  if (queries.length <= BATCH_MAX_QUERIES) {
    const response = await invokeBridge<{ results: BatchResult[] }>({
      operation: 'batch',
      queries,
    });
    const parsedResults = extractBatchResults(response);
    if (parsedResults.length === 0 && queries.length > 0) {
      throw new Error('Resposta inválida da batch bridge');
    }
    return parsedResults;
  }

  const results: BatchResult[] = [];
  for (let i = 0; i < queries.length; i += BATCH_MAX_QUERIES) {
    const chunk = queries.slice(i, i + BATCH_MAX_QUERIES);
    const response = await invokeBridge<{ results: BatchResult[] }>({
      operation: 'batch',
      queries: chunk,
    });
    const parsedResults = extractBatchResults(response);
    if (parsedResults.length === 0 && chunk.length > 0) {
      throw new Error('Resposta inválida da batch bridge');
    }
    results.push(...parsedResults);
  }
  return results;
}

// ============================================
// CRUD HELPERS
// ============================================

export async function invokeExternalDb<T>(
  options: InvokeOptions
): Promise<InvokeResult<T>> {
  const response = await invokeBridge<InvokeResult<T> | T>(options as unknown as Record<string, unknown>);
  const payload = response.data;

  if (
    options.operation !== 'select' &&
    payload && typeof payload === 'object' &&
    !Array.isArray(payload) && !('records' in payload)
  ) {
    return { records: [payload as T], count: 1 };
  }
  return payload as InvokeResult<T>;
}

export async function invokeExternalDbSingle<T>(
  options: InvokeOptions
): Promise<T> {
  const result = await invokeExternalDb<T>(options);
  if (!result.records?.length) {
    throw new Error('Nenhum registro retornado');
  }
  return result.records[0];
}

export async function invokeExternalDbDelete(
  table: string,
  id: string
): Promise<void> {
  await invokeBridge<{ success: boolean; deleted_id: string }>({
    table,
    operation: 'delete',
    id,
  });
}
