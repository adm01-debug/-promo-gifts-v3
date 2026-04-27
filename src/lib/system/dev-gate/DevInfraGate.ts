import { GateFlagProvider } from './types';
import { EnvGateProvider, LocalStorageGateProvider } from './providers';

/**
 * Motor principal do Gate de Infraestrutura Dev.
 * Centraliza a lógica de precedência (Chain of Responsibility).
 */
export class DevInfraGate {
  private providers: GateFlagProvider[];
  private cache: Map<string, boolean> = new Map();
  private listeners: Set<() => void> = new Set();
  private debounceTimer: number | null = null;

  constructor(providers?: GateFlagProvider[]) {
    this.providers = providers ?? [
      new EnvGateProvider(),
      new LocalStorageGateProvider()
    ];
    
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
   * Avalia se as mensagens devem ser exibidas.
   * Resultados são cacheados por parâmetro isDev para performance.
   */
  shouldShow(isDev: boolean): boolean {
    const cacheKey = String(isDev);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let result: boolean = isDev;
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

    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.listeners.forEach(l => l());
    }, 50); // 50ms de estabilização
  }
}

export const devInfraGate = new DevInfraGate();
