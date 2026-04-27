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
  // O uso de useSyncExternalStore já garante consistência externa
  const isAllowedStore = useSyncExternalStore(
    (onStoreChange) => devInfraGate.subscribe(onStoreChange),
    () => devInfraGate.shouldShow(roles),
    () => false
  );

  // Otimização de UI: Calculamos o estado final e memoizamos o objeto de retorno
  // para evitar que hooks dependentes do useDevGate re-renderizem se o resultado for o mesmo.
  // Note que isLoading e mounted mudam pouco, o gargalo costumava ser o processamento das roles.
  const isAllowed = mounted && !isLoading && isAllowedStore;
  const isDevFinal = mounted && isDev;

  return useMemo(() => ({
    isAllowed,
    isDev: isDevFinal
  }), [isAllowed, isDevFinal]);
}
