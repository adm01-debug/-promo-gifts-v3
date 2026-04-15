import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  clickHint?: string;
  isActive?: boolean;
}

const variantStyles = {
  default: {
    base: 'bg-card border-border',
    hover: 'hover:bg-muted/50',
    active: 'ring-primary',
  },
  success: {
    base: 'bg-success/5 border-success/20',
    hover: 'hover:bg-success/10 hover:border-success/40',
    active: 'ring-success',
  },
  warning: {
    base: 'bg-warning/5 border-warning/20',
    hover: 'hover:bg-warning/10 hover:border-warning/40',
    active: 'ring-warning',
  },
  error: {
    base: 'bg-destructive/5 border-destructive/20',
    hover: 'hover:bg-destructive/10 hover:border-destructive/40',
    active: 'ring-destructive',
  },
};

export function StatCard({ title, value, icon, trend, variant = 'default', onClick, clickHint, isActive }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "relative w-full overflow-hidden rounded-lg border text-left shadow-sm",
        "transition-all duration-300 ease-out",
        styles.base,
        onClick && "cursor-pointer",
        styles.hover,
        "active:scale-[0.97]",
        isActive && "ring-2 ring-offset-2 ring-offset-background shadow-lg scale-[1.02]",
        isActive && styles.active,
      )}
      aria-label={`${title}: ${value}${clickHint ? `. ${clickHint}` : ''}`}
      aria-pressed={isActive}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-left">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {trend && (
              <p className={cn(
                "text-xs flex items-center gap-1",
                trend.value >= 0 ? "text-success" : "text-destructive"
              )}>
                {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.label}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center shrink-0" aria-hidden="true">
            {icon}
          </div>
        </div>
      </div>
    </button>
  );
}
