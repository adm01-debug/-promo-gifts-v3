import { GateFlagProvider } from './types';
import { EnvGateProvider, LocalStorageGateProvider } from './providers';
import type { AppRole } from '@/contexts/AuthContext';

/**
 * Roles que têm permissão intrínseca para acessar ferramentas de infraestrutura.
 */
export const ALLOWED_INFRA_ROLES: AppRole[] = ['dev', 'supervisor', 'admin'];

/**
 * Motor principal do Gate de Infraestrutura Dev.
 * Centraliza a lógica de precedência (Chain of Responsibility).
 */
export class DevInfraGate {
  private providers: GateFlagProvider[];
  private cache: Map<string, boolean> = new Map();
  private listeners: Set<() => void> = new Set();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly allowedRoles: Set<AppRole>;

  constructor(providers?: GateFlagProvider[], allowedRoles: AppRole[] = ALLOWED_INFRA_ROLES) {
    this.providers = providers ?? [
      new EnvGateProvider(),
      new LocalStorageGateProvider()
    ];
    // Otimização Algorítmica: Set para lookup O(1)
    this.allowedRoles = new Set(allowedRoles);
    
    if (typeof window !== 'undefined') {
      // Usamos uma referência única para o listener para permitir limpeza futura se necessário
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'show_dev_infra_messages' || e.key === 'lov:bridge-metrics-overlay:open') {
      this.invalidateCache();
    }
  };

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  hasAccess(userRoles: AppRole[]): boolean {
    if (!userRoles?.length) return false;
    // Otimização: early return na primeira role encontrada
    for (let i = 0; i < userRoles.length; i++) {
      if (this.allowedRoles.has(userRoles[i])) return true;
    }
    return false;
  }

  shouldShow(userRoles: AppRole[]): boolean {
    if (!this.hasAccess(userRoles)) return false;

    // Otimização de CPU: Gerar cacheKey sem sort se houver apenas 1 role (caso comum)
    const cacheKey = userRoles.length === 1 ? userRoles[0] : [...userRoles].sort().join(',');
    
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    let result: boolean = true;
    for (const provider of this.providers) {
      const value = provider.getFlag();
      if (value !== 'auto') {
        result = value;
        break;
      }
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  invalidateCache(): void {
    this.cache.clear();
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Estabilidade: 50ms é o "sweet spot" entre responsividade e pressão de CPU
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.listeners.forEach(l => l());
    }, 50);
  }
}

export const devInfraGate = new DevInfraGate();
