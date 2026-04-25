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
import { waitForBridgeReady } from '@/lib/external-db/health-check';

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

/**
 * Acorda a edge function com um ping leve antes do leque paralelo.
 *
 * O 1º ping pode receber 503 `SUPABASE_EDGE_RUNTIME_ERROR` enquanto o isolate
 * está bootando — esperar aqui (com backoff exponencial) evita que as 6
 * chamadas paralelas a seguir peguem a mesma janela de cold start e falhem
 * em cascata. Retorna `{ ok, ms }` para o caller decidir se segue em frente.
 */
async function pingBridge(): Promise<{ ok: boolean; ms: number; attempts: number }> {
  const t0 = performance.now();
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { error } = await supabase.functions.invoke('external-db-bridge', {
        body: { operation: 'ping' },
      });
      if (!error) {
        return { ok: true, ms: Math.round(performance.now() - t0), attempts: attempt };
      }
    } catch {
      // continua tentando
    }
    if (attempt < MAX_ATTEMPTS) {
      // Backoff exponencial: 400ms, 800ms (suficiente para o isolate bootar).
      await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
    }
  }
  return { ok: false, ms: Math.round(performance.now() - t0), attempts: MAX_ATTEMPTS };
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

  // 1) Acorda a edge function com um ping leve (sem BD). Aguardamos
  //    explicitamente até receber 200 — só então liberamos o leque paralelo.
  const ping = await pingBridge();

  if (!ping.ok) {
    // Isolate não respondeu nem após 3 tentativas. Disparar 6 chamadas paralelas
    // agora só amplificaria o problema — aborta e libera o cooldown para um
    // novo prewarm na próxima navegação.
    lastPrewarmAt = 0;
    const totalMs = Math.round(performance.now() - totalStart);
    logger.warn(
      `[Prewarm] ⛔ Aborted — bridge ping failed after ${ping.attempts} attempts in ${ping.ms}ms (total ${totalMs}ms). Skipping parallel fan-out.`,
    );
    return;
  }

  // 2) Isolate confirmadamente quente — dispara todas as tabelas em paralelo
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
    `[Prewarm] Done in ${totalMs}ms — ping=${ping.ms}ms (${ping.attempts}x) ok=${okCount} fail=${failCount} (parallel; was ~5000ms sequential)`,
  );
}
