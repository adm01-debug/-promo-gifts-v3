/**
 * Banner global de status do Lovable Cloud.
 *
 * Exibe feedback discreto quando o backend não está totalmente saudável:
 *   - `warming`  → info: backend reiniciando
 *   - `degraded` → warning: instável
 *   - `down`     → destrutivo + ação "Tentar novamente"
 *
 * Usa tokens semânticos (sem cores hardcoded) e respeita o design system.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCloudStatus } from '@/hooks/useCloudStatus';
import { useAuth } from '@/contexts/AuthContext';
import { shouldShowDevInfraMessages } from '@/lib/system/dev-infra-messages';

type CloudStatusVariant = 'warming' | 'degraded' | 'down';

export function CloudStatusBanner() {
  const { isDev } = useAuth();
  const { status, retry, isChecking } = useCloudStatus();
  // Mensagens técnicas de infraestrutura ficam restritas via gate SSOT:
  //   VITE_SHOW_DEV_INFRA_MESSAGES > localStorage.show_dev_infra_messages > role `dev`.
  // Em produção, defina o env como `false` para garantir que nenhum usuário
  // (nem devs) veja banners de reinício/instabilidade do backend.
  const allowed = shouldShowDevInfraMessages(isDev);
  const visible =
    allowed && (status === 'warming' || status === 'degraded' || status === 'down');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={status}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className={getContainerClass(status)}
        >
          <div className="container mx-auto flex items-center gap-3 px-4 py-2 text-sm">
            {renderIcon(status)}
            <span className="flex-1">{getMessage(status)}</span>
            {status === 'down' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void retry()}
                disabled={isChecking}
                className="h-7 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                Tentar novamente
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getContainerClass(status: 'warming' | 'degraded' | 'down' | string): string {
  const base = 'sticky top-0 z-50 w-full border-b';
  if (status === 'down') return `${base} bg-destructive text-destructive-foreground border-destructive/40`;
  if (status === 'degraded') return `${base} bg-warning text-warning-foreground border-warning/40`;
  return `${base} bg-muted text-muted-foreground border-border`;
}

function getMessage(status: 'warming' | 'degraded' | 'down' | string): string {
  if (status === 'down') return 'Backend indisponível. Verifique sua conexão e tente novamente.';
  if (status === 'degraded') return 'Backend instável — algumas operações podem falhar momentaneamente.';
  return 'Backend reiniciando, aguarde alguns segundos…';
}

/**
 * Renderiza o ícone correto sem criar um function component intermediário
 * (lucide-react já é forwardRef, então deixamos o ref fluir naturalmente
 * caso framer-motion / motion.div o injete em descendentes).
 */
function renderIcon(status: CloudStatusVariant | string) {
  if (status === 'down') return <WifiOff className="h-4 w-4 shrink-0" aria-hidden />;
  if (status === 'degraded') return <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />;
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />;
}
