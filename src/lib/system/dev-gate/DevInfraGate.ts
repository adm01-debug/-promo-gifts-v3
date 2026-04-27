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
import { GateFlagProvider, GateValue } from './types';
import { EnvGateProvider, LocalStorageGateProvider } from './providers';
import type { AppRole } from '@/contexts/AuthContext';

/**
 * Roles que possuem permissão intrínseca para acessar ferramentas de infraestrutura.
 */
export const DEFAULT_ALLOWED_ROLES: AppRole[] = ['dev', 'supervisor', 'admin'];

/**
 * Interface que define a política de acesso baseada em roles.
 */
export interface AccessPolicy {
  hasAccess(roles: AppRole[]): boolean;
}

/**
 * Implementação padrão de política de acesso baseada em Set (O(1)).
 */
class DefaultAccessPolicy implements AccessPolicy {
  private readonly allowedRoles: Set<AppRole>;

  constructor(allowedRoles: AppRole[]) {
    this.allowedRoles = new Set(allowedRoles);
  }

  hasAccess(userRoles: AppRole[]): boolean {
    if (!userRoles || userRoles.length === 0) return false;
    return userRoles.some(role => this.allowedRoles.has(role));
  }
}

/**
 * Motor principal do Gate de Infraestrutura Dev.
 * Aplica SOLID:
 * - SRP: Gerenciamento de estado e cache do Gate.
 * - OCP: Extensível via novos Providers ou AccessPolicies.
 * - DIP: Depende de interfaces (GateFlagProvider, AccessPolicy).
 */
export class DevInfraGate {
  private readonly providers: GateFlagProvider[];
  private readonly accessPolicy: AccessPolicy;
  private readonly cache: Map<string, boolean> = new Map();
  private readonly listeners: Set<() => void> = new Set();
  
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private envFlagCache: GateValue | null = null;

  constructor(
    providers?: GateFlagProvider[], 
    accessPolicy?: AccessPolicy
  ) {
    this.providers = providers ?? [
      new EnvGateProvider(),
      new LocalStorageGateProvider()
    ];
    this.accessPolicy = accessPolicy ?? new DefaultAccessPolicy(DEFAULT_ALLOWED_ROLES);
    
    this.setupStorageListener();
  }

  private setupStorageListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', this.handleStorageEvent);
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    const relevantKeys = ['show_dev_infra_messages', 'lov:bridge-metrics-overlay:open'];
    if (event.key && relevantKeys.includes(event.key)) {
      this.invalidateCache();
    }
  };

  /**
   * Registra um listener para mudanças de estado no Gate.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Verifica se o usuário tem permissão baseada na política de acesso.
   */
  hasAccess(userRoles: AppRole[]): boolean {
    return this.accessPolicy.hasAccess(userRoles);
  }

  /**
   * Determina se o overlay deve ser exibido, considerando permissões e overrides.
   */
  shouldShow(userRoles: AppRole[]): boolean {
    if (!this.hasAccess(userRoles)) return false;

    const cacheKey = this.generateCacheKey(userRoles);
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult !== undefined) return cachedResult;

    const finalResult = this.evaluateProviders();
    this.cache.set(cacheKey, finalResult);
    
    return finalResult;
  }

  private generateCacheKey(roles: AppRole[]): string {
    if (roles.length === 1) return roles[0];
    return [...roles].sort().join(',');
  }

  private evaluateProviders(): boolean {
    let result = true; // Default behavior

    for (const provider of this.providers) {
      const value = this.getProviderValue(provider);
      if (value !== 'auto') {
        result = value;
        break;
      }
    }

    return result;
  }

  private getProviderValue(provider: GateFlagProvider): GateValue {
    if (provider instanceof EnvGateProvider) {
      if (this.envFlagCache === null) {
        this.envFlagCache = provider.getFlag();
      }
      return this.envFlagCache;
    }
    return provider.getFlag();
  }

  /**
   * Invalida o cache e notifica os inscritos com debounce.
   */
  invalidateCache(): void {
    this.cache.clear();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.listeners.forEach(listener => listener());
    }, 50);
  }
}

export const devInfraGate = new DevInfraGate();

export const devInfraGate = new DevInfraGate();
