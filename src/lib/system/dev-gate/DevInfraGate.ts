import { GateFlagProvider, GateValue } from './types';
import { EnvGateProvider, LocalStorageGateProvider } from './providers';
import type { AppRole } from '@/contexts/AuthContext';

/**
 * Roles que possuem permissão intrínseca para acessar ferramentas de infraestrutura.
 */
export const DEFAULT_ALLOWED_ROLES: AppRole[] = ['dev', 'supervisor', 'admin'];

/**
 * Interface que define a política de acesso baseada em roles.
 * SRP: Define apenas o contrato de verificação de permissão.
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
 * - SRP: Gerenciamento de estado, cache e notificações do Gate.
 * - OCP: Extensível via injeção de Providers ou AccessPolicies.
 * - DIP: Depende de abstrações (GateFlagProvider, AccessPolicy).
 * - LSP: DefaultAccessPolicy pode ser substituída por qualquer AccessPolicy.
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

  /**
   * Handler nomeado para facilitar remoção futura e melhorar legibilidade.
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    const relevantKeys = ['show_dev_infra_messages', 'lov:bridge-metrics-overlay:open'];
    if (event.key && relevantKeys.includes(event.key)) {
      this.invalidateCache();
    }
  };

  /**
   * Registra um listener para mudanças de estado no Gate.
   * Retorna uma função de limpeza (unsubscribe).
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Verifica permissão delegando para a política injetada.
   */
  hasAccess(userRoles: AppRole[]): boolean {
    return this.accessPolicy.hasAccess(userRoles);
  }

  /**
   * Determina se o overlay deve ser exibido.
   * Centraliza a lógica de permissões, cache e precedência de providers.
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

  /**
   * Gera uma chave de cache otimizada para performance.
   */
  private generateCacheKey(roles: AppRole[]): string {
    if (roles.length === 1) return roles[0];
    return [...roles].sort().join(',');
  }

  /**
   * Avalia a cadeia de provedores seguindo o padrão Chain of Responsibility.
   */
  private evaluateProviders(): boolean {
    // Valor padrão caso nenhum provider decida (auto)
    let decision = true; 

    for (const provider of this.providers) {
      const value = this.getProviderValue(provider);
      if (value !== 'auto') {
        decision = value;
        break;
      }
    }

    return decision;
  }

  /**
   * Obtém valor do provider com otimização específica para ambiente.
   */
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
   * Limpa o cache e agenda a notificação dos inscritos.
   */
  invalidateCache(): void {
    this.cache.clear();
    this.scheduleNotification();
  }

  /**
   * Implementa debouncing para evitar excesso de renders na UI.
   */
  private scheduleNotification(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.listeners.forEach(listener => listener());
    }, 50);
  }
}

export const devInfraGate = new DevInfraGate();
