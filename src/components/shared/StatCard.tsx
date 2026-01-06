import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
  loading?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  default: {
    icon: "bg-muted text-muted-foreground",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
  success: {
    icon: "bg-success/10 text-success",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
  info: {
    icon: "bg-info/10 text-info",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
};

const sizeStyles = {
  sm: {
    container: "p-4",
    icon: "p-2 w-9 h-9",
    iconSize: "w-4 h-4",
    title: "text-xs",
    value: "text-xl",
    description: "text-xs",
  },
  md: {
    container: "p-5",
    icon: "p-2.5 w-11 h-11",
    iconSize: "w-5 h-5",
    title: "text-sm",
    value: "text-2xl",
    description: "text-sm",
  },
  lg: {
    container: "p-6",
    icon: "p-3 w-14 h-14",
    iconSize: "w-6 h-6",
    title: "text-base",
    value: "text-3xl",
    description: "text-base",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  size = "md",
  className,
  loading = false,
  onClick,
}: StatCardProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const getTrendClass = () => {
    if (!trend) return "";
    if (trend.value > 0) return variantStyle.trend.positive;
    if (trend.value < 0) return variantStyle.trend.negative;
    return variantStyle.trend.neutral;
  };

  const formatTrend = () => {
    if (!trend) return "";
    const prefix = trend.value > 0 ? "+" : "";
    return `${prefix}${trend.value}%`;
  };

  const content = (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
        sizeStyle.container,
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className={cn("text-muted-foreground font-medium", sizeStyle.title)}>
            {title}
          </p>
          
          {loading ? (
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className={cn("font-bold text-foreground", sizeStyle.value)}>
                {value}
              </p>
              {trend && (
                <span className={cn("text-sm font-medium", getTrendClass())}>
                  {formatTrend()}
                  {trend.label && <span className="text-xs ml-1">{trend.label}</span>}
                </span>
              )}
            </div>
          )}
          
          {description && (
            <p className={cn("text-muted-foreground", sizeStyle.description)}>
              {description}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "rounded-lg flex items-center justify-center shrink-0",
              variantStyle.icon,
              sizeStyle.icon
            )}
          >
            <Icon className={sizeStyle.iconSize} />
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        {content}
      </motion.div>
    );
  }

  return content;
}

// Grid wrapper for stat cards
interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
