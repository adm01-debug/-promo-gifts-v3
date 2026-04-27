/**
 * Banner global de status do external-db-bridge.
 *
 * Escuta o event bus de bridge-status-events e exibe avisos contextuais.
 * Restrito ao gate de infra dev para evitar vazamento de mensagens técnicas em prod.
 */
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onBridgeStatus, type BridgeStatusEvent } from '@/lib/external-db/bridge-status-events';
import { useDevGate } from '@/hooks/useDevGate';

const TOAST_ID_DEGRADED = 'bridge-degraded';
const TOAST_ID_UNAVAILABLE = 'bridge-unavailable';

export function BridgeStatusBanner() {
  const { isAllowed } = useDevGate();
  const [unavailable, setUnavailable] = useState(false);
  const [reason, setReason] = useState<string>('');
  const lastDegradedAt = useRef(0);

  useEffect(() => {
    const unsubscribe = onBridgeStatus((e: BridgeStatusEvent) => {
      if (e.type === 'degraded') {
        // Toasts de "degraded" (reconectando) são mensagens de infra, mostramos apenas para devs.
        if (!isAllowed) return;

        const now = Date.now();
        if (now - lastDegradedAt.current < 8000) return;
        lastDegradedAt.current = now;
        
        toast.loading('Reconectando ao catálogo externo…', {
          id: TOAST_ID_DEGRADED,
          description: `Tentativa ${e.attempt}/${e.maxAttempts}. O sistema está se recuperando automaticamente.`,
          duration: 4000,
        });
      } else if (e.type === 'unavailable') {
        setUnavailable(true);
        setReason(e.reason);
        toast.dismiss(TOAST_ID_DEGRADED);
        
        // Se não for dev, usamos uma mensagem menos técnica.
        const title = 'Catálogo temporariamente indisponível';
        const description = isAllowed 
          ? 'O serviço está reiniciando. Aguarde alguns segundos e tente novamente.'
          : 'Estamos com uma instabilidade momentânea no acesso ao catálogo. Tente recarregar a página em instantes.';

        toast.error(title, {
          id: TOAST_ID_UNAVAILABLE,
          description,
          duration: 10000,
          action: {
            label: 'Recarregar',
            onClick: () => window.location.reload(),
          },
        });
      } else if (e.type === 'recovered') {
        toast.dismiss(TOAST_ID_DEGRADED);
        if (unavailable) {
          toast.success('Conexão restabelecida', {
            id: TOAST_ID_UNAVAILABLE,
            description: 'O catálogo voltou a responder normalmente.',
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
  }, [isAllowed]); // Removido 'unavailable' das dependências para evitar re-subscrição desnecessária

  if (!unavailable) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-destructive text-destructive-foreground shadow-md"
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <span className="font-medium">Catálogo externo indisponível.</span>{' '}
            <span className="opacity-90 hidden sm:inline">
              Tentativas automáticas esgotadas. Aguarde alguns segundos enquanto o serviço reinicia, ou recarregue a página.
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
    </div>
  );
}
