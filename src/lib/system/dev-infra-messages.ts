/**
 * dev-infra-messages — SSOT do gate que decide se mensagens técnicas de
 * infraestrutura (estado do backend, reconexão de bridge, banners de
 * indisponibilidade etc.) podem aparecer no frontend.
 *
 * Camadas (avaliadas em ordem; a primeira a decidir vence):
 *  1. **Build-time env (`VITE_SHOW_DEV_INFRA_MESSAGES`)**
 *     Quando definida com um valor explícito, ganha de tudo. Útil para:
 *       - desligar globalmente em demos/produção (`"false"` / `"0"` / `"off"`)
 *       - ligar para todos os usuários em ambientes de homolog (`"true"`)
 *       - voltar ao comportamento padrão (não definir, ou `"auto"`)
 *  2. **Runtime override do dev (`localStorage.show_dev_infra_messages`)**
 *     Permite que um dev oculte/force esses banners no próprio navegador
 *     sem rebuild, sobrescrevendo o default por usuário (DX). Aceita
 *     `"true"|"false"|"1"|"0"|"on"|"off"` ou `"auto"` para resetar.
 *  3. **Default**: `isDev === true` (papel `dev` no AuthContext).
 *
 * Uso típico (em componentes):
 *   const { isDev } = useAuth();
 *   if (!shouldShowDevInfraMessages(isDev)) return null;
 *
 * Não importe nada de React aqui — função pura, fácil de testar e
 * reutilizável fora de componentes (ex.: handlers que só querem disparar
 * um toast quando o gate permite).
 */

const TRUTHY = new Set(['true', '1', 'on', 'yes', 'enabled']);
const FALSY = new Set(['false', '0', 'off', 'no', 'disabled']);
const AUTO = new Set(['', 'auto', 'default']);

type Decision = boolean | 'auto';

function parse(value: string | null | undefined): Decision {
  if (value == null) return 'auto';
  const v = String(value).trim().toLowerCase();
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  if (AUTO.has(v)) return 'auto';
  return 'auto';
}

/**
 * Lê a flag de build-time. `import.meta.env` só existe no bundle Vite — em
 * ambiente Node (testes, scripts) caímos no `process.env` como fallback.
 */
function readEnvFlag(): Decision {
  try {
    const fromVite =
      typeof import.meta !== 'undefined' && import.meta.env
        ? (import.meta.env.VITE_SHOW_DEV_INFRA_MESSAGES as string | undefined)
        : undefined;
    if (fromVite != null) return parse(fromVite);
  } catch {
    /* import.meta indisponível — segue */
  }
  if (typeof process !== 'undefined' && process.env) {
    const fromNode = process.env.VITE_SHOW_DEV_INFRA_MESSAGES;
    if (fromNode != null) return parse(fromNode);
  }
  return 'auto';
}

/**
 * Lê o override por usuário. Falha silenciosa em SSR / modo privado.
 */
function readLocalOverride(): Decision {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'auto';
    return parse(window.localStorage.getItem('show_dev_infra_messages'));
  } catch {
    return 'auto';
  }
}

/**
 * Decide se mensagens técnicas de infra devem aparecer.
 *
 * @param isDev resultado de `useAuth().isDev` — só usado no fallback.
 */
export function shouldShowDevInfraMessages(isDev: boolean): boolean {
  const env = readEnvFlag();
  if (env !== 'auto') return env;
  const local = readLocalOverride();
  if (local !== 'auto') return local;
  return Boolean(isDev);
}

/**
 * Retorna o estado bruto do gate para UIs de diagnóstico (settings/dev).
 * Não usado em runtime de banner — apenas inspeção.
 */
export function describeDevInfraMessagesGate(isDev: boolean): {
  effective: boolean;
  source: 'env' | 'local' | 'role';
} {
  const env = readEnvFlag();
  if (env !== 'auto') return { effective: env, source: 'env' };
  const local = readLocalOverride();
  if (local !== 'auto') return { effective: local, source: 'local' };
  return { effective: Boolean(isDev), source: 'role' };
}
