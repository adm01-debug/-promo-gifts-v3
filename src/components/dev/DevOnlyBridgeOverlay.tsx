/**
 * Wrapper que monta o BridgeMetricsOverlay APENAS quando o gate SSOT
 * `shouldShowDevInfraMessages(isDev)` aprova:
 *   1. VITE_SHOW_DEV_INFRA_MESSAGES (build-time)
 *   2. localStorage.show_dev_infra_messages (runtime)
 *   3. role `dev` do usuário autenticado
 *
 * O `lazy()` só dispara o import do overlay depois que o gate aprova,
 * então usuários comuns NUNCA baixam o chunk do painel técnico.
 * Em build de produção, o próprio overlay retorna null no topo.
 */
import { Suspense, lazy } from 'react';
import { useDevGate } from '@/hooks/useDevGate';

const Overlay = lazy(() => import('./BridgeMetricsOverlay'));

export function DevOnlyBridgeOverlay() {
  const { isDev } = useAuth();
  if (!shouldShowDevInfraMessages(isDev)) return null;
  return (
    <Suspense fallback={null}>
      <Overlay />
    </Suspense>
  );
}
