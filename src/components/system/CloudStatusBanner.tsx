import { memo } from 'react';
import { AlertTriangle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCloudStatus } from '@/hooks/useCloudStatus';
import { useDevGate } from '@/hooks/useDevGate';

type CloudStatusVariant = 'warming' | 'degraded' | 'down';

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
    message: 'Backend reiniciando, aguarde alguns segundos…',
    icon: Loader2,
    className: 'bg-muted text-muted-foreground border-border'
  }
};

export const CloudStatusBanner = memo(function CloudStatusBanner() {
  const { isAllowed } = useDevGate();
  const { status, retry, isChecking } = useCloudStatus();
  
  const config = status ? STATUS_CONFIG[status] : null;
  
  // Apenas a mensagem de "warming" (reiniciando) é considerada estritamente técnica/infra.
  // Estados de "down" ou "degraded" são falhas críticas que devem ser mostradas a todos os usuários.
  const isTechnicalMessage = status === 'warming';
  const visible = config && (isTechnicalMessage ? isAllowed : true);

  if (!visible || !config) return null;

  const Icon = config.icon;

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
        className={`sticky top-0 z-50 w-full border-b ${config.className}`}
      >
        <div className="container mx-auto flex items-center gap-3 px-4 py-2 text-sm">
          <Icon className={`h-4 w-4 shrink-0 ${status === 'warming' ? 'animate-spin' : ''}`} aria-hidden />
          <span className="flex-1">{config.message}</span>
          
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
    </AnimatePresence>
  );
});
