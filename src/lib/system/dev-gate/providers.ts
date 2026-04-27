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
  getFlag(): GateValue {
    try {
      const env = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
      return parseGateFlag(env?.VITE_SHOW_DEV_INFRA_MESSAGES);
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
