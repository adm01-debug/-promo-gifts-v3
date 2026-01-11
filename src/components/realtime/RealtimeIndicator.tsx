import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Radio, RefreshCw, Zap, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

export interface RealtimeIndicatorProps {
  status: ConnectionStatus;
  lastUpdate?: Date;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface LiveBadgeProps {
  isLive?: boolean;
  pulseColor?: string;
  className?: string;
}

export interface LastUpdatedProps {
  timestamp: Date;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onRefresh?: () => void;
  className?: string;
}

export interface SyncStatusProps {
  isSyncing: boolean;
  lastSynced?: Date;
  pendingChanges?: number;
  onSync?: () => void;
  className?: string;
}

// ============================================================================
// REALTIME CONNECTION INDICATOR
// ============================================================================

export function RealtimeIndicator({
  status,
  lastUpdate,
  showLabel = true,
  size = "md",
  className,
}: RealtimeIndicatorProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const statusConfig = {
    connected: {
      color: "bg-green-500",
      label: "Conectado",
      icon: CheckCircle2,
    },
    connecting: {
      color: "bg-yellow-500",
      label: "Conectando...",
      icon: RefreshCw,
    },
    disconnected: {
      color: "bg-gray-400",
      label: "Desconectado",
      icon: XCircle,
    },
    error: {
      color: "bg-red-500",
      label: "Erro de conexão",
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center">
        <span className={cn("rounded-full", sizeClasses[size], config.color)}>
          {status === "connected" && (
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-75",
                config.color
              )}
            />
          )}
        </span>
      </div>
      {showLabel && (
        <div className={cn("flex items-center gap-1.5", textSizes[size])}>
          {status === "connecting" && (
            <RefreshCw className="h-3 w-3 animate-spin" />
          )}
          <span className="text-muted-foreground">{config.label}</span>
          {lastUpdate && status === "connected" && (
            <span className="text-muted-foreground/70">
              · Atualizado {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LIVE BADGE
// ============================================================================

export function LiveBadge({ isLive = true, pulseColor = "bg-red-500", className }: LiveBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
        isLive ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-muted text-muted-foreground",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", pulseColor)} />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", isLive ? pulseColor : "bg-muted-foreground")} />
      </span>
      {isLive ? "AO VIVO" : "OFFLINE"}
    </div>
  );
}

// ============================================================================
// LAST UPDATED INDICATOR
// ============================================================================

export function LastUpdated({
  timestamp,
  autoRefresh = true,
  refreshInterval = 30000,
  onRefresh,
  className,
}: LastUpdatedProps) {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Auto-update the "time ago" text
  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(forceUpdate, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Clock className="h-4 w-4" />
      <span>
        Atualizado {formatDistanceToNow(timestamp, { addSuffix: true, locale: ptBR })}
      </span>
      {onRefresh && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="Atualizar agora"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SYNC STATUS
// ============================================================================

export function SyncStatus({
  isSyncing,
  lastSynced,
  pendingChanges = 0,
  onSync,
  className,
}: SyncStatusProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Sync Indicator */}
      <div className="flex items-center gap-1.5">
        {isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Sincronizando...</span>
          </>
        ) : pendingChanges > 0 ? (
          <>
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-600 dark:text-amber-400">
              {pendingChanges} alteração{pendingChanges > 1 ? "ões" : ""} pendente{pendingChanges > 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Sincronizado</span>
          </>
        )}
      </div>

      {/* Last Synced */}
      {lastSynced && !isSyncing && (
        <span className="text-xs text-muted-foreground">
          {format(lastSynced, "HH:mm", { locale: ptBR })}
        </span>
      )}

      {/* Manual Sync Button */}
      {onSync && pendingChanges > 0 && !isSyncing && (
        <button
          onClick={onSync}
          className="text-xs text-primary hover:underline"
        >
          Sincronizar agora
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ACTIVITY INDICATOR
// ============================================================================

export interface ActivityPulseProps {
  active?: boolean;
  label?: string;
  className?: string;
}

export function ActivityPulse({ active = true, label, className }: ActivityPulseProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        animate={active ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded-full",
          active ? "bg-primary/10" : "bg-muted"
        )}
      >
        <Activity className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
      </motion.div>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

// ============================================================================
// REALTIME DATA UPDATE FLASH
// ============================================================================

export interface DataUpdateFlashProps {
  children: React.ReactNode;
  trigger?: number | string; // Changes to this value trigger the flash
  duration?: number;
  className?: string;
}

export function DataUpdateFlash({
  children,
  trigger,
  duration = 1000,
  className,
}: DataUpdateFlashProps) {
  const [isFlashing, setIsFlashing] = React.useState(false);
  const prevTrigger = React.useRef(trigger);

  React.useEffect(() => {
    if (prevTrigger.current !== trigger && trigger !== undefined) {
      setIsFlashing(true);
      const timeout = setTimeout(() => setIsFlashing(false), duration);
      prevTrigger.current = trigger;
      return () => clearTimeout(timeout);
    }
  }, [trigger, duration]);

  return (
    <motion.div
      animate={isFlashing ? { backgroundColor: ["rgba(34, 197, 94, 0.2)", "transparent"] } : {}}
      transition={{ duration: duration / 1000 }}
      className={cn("rounded transition-colors", className)}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// STREAMING INDICATOR
// ============================================================================

export interface StreamingIndicatorProps {
  isStreaming?: boolean;
  bytesReceived?: number;
  className?: string;
}

export function StreamingIndicator({
  isStreaming = false,
  bytesReceived,
  className,
}: StreamingIndicatorProps) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <AnimatePresence>
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full",
            className
          )}
        >
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">Recebendo dados</span>
          {bytesReceived !== undefined && (
            <span className="text-xs text-primary/70">
              {formatBytes(bytesReceived)}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
