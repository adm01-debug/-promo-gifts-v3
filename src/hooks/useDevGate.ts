import { useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

/**
 * Hook customizado para encapsular a lógica de acesso ao Gate.
 * Reativo a mudanças de ambiente e configurações manuais (localStorage).
 */
export function useDevGate() {
  const { isDev } = useAuth();
  
  // Usamos useSyncExternalStore para reagir a mudanças no devInfraGate (ex: storage events)
  const isAllowed = useSyncExternalStore(
    (onStoreChange) => devInfraGate.subscribe(onStoreChange),
    () => devInfraGate.shouldShow(isDev),
    () => isDev // Fallback para SSR
  );

  return useMemo(() => ({
    isAllowed,
    isDev
  }), [isAllowed, isDev]);
}
