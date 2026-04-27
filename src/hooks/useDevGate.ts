import { useMemo, useSyncExternalStore, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

/**
 * Hook customizado para encapsular a lógica de acesso ao Gate.
 * Reativo a mudanças de ambiente e configurações manuais (localStorage).
 * Garante que nada seja exibido até que o componente seja montado no cliente.
 */
export function useDevGate() {
  const { roles, isDev, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Otimização: Estabilizamos a referência das roles se o conteúdo for idêntico
  const stableRoles = useMemo(() => roles, [roles.join(',')]);

  const isAllowedStore = useSyncExternalStore(
    (onStoreChange) => devInfraGate.subscribe(onStoreChange),
    () => devInfraGate.shouldShow(stableRoles),
    () => false
  );

  const isAllowed = mounted && !isLoading && isAllowedStore;
  const isDevFinal = mounted && isDev;

  return useMemo(() => ({
    isAllowed,
    isDev: isDevFinal
  }), [isAllowed, isDevFinal]);
}
