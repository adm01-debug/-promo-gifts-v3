import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  default: 'bg-card',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  error: 'bg-destructive/5 border-destructive/20',
};

export function StatCard({ title, value, icon, trend, variant = 'default', onClick, clickHint }: StatCardProps) {
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        variantStyles[variant],
        isClickable && "cursor-pointer hover:shadow-md",
        isClickable && variant === 'error' && "hover:border-destructive/40",
        isClickable && variant === 'warning' && "hover:border-warning/40",
      )}
      role={isClickable ? "button" : "status"}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={`${title}: ${value}${clickHint ? `. ${clickHint}` : ''}`}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
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
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center" aria-hidden="true">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
