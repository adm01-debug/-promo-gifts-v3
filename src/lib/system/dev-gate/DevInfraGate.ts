import { GateFlagProvider } from './types';
import { EnvGateProvider, LocalStorageGateProvider } from './providers';

/**
 * Motor principal do Gate de Infraestrutura Dev.
 * Centraliza a lógica de precedência (Chain of Responsibility).
 */
export class DevInfraGate {
  private providers: GateFlagProvider[];

  constructor(providers?: GateFlagProvider[]) {
    this.providers = providers ?? [
      new EnvGateProvider(),
      new LocalStorageGateProvider()
    ];
  }

  /**
   * Avalia se as mensagens devem ser exibidas.
   */
  shouldShow(isDev: boolean): boolean {
    for (const provider of this.providers) {
      const value = provider.getFlag();
      if (value !== 'auto') return value;
    }
    return Boolean(isDev);
  }
}

// Instância singleton para uso em toda a aplicação
export const devInfraGate = new DevInfraGate();
