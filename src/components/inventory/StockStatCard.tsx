import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Animated counter hook
function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = target;
    if (from === to) return;

    const start = performance.now();
    let raf: number;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

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

  // Parse numeric value for animation
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  const isNumeric = typeof numericValue === 'number' && !isNaN(numericValue) && typeof value !== 'string' || (typeof value === 'string' && /^\d/.test(value));
  const animatedValue = useCountUp(isNumeric ? numericValue : 0);
  
  // Format the display value
  const displayValue = isNumeric
    ? animatedValue.toLocaleString('pt-BR')
    : value;

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
      {/* Active indicator line */}
      {isActive && (
        <div className={cn(
          "absolute top-0 left-0 right-0 h-0.5",
          variant === 'success' && "bg-success",
          variant === 'warning' && "bg-warning",
          variant === 'error' && "bg-destructive",
          variant === 'default' && "bg-primary",
        )} />
      )}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-left">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold tabular-nums tracking-tight">{displayValue}</p>
            {trend && (
              <p className={cn(
                "text-xs flex items-center gap-1",
                trend.value >= 0 ? "text-success" : "text-destructive"
              )}>
                {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="truncate">{trend.label}</span>
              </p>
            )}
          </div>
          <div className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-colors",
            isActive ? "bg-background shadow-sm" : "bg-muted/50",
          )} aria-hidden="true">
            {icon}
          </div>
        </div>
      </div>
    </button>
  );
}
