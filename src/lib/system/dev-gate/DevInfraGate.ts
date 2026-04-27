import { GateFlagProvider } from './types';
import { EnvGateProvider, LocalStorageGateProvider } from './providers';

/**
 * Motor principal do Gate de Infraestrutura Dev.
 * Centraliza a lógica de precedência (Chain of Responsibility).
 */
export class DevInfraGate {
  private providers: GateFlagProvider[];
  private cache: Map<string, boolean> = new Map();

  constructor(providers?: GateFlagProvider[]) {
    this.providers = providers ?? [
      new EnvGateProvider(),
      new LocalStorageGateProvider()
    ];
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
   */
  invalidateCache(): void {
    this.cache.clear();
  }
}

export const devInfraGate = new DevInfraGate();
