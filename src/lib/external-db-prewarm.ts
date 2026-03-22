/**
 * Pre-warming do banco externo para evitar cold starts.
 * Faz requests leves (limit=1, select mínimo, countMode=none)
 * em sequência escalonada para evitar stampede de cold starts.
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
const STAGGER_DELAY_MS = 800; // Espaçamento entre requests para evitar cold-start stampede

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function prewarmExternalDb() {
  const now = Date.now();
  if (now - lastPrewarmAt < PREWARM_COOLDOWN_MS) {
    logger.log('[Prewarm] Skipped — cooldown active');
    return;
  }
  lastPrewarmAt = now;

  logger.log('[Prewarm] Warming up external DB connections (staggered)...');

  // Sequencial escalonado: primeiro aquece a conexão principal,
  // depois as demais com delay para evitar sobrecarga
  for (let i = 0; i < PREWARM_TABLES.length; i++) {
    const table = PREWARM_TABLES[i];
    
    // Primeiro request sem delay, demais com stagger
    if (i > 0) await sleep(STAGGER_DELAY_MS);

    supabase.functions
      .invoke('external-db-bridge', {
        body: {
          table,
          operation: 'select',
          select: 'id',
          limit: 1,
          countMode: 'none',
        },
      })
      .then(() => {
        logger.log(`[Prewarm] ✅ ${table} warmed`);
      })
      .catch((err) => {
        logger.warn(`[Prewarm] ⚠️ ${table} failed:`, err?.message);
      });
  }
}
