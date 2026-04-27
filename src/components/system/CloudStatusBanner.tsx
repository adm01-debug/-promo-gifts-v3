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
import { DevInfraDetails, formatMs, formatRelative } from './DevInfraDetails';

type CloudStatusVariant = 'warming' | 'degraded' | 'down';

export function CloudStatusBanner() {
  const { isDev } = useAuth();
  const { status, snapshot, retry, isChecking } = useCloudStatus();
  // Mensagens técnicas de infraestrutura passam pelo gate SSOT
  // (env VITE_SHOW_DEV_INFRA_MESSAGES > localStorage > role dev).
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
          <div className="container mx-auto flex flex-col gap-1.5 px-4 py-2 text-sm">
            <div className="flex items-center gap-3">
              {renderIcon(status)}
              <span className="flex-1">{getMessage(status, isDev)}</span>
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
            {/* Modo dev: detalhes técnicos colapsáveis */}
            {isDev && snapshot && (
              <DevInfraDetails
                title={`Cloud snapshot · ${status}`}
                items={[
                  { label: 'status', value: status, tone: status === 'down' ? 'error' : status === 'degraded' ? 'warn' : 'default' },
                  { label: 'checkedAt', value: formatRelative(snapshot.checkedAt) },
                  {
                    label: 'auth',
                    value: `${snapshot.signals.auth.ok ? 'ok' : 'fail'} · ${formatMs(snapshot.signals.auth.ms)}`,
                    tone: snapshot.signals.auth.ok ? 'default' : 'error',
                  },
                  {
                    label: 'bridge',
                    value: `${snapshot.signals.bridge.ok ? 'ok' : 'fail'} · ${formatMs(snapshot.signals.bridge.ms)}`,
                    tone: snapshot.signals.bridge.ok ? 'default' : 'error',
                  },
                  {
                    label: 'rest',
                    value: `${snapshot.signals.rest.ok ? 'ok' : 'fail'} · ${formatMs(snapshot.signals.rest.ms)}`,
                    tone: snapshot.signals.rest.ok ? 'default' : 'error',
                  },
                  { label: 'isChecking', value: isChecking ? 'true' : 'false' },
                ]}
              />
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

function getMessage(status: 'warming' | 'degraded' | 'down' | string, isDev: boolean): string {
  // Devs recebem texto mais técnico ("estado X detectado…"); usuários comuns,
  // quando habilitados via env, veem o texto amigável padrão.
  if (status === 'down') {
    return isDev
      ? '[dev] backend = down — auth/bridge/rest sem resposta. Probe a cada 5s; auto-stop após 30s.'
      : 'Backend indisponível. Verifique sua conexão e tente novamente.';
  }
  if (status === 'degraded') {
    return isDev
      ? '[dev] backend = degraded — alta latência ou falhas parciais. Backoff 5s/10s/15s.'
      : 'Backend instável — algumas operações podem falhar momentaneamente.';
  }
  return isDev
    ? '[dev] backend = warming — cold-start em curso, repolling automático.'
    : 'Backend reiniciando, aguarde alguns segundos…';
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
