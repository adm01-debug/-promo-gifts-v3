// supabase/functions/_shared/external-db-telemetry.ts
// Query performance telemetry for external-db-bridge

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

export const SLOW_QUERY_THRESHOLD_MS = 3000;
export const VERY_SLOW_QUERY_THRESHOLD_MS = 8000;

export interface TelemetryMeta {
  operation: string;
  table?: string;
  rpcName?: string;
  limit?: number;
  offset?: number;
  countMode?: string;
  durationMs: number;
  recordCount?: number;
  status: 'ok' | 'error' | 'slow' | 'very_slow';
  error?: string;
  userId?: string | null;
}

export function emitTelemetry(meta: TelemetryMeta) {
  const icon = meta.status === 'very_slow' ? '🔴' : meta.status === 'slow' ? '🟡' : meta.status === 'error' ? '❌' : '✅';
  const target = meta.rpcName || meta.table || 'unknown';
  const line = `${icon} [telemetry] ${meta.operation}:${target} ${meta.durationMs}ms | records=${meta.recordCount ?? '-'} limit=${meta.limit ?? '-'} offset=${meta.offset ?? '-'} count=${meta.countMode ?? '-'}`;

  if (meta.status === 'very_slow') console.warn(`⚠️ VERY SLOW QUERY: ${line}`);
  else if (meta.status === 'slow') console.warn(`⚠️ SLOW QUERY: ${line}`);
  else if (meta.status === 'error') console.error(line + ` error=${meta.error}`);
  else console.info(line);

  // Persist slow/error queries (fire-and-forget)
  if (meta.status !== 'ok') {
    try {
      const localUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (localUrl && serviceKey) {
        const localClient = createClient(localUrl, serviceKey);
        localClient.from('query_telemetry').insert({
          operation: meta.operation,
          table_name: meta.table || null,
          rpc_name: meta.rpcName || null,
          duration_ms: meta.durationMs,
          record_count: meta.recordCount ?? null,
          query_limit: meta.limit ?? null,
          query_offset: meta.offset ?? null,
          count_mode: meta.countMode || null,
          severity: meta.status,
          error_message: meta.error || null,
          user_id: meta.userId || null,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.warn('[telemetry-persist] Insert failed:', insertErr.message);
        });
      }
    } catch (_e) {
      // Fire-and-forget
    }
  }
}

export function classifyDuration(durationMs: number): 'ok' | 'slow' | 'very_slow' {
  if (durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS) return 'very_slow';
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) return 'slow';
  return 'ok';
}
