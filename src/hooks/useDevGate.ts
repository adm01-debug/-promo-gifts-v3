import { useAuth } from '@/contexts/AuthContext';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

/**
 * Hook customizado para encapsular a lógica de acesso ao Gate.
 * Simplifica o uso nos componentes e facilita testes.
 */
export function useDevGate() {
  const { isDev } = useAuth();
  
  return {
    isAllowed: devInfraGate.shouldShow(isDev),
    isDev
  };
}
