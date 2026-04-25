/**
 * Event bus leve para sinalizar indisponibilidade do external-db-bridge à UI.
 *
 * Disparos:
 *  - `degraded`: 1ª tentativa retornou 503/cold-start, mas o retry vai cobrir.
 *  - `unavailable`: retries esgotados; o usuário precisa saber.
 *  - `recovered`: chamada subsequente voltou a 200 após `degraded`/`unavailable`.
 *
 * Listeners (toast/banner) decidem como apresentar — este módulo só
 * publica eventos, sem dependências de UI.
 */

export type BridgeStatusEvent =
  | { type: 'degraded'; attempt: number; maxAttempts: number; delayMs: number; reason: string }
  | { type: 'unavailable'; reason: string; attempts: number }
  | { type: 'recovered' };

type Listener = (e: BridgeStatusEvent) => void;
const listeners = new Set<Listener>();

export function onBridgeStatus(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitBridgeStatus(e: BridgeStatusEvent): void {
  for (const fn of listeners) {
    try { fn(e); } catch { /* listener errors must not break invoke flow */ }
  }
}

const COLD_START_PATTERNS = [
  'supabase_edge_runtime_error',
  'service is temporarily unavailable',
  'boot_error',
  '503',
  '502',
  '504',
  'bad gateway',
  'function failed to start',
];

export function isColdStartSignal(message: string): boolean {
  const lower = message.toLowerCase();
  return COLD_START_PATTERNS.some(p => lower.includes(p));
}
