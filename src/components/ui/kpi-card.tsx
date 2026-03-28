/**
 * KpiCard compartilhado — usado em SalesHistoryChart, StockHistoryChart, e outros.
 * Elimina duplicação de ~30 linhas entre módulos.
 */
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  alert?: boolean;
  warning?: boolean;
  customValueColor?: string;
  ariaLabel?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
  alert,
  warning,
  customValueColor,
  ariaLabel,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-2 text-center",
        alert ? "bg-destructive/10 border border-destructive/20" :
        warning ? "bg-amber-500/10 border border-amber-500/20" :
        highlight ? "bg-primary/10 border border-primary/20" :
        "bg-muted/50"
      )}
      role="status"
      aria-label={ariaLabel ?? `${label}: ${value} ${sub}`}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon
          className={cn(
            "h-3 w-3",
            alert ? "text-destructive" :
            warning ? "text-amber-500" :
            highlight ? "text-primary" :
            "text-muted-foreground"
          )}
          aria-hidden="true"
        />
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
      <p className={cn(
        "text-sm font-bold",
        customValueColor ? customValueColor :
        alert ? "text-destructive" :
        warning ? "text-amber-600" :
        highlight ? "text-primary" :
        "text-foreground"
      )}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
