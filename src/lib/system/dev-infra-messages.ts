/**
 * SSOT — Dev Infra Messages Gate
 *
 * Controla a visibilidade de mensagens técnicas de infraestrutura
 * (banners de "Backend reiniciando…", toasts de "Reconectando ao
 * catálogo externo…", detalhes de status do bridge, etc.).
 *
 * Precedência (forte → fraca):
 *   1. Build-time:  VITE_SHOW_DEV_INFRA_MESSAGES  ('true' | 'false' | 'auto')
 *   2. Runtime:     localStorage.show_dev_infra_messages  ('true' | 'false' | 'auto')
 *   3. Default:     role `dev` do usuário autenticado
 *
 * Em produção, defina `VITE_SHOW_DEV_INFRA_MESSAGES=false` para
 * GARANTIR que nenhuma mensagem técnica vaze — nem para devs.
 *
 * Valores aceitos (case-insensitive): true|false|1|0|on|off|yes|no|auto
 */

export type GateValue = boolean | 'auto';

const TRUTHY = new Set(['true', '1', 'on', 'yes']);
const FALSY = new Set(['false', '0', 'off', 'no']);

function parseFlag(raw: unknown): GateValue {
  if (typeof raw !== 'string') return 'auto';
  const v = raw.trim().toLowerCase();
  if (v === '' || v === 'auto') return 'auto';
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return 'auto';
}

function readEnvFlag(): GateValue {
  try {
    // Vite injeta import.meta.env em tempo de build.
    const env = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    return parseFlag(env?.VITE_SHOW_DEV_INFRA_MESSAGES);
  } catch {
    return 'auto';
  }
}

function readLocalOverride(): GateValue {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'auto';
    return parseFlag(window.localStorage.getItem('show_dev_infra_messages'));
  } catch {
    return 'auto';
  }
}

/**
 * Decide se mensagens técnicas de infraestrutura devem ser exibidas.
 * @param isDev resultado de `useAuth().isDev` (papel `dev` do usuário).
 */
export function shouldShowDevInfraMessages(isDev: boolean): boolean {
  const env = readEnvFlag();
  if (env !== 'auto') return env;
  const local = readLocalOverride();
  if (local !== 'auto') return local;
  return Boolean(isDev);
}
