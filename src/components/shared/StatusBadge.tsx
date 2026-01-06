import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  LucideIcon
} from "lucide-react";

type StatusVariant = 
  | "success" 
  | "warning" 
  | "error" 
  | "info" 
  | "pending" 
  | "neutral"
  | "primary";

type StatusSize = "xs" | "sm" | "md" | "lg";

interface StatusBadgeProps {
  variant?: StatusVariant;
  size?: StatusSize;
  label: string;
  icon?: LucideIcon;
  showIcon?: boolean;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<StatusVariant, {
  bg: string;
  text: string;
  border: string;
  icon: LucideIcon;
}> = {
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
    icon: CheckCircle,
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/20",
    icon: AlertCircle,
  },
  error: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
    icon: XCircle,
  },
  info: {
    bg: "bg-info/10",
    text: "text-info",
    border: "border-info/20",
    icon: AlertCircle,
  },
  pending: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: Clock,
  },
  neutral: {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    icon: Minus,
  },
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    icon: CheckCircle,
  },
};

const sizeStyles: Record<StatusSize, {
  padding: string;
  text: string;
  icon: string;
  gap: string;
}> = {
  xs: {
    padding: "px-1.5 py-0.5",
    text: "text-[10px]",
    icon: "w-2.5 h-2.5",
    gap: "gap-1",
  },
  sm: {
    padding: "px-2 py-0.5",
    text: "text-xs",
    icon: "w-3 h-3",
    gap: "gap-1",
  },
  md: {
    padding: "px-2.5 py-1",
    text: "text-sm",
    icon: "w-3.5 h-3.5",
    gap: "gap-1.5",
  },
  lg: {
    padding: "px-3 py-1.5",
    text: "text-base",
    icon: "w-4 h-4",
    gap: "gap-2",
  },
};

export function StatusBadge({
  variant = "neutral",
  size = "sm",
  label,
  icon,
  showIcon = true,
  pulse = false,
  className,
}: StatusBadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const IconComponent = icon || variantStyle.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        variantStyle.bg,
        variantStyle.text,
        variantStyle.border,
        sizeStyle.padding,
        sizeStyle.text,
        sizeStyle.gap,
        className
      )}
    >
      {showIcon && (
        <span className="relative">
          <IconComponent className={sizeStyle.icon} />
          {pulse && (
            <motion.span
              className={cn(
                "absolute inset-0 rounded-full",
                variantStyle.bg
              )}
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </span>
      )}
      {label}
    </span>
  );
}

// Quote status mapping
export const quoteStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  draft: { label: "Rascunho", variant: "neutral" },
  sent: { label: "Enviado", variant: "info" },
  viewed: { label: "Visualizado", variant: "primary" },
  approved: { label: "Aprovado", variant: "success" },
  rejected: { label: "Recusado", variant: "error" },
  expired: { label: "Expirado", variant: "warning" },
  cancelled: { label: "Cancelado", variant: "error" },
};

export function QuoteStatusBadge({ status, size = "sm" }: { status: string; size?: StatusSize }) {
  const config = quoteStatusMap[status] || { label: status, variant: "neutral" as const };
  return <StatusBadge variant={config.variant} label={config.label} size={size} />;
}

// Order status mapping
export const orderStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  pending: { label: "Pendente", variant: "pending" },
  confirmed: { label: "Confirmado", variant: "info" },
  in_production: { label: "Em Produção", variant: "primary" },
  shipped: { label: "Enviado", variant: "info" },
  delivered: { label: "Entregue", variant: "success" },
  cancelled: { label: "Cancelado", variant: "error" },
};

export function OrderStatusBadge({ status, size = "sm" }: { status: string; size?: StatusSize }) {
  const config = orderStatusMap[status] || { label: status, variant: "neutral" as const };
  return <StatusBadge variant={config.variant} label={config.label} size={size} />;
}

// Stock status mapping
export const stockStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  "in-stock": { label: "Em Estoque", variant: "success" },
  "low-stock": { label: "Estoque Baixo", variant: "warning" },
  "out-of-stock": { label: "Sem Estoque", variant: "error" },
};

export function StockStatusBadge({ status, size = "sm" }: { status: string; size?: StatusSize }) {
  const config = stockStatusMap[status] || { label: status, variant: "neutral" as const };
  return <StatusBadge variant={config.variant} label={config.label} size={size} pulse={status === "low-stock"} />;
}

// Trend indicator
interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  size?: StatusSize;
  showIcon?: boolean;
}

export function TrendIndicator({ 
  value, 
  suffix = "%", 
  size = "sm",
  showIcon = true 
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const variant: StatusVariant = isPositive ? "success" : isNeutral ? "neutral" : "error";
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  const formattedValue = `${isPositive ? "+" : ""}${value}${suffix}`;

  return (
    <StatusBadge
      variant={variant}
      size={size}
      label={formattedValue}
      icon={Icon}
      showIcon={showIcon}
    />
  );
}

// Loading badge
export function LoadingBadge({ label = "Carregando", size = "sm" }: { label?: string; size?: StatusSize }) {
  return (
    <StatusBadge
      variant="neutral"
      size={size}
      label={label}
      icon={Loader2}
      showIcon={true}
    />
  );
}
