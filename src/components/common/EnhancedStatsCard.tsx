import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./MicroInteractions";

interface EnhancedStatsCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  prefix?: string;
  suffix?: string;
  variant?: "default" | "primary" | "success" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/5 border-primary/20",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
  info: "bg-info/5 border-info/20",
};

const iconBgStyles = {
  default: "bg-primary/10 text-primary",
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

export function EnhancedStatsCard({
  label,
  value,
  icon,
  trend,
  prefix,
  suffix,
  variant = "default",
  size = "md",
  className,
}: EnhancedStatsCardProps) {
  const sizeStyles = {
    sm: {
      container: "py-2 px-3",
      icon: "w-8 h-8",
      value: "text-xl",
      label: "text-xs",
    },
    md: {
      container: "py-3 px-4",
      icon: "w-10 h-10",
      value: "text-2xl lg:text-3xl",
      label: "text-sm",
    },
    lg: {
      container: "py-4 px-5",
      icon: "w-12 h-12",
      value: "text-3xl lg:text-4xl",
      label: "text-base",
    },
  };

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.isPositive !== undefined
      ? trend.isPositive
        ? "text-success"
        : "text-destructive"
      : trend.value > 0
      ? "text-success"
      : trend.value < 0
      ? "text-destructive"
      : "text-muted-foreground"
    : "";

  return (
    <Card
      className={cn(
        "border overflow-hidden transition-all duration-300 hover:shadow-md group",
        variantStyles[variant],
        className
      )}
    >
      <CardContent className={cn("flex items-center gap-3", sizeStyles[size].container)}>
        {/* Icon */}
        <div
          className={cn(
            "shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            iconBgStyles[variant],
            sizeStyles[size].icon
          )}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={cn("font-bold font-display", sizeStyles[size].value)}>
              {prefix}
              <AnimatedCounter value={value} />
              {suffix}
            </span>

            {/* Trend indicator */}
            {trend && TrendIcon && (
              <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>

          <p className={cn("text-muted-foreground truncate mt-0.5", sizeStyles[size].label)}>
            {label}
          </p>

          {/* Trend label */}
          {trend?.label && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{trend.label}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Grid wrapper for stats
export function StatsGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {children}
    </div>
  );
}
