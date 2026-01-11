import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// TYPES
// ============================================================================

export interface OfflineIndicatorProps {
  position?: "top" | "bottom" | "top-right" | "bottom-right";
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
}

export interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export interface OfflineQueueIndicatorProps {
  pendingActions: number;
  onSync?: () => void;
  className?: string;
}

// ============================================================================
// HOOK: useOnlineStatus
// ============================================================================

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = React.useState(false);
  const [lastOnline, setLastOnline] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setLastOnline(new Date());
      // Auto-hide "back online" message after 3 seconds
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline, lastOnline };
}

// ============================================================================
// OFFLINE INDICATOR COMPONENT
// ============================================================================

export function OfflineIndicator({
  position = "bottom",
  showRetry = true,
  onRetry,
  className,
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Try to fetch a small resource to check connectivity
      await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
      onRetry?.();
    } catch {
      // Still offline
    }
    setIsRetrying(false);
  };

  const positionClasses = {
    top: "top-0 left-0 right-0",
    bottom: "bottom-0 left-0 right-0",
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
  };

  const isFullWidth = position === "top" || position === "bottom";

  return (
    <AnimatePresence>
      {/* Offline State */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: position.includes("top") ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position.includes("top") ? -20 : 20 }}
          className={cn(
            "fixed z-50",
            positionClasses[position],
            isFullWidth 
              ? "bg-destructive text-destructive-foreground px-4 py-3" 
              : "bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg",
            className
          )}
          role="alert"
          aria-live="assertive"
        >
          <div className={cn(
            "flex items-center gap-3",
            isFullWidth && "max-w-7xl mx-auto"
          )}>
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Você está offline</p>
              <p className="text-sm opacity-90">
                Verifique sua conexão com a internet
              </p>
            </div>
            {showRetry && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
                Tentar novamente
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Back Online State */}
      {isOnline && wasOffline && (
        <motion.div
          initial={{ opacity: 0, y: position.includes("top") ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position.includes("top") ? -20 : 20 }}
          className={cn(
            "fixed z-50",
            positionClasses[position],
            isFullWidth 
              ? "bg-green-600 text-white px-4 py-3" 
              : "bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg",
            className
          )}
          role="status"
          aria-live="polite"
        >
          <div className={cn(
            "flex items-center gap-3",
            isFullWidth && "max-w-7xl mx-auto"
          )}>
            <Wifi className="h-5 w-5 flex-shrink-0" />
            <p className="font-medium">Conexão restaurada!</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// CONNECTION STATUS BADGE
// ============================================================================

export function ConnectionStatus({ showDetails = false, className }: ConnectionStatusProps) {
  const { isOnline, lastOnline } = useOnlineStatus();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isOnline 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-destructive/10 text-destructive"
      )}>
        {isOnline ? (
          <>
            <Cloud className="h-3 w-3" />
            <span>Online</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
      </div>
      {showDetails && lastOnline && !isOnline && (
        <span className="text-xs text-muted-foreground">
          Última conexão: {lastOnline.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// OFFLINE QUEUE INDICATOR
// ============================================================================

export function OfflineQueueIndicator({
  pendingActions,
  onSync,
  className,
}: OfflineQueueIndicatorProps) {
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when coming back online
  React.useEffect(() => {
    if (isOnline && pendingActions > 0 && onSync) {
      handleSync();
    }
  }, [isOnline]);

  if (pendingActions === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg",
        className
      )}
      role="status"
    >
      <div className="relative">
        <CloudOff className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
          {pendingActions > 9 ? "9+" : pendingActions}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">
          {pendingActions} {pendingActions === 1 ? "ação pendente" : "ações pendentes"}
        </p>
        <p className="text-xs opacity-80">
          {isOnline ? "Sincronizando..." : "Será sincronizado quando online"}
        </p>
      </div>
      {isOnline && onSync && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSync}
          disabled={isSyncing}
          className="text-amber-800 hover:text-amber-900 hover:bg-amber-200"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        </Button>
      )}
    </motion.div>
  );
}

// ============================================================================
// WRAPPER FOR OFFLINE-AWARE COMPONENTS
// ============================================================================

export interface OfflineAwareProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showIndicator?: boolean;
}

export function OfflineAware({ children, fallback, showIndicator = true }: OfflineAwareProps) {
  const { isOnline } = useOnlineStatus();

  return (
    <>
      {showIndicator && <OfflineIndicator position="bottom" />}
      {isOnline ? children : fallback || children}
    </>
  );
}
