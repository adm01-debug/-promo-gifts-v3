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
  // Cache estático para o provedor de ambiente (imutável após o boot)
  private envFlagCache: boolean | 'auto' | null = null;

  constructor(providers?: GateFlagProvider[], allowedRoles: AppRole[] = ALLOWED_INFRA_ROLES) {
    this.providers = providers ?? [
      new EnvGateProvider(),
      new LocalStorageGateProvider()
    ];
    this.allowedRoles = new Set(allowedRoles);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private handleStorageEvent = (e: StorageEvent) => {
    // Lookup O(1) para chaves de storage
    if (e.key === 'show_dev_infra_messages' || e.key === 'lov:bridge-metrics-overlay:open') {
      this.invalidateCache();
    }
  };

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  hasAccess(userRoles: AppRole[]): boolean {
    if (!userRoles || userRoles.length === 0) return false;
    
    // Complexidade O(n) sobre as roles do usuário, mas lookup de permissão é O(1)
    for (let i = 0, len = userRoles.length; i < len; i++) {
      if (this.allowedRoles.has(userRoles[i])) return true;
    }
    return false;
  }

  shouldShow(userRoles: AppRole[]): boolean {
    if (!this.hasAccess(userRoles)) return false;

    // Otimização de CPU: Gerar cacheKey sem sort se houver apenas 1 role (caso mais comum)
    const cacheKey = userRoles.length === 1 ? userRoles[0] : [...userRoles].sort().join(',');
    
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    let result: boolean = true;
    for (const provider of this.providers) {
      // Otimização: Evitar chamadas repetitivas ao provedor de ambiente se já carregado
      let value: boolean | 'auto';
      if (provider instanceof EnvGateProvider) {
        if (this.envFlagCache === null) {
          this.envFlagCache = provider.getFlag();
        }
        value = this.envFlagCache;
      } else {
        value = provider.getFlag();
      }

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

    // Debouncing estabilizado para evitar re-renders excessivos em rajadas de eventos
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.listeners.forEach(l => l());
    }, 50);
  }
}

export const devInfraGate = new DevInfraGate();
