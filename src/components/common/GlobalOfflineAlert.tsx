import { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

/**
 * Global component to detect and display browser-level offline status.
 */
export function GlobalOfflineAlert() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-6 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      >
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-destructive p-4 text-destructive-foreground shadow-2xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <WifiOff className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Você está offline</p>
            <p className="truncate text-xs opacity-90">
              Algumas funcionalidades podem não estar disponíveis.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-white hover:bg-white/10"
                onClick={() => setDismissed(true)}
                aria-label="Dispensar aviso de offline"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground">
              Dispensar alerta
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
