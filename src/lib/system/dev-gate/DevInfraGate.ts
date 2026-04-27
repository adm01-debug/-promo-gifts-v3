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
  private debounceTimer: number | null = null;
  private allowedRoles: AppRole[];

  constructor(providers?: GateFlagProvider[], allowedRoles: AppRole[] = ALLOWED_INFRA_ROLES) {
    this.providers = providers ?? [
      new EnvGateProvider(),
      new LocalStorageGateProvider()
    ];
    this.allowedRoles = allowedRoles;
    
    // Invalida cache e notifica ouvintes se houver mudança no localStorage
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'show_dev_infra_messages' || e.key === 'lov:bridge-metrics-overlay:open') {
          this.invalidateCache();
        }
      });
    }
  }

  /**
   * Inscreve um ouvinte para mudanças no estado do gate.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Verifica se o conjunto de roles do usuário permite acesso.
   */
  hasAccess(userRoles: AppRole[]): boolean {
    if (!userRoles || userRoles.length === 0) return false;
    return userRoles.some(role => this.allowedRoles.includes(role));
  }

  /**
   * Avalia se as mensagens devem ser exibidas.
   * O parâmetro userRoles é o GATE REAL: se não houver role permitida, NUNCA exibe nada.
   */
  shouldShow(userRoles: AppRole[]): boolean {
    // SECURITY GATE: Se o usuário não possui uma role permitida, bloqueia imediatamente.
    if (!this.hasAccess(userRoles)) return false;

    const cacheKey = userRoles.sort().join(',');
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Se tiver permissão, permitimos que os providers (env/localStorage)
    // sobrescrevam o comportamento padrão se necessário.
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

  /**
   * Invalida o cache (ex: quando o dev altera o localStorage).
   * Implementa debounce para evitar re-render excessivo em mudanças rápidas.
   */
  invalidateCache(): void {
    this.cache.clear();
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (typeof window !== 'undefined') {
      this.debounceTimer = window.setTimeout(() => {
        this.debounceTimer = null;
        this.listeners.forEach(l => l());
      }, 50); // 50ms de estabilização
    }
  }
}

export const devInfraGate = new DevInfraGate();
