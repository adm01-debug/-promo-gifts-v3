import { memo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, WifiOff, Info, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCloudStatus } from '@/hooks/useCloudStatus';
import { useDevGate } from '@/hooks/useDevGate';
import { getStatusTimeline } from '@/lib/cloud-status';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { message: string; icon: any; className: string }> = {
  down: {
    message: 'Backend indisponível. Verifique sua conexão e tente novamente.',
    icon: WifiOff,
    className: 'bg-destructive text-destructive-foreground border-destructive/40'
  },
  degraded: {
    message: 'Backend instável — algumas operações podem falhar momentaneamente.',
    icon: AlertTriangle,
    className: 'bg-warning text-warning-foreground border-warning/40'
  },
  warming: {
    message: 'Backend inicializando parcialmente — algumas operações podem demorar alguns segundos.',
    icon: Loader2,
    className: 'bg-muted text-muted-foreground border-border'
  }
};

export const CloudStatusBanner = memo(function CloudStatusBanner() {
  const { isDev } = useDevGate();
  const { status, snapshot, retry, isChecking } = useCloudStatus();
  const [showDebug, setShowDebug] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  
  const config = status ? STATUS_CONFIG[status] : null;
  
  // No-op if nothing to show
  if (!config && !isDev) return null;

  // Lógica de visibilidade desacoplada:
  // Mensagens técnicas (warming) aparecem APENAS para usuários com role "dev".
  // Mensagens críticas (down/degraded) aparecem para todos.
  const isTechnical = status === 'warming';
  const shouldShow = isTechnical ? isDev : (status && status !== 'healthy');

  // If we are dev, we might want to see the debug toggle even if healthy
  if (!shouldShow && !isDev) return null;

  const timeline = getStatusTimeline();

  const Icon = config?.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={status}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="status"
        aria-live="polite"
        className={cn(
          "sticky top-0 z-50 w-full border-b safe-area-top shadow-md transition-colors duration-500",
          config?.className || "bg-card text-foreground border-border"
        )}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
            <div className="flex items-start sm:items-center gap-3 flex-1">
              {config && (
                <>
                  <Icon className={cn("h-4 w-4 shrink-0 mt-0.5 sm:mt-0", status === 'warming' && "animate-spin")} aria-hidden />
                  <span className="flex-1 leading-tight font-medium">{config.message}</span>
                </>
              )}
              {!config && isDev && (
                <span className="text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Cloud Healthy (Dev Mode)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isDev && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowTimeline(!showTimeline)}
                    title="Ver histórico"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowDebug(!showDebug)}
                    title="Debug Latência"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {status === 'down' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void retry()}
                  disabled={isChecking}
                  className="h-7 gap-1.5"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
                  Tentar novamente
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showDebug && snapshot && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="pt-2 mt-2 border-t border-current/10 grid grid-cols-3 gap-4 text-xs font-mono"
              >
                {[
                  { label: 'AUTH', signal: snapshot.signals.auth },
                  { label: 'BRIDGE', signal: snapshot.signals.bridge },
                  { label: 'REST', signal: snapshot.signals.rest }
                ].map(({ label, signal }) => (
                  <div key={label} className="flex items-center gap-2">
                    {signal.ok ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                    <span>{label}: {signal.ms}ms</span>
                  </div>
                ))}
              </motion.div>
            )}

            {showTimeline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="pt-2 mt-2 border-t border-current/10 max-h-40 overflow-y-auto"
              >
                <div className="flex flex-col gap-1">
                  {timeline.slice().reverse().map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] opacity-80 font-mono">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          entry.status === 'healthy' ? "bg-green-500" : 
                          entry.status === 'down' ? "bg-red-500" : "bg-yellow-500"
                        )} />
                        <span>{entry.status.toUpperCase()}</span>
                        {entry.consecutiveFailures > 0 && (
                          <span className="text-red-400">({entry.consecutiveFailures} falhas)</span>
                        )}
                      </div>
                      <span className="text-muted-foreground italic">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <div className="text-center py-2 text-muted-foreground text-[10px]">Sem histórico disponível.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
