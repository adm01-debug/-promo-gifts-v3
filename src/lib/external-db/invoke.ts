/**
 * Utilitários de invocação do external-db-bridge com retry e error handling.
 * Extraído de useExternalDatabase.ts para modularização.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 800;
const RETRYABLE_PATTERNS = [
  'statement timeout', '57014', '502', '503', '504',
  'bad gateway', 'FunctionsHttpError',
  'network', 'fetch', 'ECONNRESET', 'socket hang up',
  'AbortError', 'Failed to fetch',
  // Cold-start / runtime boot do isolate da edge function (plataforma)
  'supabase_edge_runtime_error', 'service is temporarily unavailable',
  'boot_error', 'function failed to start',
];

// Erros determinísticos do Postgres/PostgREST: retry NUNCA muda o resultado.
// Falhar imediatamente economiza até 3×backoff (~5.6s) por chamada inválida.
const NON_RETRYABLE_PATTERNS = [
  'does not exist',          // column / relation X does not exist
  'invalid input syntax',    // type cast failures
  'pgrst',                   // PostgREST schema/parse errors
  'permission denied',       // RLS / role mismatch
  'duplicate key',           // 23505
  'violates ',               // foreign key / not-null / check constraints
  'syntax error',            // SQL syntax
  'malformed',
  'jwt',                     // auth-related (cliente precisa renovar, não retry)
  'unauthorized', '401', '403', '400',
];

function matches(msg: string, patterns: string[]): boolean {
  const lower = msg.toLowerCase();
  return patterns.some(p => lower.includes(p.toLowerCase()));
}

function isNonRetryableError(msg: string): boolean {
  return matches(msg, NON_RETRYABLE_PATTERNS);
}

function isRetryableError(msg: string): boolean {
  // Determinísticos vencem a lista de retry mesmo que casem por acidente.
  if (isNonRetryableError(msg)) return false;
  return matches(msg, RETRYABLE_PATTERNS);
}

export async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof Error) {
    const maybeContext = error as Error & { context?: Response };
    if (maybeContext.context instanceof Response) {
      try {
        const raw = await maybeContext.context.clone().text();
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as {
              error?: string; details?: string; hint?: string;
              message?: string; code?: string;
            };
            const detailed = [parsed.error, parsed.code, parsed.message, parsed.details, parsed.hint]
              .filter(Boolean).join(' | ');
            if (detailed) return `${error.message} | ${detailed}`;
          } catch {
            return `${error.message} | ${raw}`;
          }
        }
      } catch {
        // ignore parse failure
      }
    }
    return error.message;
  }

  return 'Erro ao acessar banco externo';
}

export async function invokeWithRetry(
  body: Record<string, unknown>,
  retries = MAX_RETRIES,
  onRetry?: (attempt: number, maxRetries: number, delayMs: number) => void
): Promise<{ data: unknown; error: Error | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', { body });

    if (!error) return { data, error: null };

    const msg = await extractFunctionErrorMessage(error);

    // Fail-fast em erros determinísticos (schema/validação/auth) — retry não muda o resultado.
    if (isNonRetryableError(msg)) {
      logger.warn(`[external-db] Fail-fast (deterministic error, no retry): ${msg}`);
      return { data, error };
    }

    if (attempt < retries && isRetryableError(msg)) {
      // Backoff exponencial com jitter (evita thundering herd em prewarm paralelo)
      const base = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 200);
      const delay = Math.min(base + jitter, 4000);
      logger.warn(`[external-db] Retry ${attempt + 1}/${retries} after ${delay}ms: ${msg}`);
      onRetry?.(attempt + 1, retries, delay);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    return { data, error };
  }
  return { data: null, error: new Error('Max retries exceeded') };
}
