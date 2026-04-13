import { AlertCircle, AlertTriangle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StockAlert } from "@/types/stock";

const severityStyles = {
  info: 'border-primary/30 bg-primary/5',
  warning: 'border-warning/30 bg-warning/5',
  error: 'border-destructive/30 bg-destructive/5',
};

const severityIcons = {
  info: <AlertCircle className="h-5 w-5 text-primary" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  error: <XCircle className="h-5 w-5 text-destructive" />,
};

export function AlertCard({ alert, onDismiss }: { alert: StockAlert; onDismiss: () => void }) {
  return (
    <div
      className={cn("flex items-start gap-3 p-3 rounded-lg border", severityStyles[alert.severity])}
      role="alert"
    >
      <span aria-hidden="true">{severityIcons[alert.severity]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{alert.productName}</p>
        <p className="text-xs text-muted-foreground">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-1">SKU: {alert.productSku}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss} aria-label={`Dispensar alerta de ${alert.productName}`}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
