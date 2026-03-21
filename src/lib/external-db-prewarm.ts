/**
 * Pre-warming do banco externo para evitar cold starts.
 * Faz requests leves (limit=1, select mínimo, countMode=none)
 * em fire-and-forget para aquecer as conexões.
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

export function prewarmExternalDb() {
  const now = Date.now();
  if (now - lastPrewarmAt < PREWARM_COOLDOWN_MS) {
    logger.log('[Prewarm] Skipped — cooldown active');
    return;
  }
  lastPrewarmAt = now;

  logger.log('[Prewarm] Warming up external DB connections...');

  // Fire-and-forget: não bloqueia a UI
  for (const table of PREWARM_TABLES) {
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
