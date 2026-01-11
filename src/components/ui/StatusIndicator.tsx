import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, X, AlertTriangle, Clock, Loader2, Circle, Pause, Play } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const statusIndicatorVariants = cva(
  "inline-flex items-center gap-2 font-medium",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
);

const dotVariants = cva(
  "rounded-full flex-shrink-0",
  {
    variants: {
      size: {
        xs: "w-1.5 h-1.5",
        sm: "w-2 h-2",
        md: "w-2.5 h-2.5",
        lg: "w-3 h-3",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
);

const iconVariants = cva(
  "flex-shrink-0",
  {
    variants: {
      size: {
        xs: "w-3 h-3",
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
);

type StatusType = 
  | "success" 
  | "error" 
  | "warning" 
  | "info" 
  | "pending" 
  | "loading" 
  | "paused"
  | "active"
  | "inactive"
  | "draft"
  | "published";

interface StatusIndicatorProps extends VariantProps<typeof statusIndicatorVariants> {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, {
  icon: React.ElementType;
  dotColor: string;
  textColor: string;
  iconColor: string;
  label: string;
}> = {
  success: {
    icon: Check,
    dotColor: "bg-success",
    textColor: "text-success",
    iconColor: "text-success",
    label: "Sucesso",
  },
  error: {
    icon: X,
    dotColor: "bg-destructive",
    textColor: "text-destructive",
    iconColor: "text-destructive",
    label: "Erro",
  },
  warning: {
    icon: AlertTriangle,
    dotColor: "bg-warning",
    textColor: "text-warning",
    iconColor: "text-warning",
    label: "Atenção",
  },
  info: {
    icon: Circle,
    dotColor: "bg-info",
    textColor: "text-info",
    iconColor: "text-info",
    label: "Info",
  },
  pending: {
    icon: Clock,
    dotColor: "bg-warning",
    textColor: "text-warning",
    iconColor: "text-warning",
    label: "Pendente",
  },
  loading: {
    icon: Loader2,
    dotColor: "bg-primary",
    textColor: "text-primary",
    iconColor: "text-primary",
    label: "Carregando",
  },
  paused: {
    icon: Pause,
    dotColor: "bg-muted-foreground",
    textColor: "text-muted-foreground",
    iconColor: "text-muted-foreground",
    label: "Pausado",
  },
  active: {
    icon: Play,
    dotColor: "bg-success",
    textColor: "text-success",
    iconColor: "text-success",
    label: "Ativo",
  },
  inactive: {
    icon: Circle,
    dotColor: "bg-muted-foreground",
    textColor: "text-muted-foreground",
    iconColor: "text-muted-foreground",
    label: "Inativo",
  },
  draft: {
    icon: Circle,
    dotColor: "bg-muted-foreground",
    textColor: "text-muted-foreground",
    iconColor: "text-muted-foreground",
    label: "Rascunho",
  },
  published: {
    icon: Check,
    dotColor: "bg-success",
    textColor: "text-success",
    iconColor: "text-success",
    label: "Publicado",
  },
};

export function StatusIndicator({
  status,
  label,
  showIcon = false,
  showDot = true,
  pulse = false,
  size,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label ?? config.label;

  return (
    <span className={cn(statusIndicatorVariants({ size }), config.textColor, className)}>
      {showDot && (
        <span className="relative flex">
          <span className={cn(dotVariants({ size }), config.dotColor)} />
          {pulse && (
            <motion.span
              className={cn(
                "absolute inset-0 rounded-full",
                config.dotColor.replace("bg-", "bg-") + "/50"
              )}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </span>
      )}
      {showIcon && (
        <Icon 
          className={cn(
            iconVariants({ size }), 
            config.iconColor,
            status === "loading" && "animate-spin"
          )} 
        />
      )}
      {displayLabel}
    </span>
  );
}

// Badge variant
export function StatusBadge({
  status,
  label,
  size = "sm",
  className,
}: {
  status: StatusType;
  label?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.label;

  const sizeStyles = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeStyles[size],
        config.dotColor.replace("bg-", "bg-") + "/10",
        config.textColor,
        className
      )}
    >
      <span className={cn(
        "rounded-full",
        size === "xs" ? "w-1 h-1" : size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
        config.dotColor
      )} />
      {displayLabel}
    </span>
  );
}

// Connection Status
export function ConnectionStatus({
  isConnected,
  label,
  className,
}: {
  isConnected: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <StatusIndicator
      status={isConnected ? "active" : "inactive"}
      label={label ?? (isConnected ? "Conectado" : "Desconectado")}
      showDot
      pulse={isConnected}
      className={className}
    />
  );
}

// Online Status (for users)
export function OnlineStatus({
  isOnline,
  lastSeen,
  className,
}: {
  isOnline: boolean;
  lastSeen?: Date;
  className?: string;
}) {
  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora mesmo";
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  return (
    <StatusIndicator
      status={isOnline ? "active" : "inactive"}
      label={isOnline ? "Online" : lastSeen ? formatLastSeen(lastSeen) : "Offline"}
      showDot
      pulse={isOnline}
      size="xs"
      className={className}
    />
  );
}
