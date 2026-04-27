import { GateValue, GateFlagProvider } from './types';

const TRUTHY = new Set(['true', '1', 'on', 'yes']);
const FALSY = new Set(['false', '0', 'off', 'no']);

/**
 * Utilitário para parsear strings em valores do Gate.
 */
export function parseGateFlag(raw: unknown): GateValue {
  if (typeof raw !== 'string') return 'auto';
  const v = raw.trim().toLowerCase();
  if (v === '' || v === 'auto') return 'auto';
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return 'auto';
}

/**
 * Provedor de flag baseado em variáveis de ambiente do Vite.
 */
export class EnvGateProvider implements GateFlagProvider {
  private static cachedValue: GateValue | null = null;

  getFlag(): GateValue {
    if (EnvGateProvider.cachedValue !== null) return EnvGateProvider.cachedValue;

    try {
      // Otimização: Acesso direto ao import.meta.env (Vite substitui em build-time)
      // O cache estático evita parsing de string em cada chamada.
      const raw = import.meta.env.VITE_SHOW_DEV_INFRA_MESSAGES;
      EnvGateProvider.cachedValue = parseGateFlag(raw);
      return EnvGateProvider.cachedValue;
    } catch {
      return 'auto';
    }
  }
}

/**
 * Provedor de flag baseado em localStorage.
 */
export class LocalStorageGateProvider implements GateFlagProvider {
  constructor(private readonly key: string = 'show_dev_infra_messages') {}

  getFlag(): GateValue {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return 'auto';
      return parseGateFlag(window.localStorage.getItem(this.key));
    } catch {
      return 'auto';
    }
  }
}
