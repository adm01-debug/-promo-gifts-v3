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
  
  // Memoizamos a store evaluation para evitar re-renders se a lista de roles for igual
  const isAllowedStore = useSyncExternalStore(
    (onStoreChange) => devInfraGate.subscribe(onStoreChange),
    () => devInfraGate.shouldShow(roles),
    () => false // No servidor, sempre retorna false por segurança
  );

  // Só permitimos acesso se:
  // 1. O componente estiver montado no cliente (evita SSR mismatch)
  // 2. O AuthContext não estiver mais carregando (evita flash antes da role carregar)
  // 3. O gate de infraestrutura autorizar
  const isAllowed = mounted && !isLoading && isAllowedStore;

  return useMemo(() => ({
    isAllowed,
    isDev: mounted && isDev
  }), [isAllowed, isDev, mounted, isLoading]);
}
