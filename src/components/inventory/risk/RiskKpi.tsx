import { cn } from "@/lib/utils";
import type { Flame } from "lucide-react";

interface RiskKpiProps {
  icon: typeof Flame;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
  warning?: boolean;
}

export function RiskKpi({ icon: Icon, label, value, sub, alert, warning }: RiskKpiProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-1.5 text-center",
        alert ? "bg-destructive/10 border border-destructive/20" :
        warning ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50"
      )}
      role="status"
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={cn("h-2.5 w-2.5",
          alert ? "text-destructive" :
          warning ? "text-amber-500" : "text-muted-foreground"
        )} aria-hidden="true" />
        <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
      </div>
      <p className={cn(
        "text-xs font-bold",
        alert ? "text-destructive" :
        warning ? "text-amber-600" : "text-foreground"
      )}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}
