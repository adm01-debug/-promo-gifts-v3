/**
 * Banner global de status do external-db-bridge.
 *
 * Escuta o event bus de bridge-status-events e:
 *  - `degraded`: toast informativo discreto (sonner) — retry em andamento.
 *  - `unavailable`: banner sticky + toast de erro com call-to-action.
 *  - `recovered`: dismissa o banner e mostra toast de sucesso.
 *
 * Não bloqueia a UI; permite o usuário tentar novamente manualmente.
 */
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onBridgeStatus, type BridgeStatusEvent } from '@/lib/external-db/bridge-status-events';
import { useAuth } from '@/contexts/AuthContext';
import { shouldShowDevInfraMessages } from '@/lib/system/dev-infra-messages';
import { DevInfraDetails, formatMs, formatRelative } from './system/DevInfraDetails';

const TOAST_ID_DEGRADED = 'bridge-degraded';
const TOAST_ID_UNAVAILABLE = 'bridge-unavailable';

interface BridgeDevState {
  /** Último evento recebido (qualquer tipo) — útil para inspeção dev. */
  lastEvent: BridgeStatusEvent | null;
  lastEventAt: number | null;
  /** Contador acumulado por tipo desde o boot. */
  counts: { degraded: number; unavailable: number; recovered: number };
}

const INITIAL_DEV_STATE: BridgeDevState = {
  lastEvent: null,
  lastEventAt: null,
  counts: { degraded: 0, unavailable: 0, recovered: 0 },
};

export function BridgeStatusBanner() {
  const { isDev } = useAuth();
  const allowed = shouldShowDevInfraMessages(isDev);
  const [unavailable, setUnavailable] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [devState, setDevState] = useState<BridgeDevState>(INITIAL_DEV_STATE);
  const lastDegradedAt = useRef(0);

  useEffect(() => {
    // Gate SSOT: env VITE_SHOW_DEV_INFRA_MESSAGES > localStorage > role dev.
    // Usuários sem permissão nem registram o listener — zero toast disparado.
    if (!allowed) return;
    const unsubscribe = onBridgeStatus((e: BridgeStatusEvent) => {
      // Acumula histórico para o painel dev (sempre, mesmo em throttle de toast).
      setDevState((prev) => ({
        lastEvent: e,
        lastEventAt: Date.now(),
        counts: {
          ...prev.counts,
          [e.type]: prev.counts[e.type] + 1,
        },
      }));

      if (e.type === 'degraded') {
        // Throttle: 1 toast a cada 8s (várias chamadas paralelas geram muitos eventos).
        const now = Date.now();
        if (now - lastDegradedAt.current < 8000) return;
        lastDegradedAt.current = now;
        const baseMsg = isDev
          ? `[dev] bridge degraded · tentativa ${e.attempt}/${e.maxAttempts} · backoff ${formatMs(e.delayMs)}`
          : 'Reconectando ao catálogo externo…';
        toast.loading(baseMsg, {
          id: TOAST_ID_DEGRADED,
          description: isDev
            ? `reason: ${e.reason}${e.baseDelayMs != null ? ` · base=${formatMs(e.baseDelayMs)} jitter=${formatMs(e.jitterMs ?? 0)}` : ''}`
            : `Tentativa ${e.attempt}/${e.maxAttempts}. O sistema está se recuperando automaticamente.`,
          duration: 4000,
        });
      } else if (e.type === 'unavailable') {
        setUnavailable(true);
        setReason(e.reason);
        toast.dismiss(TOAST_ID_DEGRADED);
        toast.error(
          isDev ? `[dev] bridge unavailable · ${e.attempts} tentativas` : 'Catálogo externo indisponível',
          {
            id: TOAST_ID_UNAVAILABLE,
            description: isDev
              ? `reason: ${e.reason}`
              : 'O serviço está reiniciando. Aguarde alguns segundos e tente novamente.',
            duration: 10000,
            action: {
              label: 'Recarregar',
              onClick: () => window.location.reload(),
            },
          },
        );
      } else if (e.type === 'recovered') {
        toast.dismiss(TOAST_ID_DEGRADED);
        if (unavailable) {
          toast.success(isDev ? '[dev] bridge recovered' : 'Conexão restabelecida', {
            id: TOAST_ID_UNAVAILABLE,
            description: isDev
              ? 'Listener voltou a receber 200 do external-db-bridge.'
              : 'O catálogo voltou a responder normalmente.',
            duration: 4000,
          });
          setUnavailable(false);
          setReason('');
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [unavailable, allowed, isDev]);

  if (!allowed || !unavailable) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-destructive text-destructive-foreground shadow-md"
    >
      <div className="container mx-auto px-4 py-2 flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <span className="font-medium">
                {isDev ? '[dev] external-db-bridge unavailable.' : 'Catálogo externo indisponível.'}
              </span>{' '}
              <span className="opacity-90 hidden sm:inline">
                {isDev
                  ? 'Retries esgotados — aguardando reset manual ou recovered.'
                  : 'Tentativas automáticas esgotadas. Aguarde alguns segundos enquanto o serviço reinicia, ou recarregue a página.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1.5"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Recarregar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive-foreground hover:bg-destructive-foreground/10"
              onClick={() => setUnavailable(false)}
              aria-label="Fechar aviso"
              title={reason}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </div>
        {/* Modo dev: detalhes técnicos colapsáveis */}
        {isDev && (
          <DevInfraDetails
            title="Bridge events (dev)"
            items={[
              {
                label: 'lastEvent',
                value: devState.lastEvent
                  ? `${devState.lastEvent.type}${devState.lastEventAt ? ` · ${formatRelative(devState.lastEventAt)}` : ''}`
                  : '—',
                tone: devState.lastEvent?.type === 'unavailable' ? 'error' : devState.lastEvent?.type === 'degraded' ? 'warn' : 'default',
              },
              { label: 'degraded', value: String(devState.counts.degraded) },
              { label: 'unavailable', value: String(devState.counts.unavailable) },
              { label: 'recovered', value: String(devState.counts.recovered) },
              ...(devState.lastEvent?.type === 'degraded'
                ? [
                    { label: 'attempt', value: `${devState.lastEvent.attempt}/${devState.lastEvent.maxAttempts}` },
                    { label: 'delay', value: formatMs(devState.lastEvent.delayMs) },
                  ]
                : []),
              ...(devState.lastEvent?.type === 'unavailable'
                ? [{ label: 'attempts', value: String(devState.lastEvent.attempts), tone: 'error' as const }]
                : []),
            ]}
            note={reason ? `reason: ${reason}` : undefined}
          />
        )}
      </div>
    </div>
  );
}
