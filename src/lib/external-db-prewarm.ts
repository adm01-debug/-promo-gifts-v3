/**
 * Pre-warming do banco externo para evitar cold starts.
 *
 * Estratégia (pós-otimização):
 *  1. Um ping leve (sem I/O de BD) acorda a edge function — completa em ~80ms quando
 *     ela já está quente via cron keep-alive (job `external-db-bridge-keepalive`).
 *  2. Em seguida, dispara todas as tabelas EM PARALELO (Promise.allSettled),
 *     reusando a mesma conexão já aberta no pool. Reduz o tempo total de ~5s
 *     (sequencial 800ms × 6) para ~1.5s no pior caso.
 *
 * Cooldown de 5 min impede thrashing entre navegações.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const PREWARM_TABLES = [
  'products',
  'product_images',
  'product_variants',
  'categories',
  'suppliers',
  'color_groups',
];

let lastPrewarmAt = 0;
const PREWARM_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos entre pre-warms

async function pingBridge(): Promise<number> {
  const t0 = performance.now();
  try {
    await supabase.functions.invoke('external-db-bridge', {
      body: { operation: 'ping' },
    });
  } catch {
    // ping é best-effort
  }
  return Math.round(performance.now() - t0);
}

async function warmTable(table: string): Promise<{ table: string; ok: boolean; ms: number; err?: string }> {
  const t0 = performance.now();
  try {
    const { error } = await supabase.functions.invoke('external-db-bridge', {
      body: {
        table,
        operation: 'select',
        select: 'id',
        limit: 1,
        countMode: 'none',
      },
    });
    const ms = Math.round(performance.now() - t0);
    if (error) return { table, ok: false, ms, err: error.message };
    return { table, ok: true, ms };
  } catch (err) {
    return { table, ok: false, ms: Math.round(performance.now() - t0), err: (err as Error)?.message };
  }
}

export async function prewarmExternalDb() {
  const now = Date.now();
  if (now - lastPrewarmAt < PREWARM_COOLDOWN_MS) {
    logger.log('[Prewarm] Skipped — cooldown active');
    return;
  }
  lastPrewarmAt = now;

  const totalStart = performance.now();
  logger.log('[Prewarm] Warming up external DB connections (parallel)...');

  // 1) Acorda a edge function com um ping leve (sem BD)
  const pingMs = await pingBridge();

  // 2) Dispara todas as tabelas em paralelo
  const results = await Promise.allSettled(PREWARM_TABLES.map(warmTable));

  const totalMs = Math.round(performance.now() - totalStart);
  let okCount = 0;
  let failCount = 0;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.ok) {
        okCount++;
        logger.log(`[Prewarm] ✅ ${r.value.table} warmed (${r.value.ms}ms)`);
      } else {
        failCount++;
        logger.warn(`[Prewarm] ⚠️ ${r.value.table} failed (${r.value.ms}ms): ${r.value.err}`);
      }
    } else {
      failCount++;
      logger.warn(`[Prewarm] ⚠️ rejected:`, r.reason);
    }
  }

  logger.log(
    `[Prewarm] Done in ${totalMs}ms — ping=${pingMs}ms ok=${okCount} fail=${failCount} (parallel; was ~5000ms sequential)`,
  );
}
