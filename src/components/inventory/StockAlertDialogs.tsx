import { AlertTriangle, TrendingDown, X, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCard } from "./StockAlertCard";
import type { StockAlert } from "@/types/stock";

interface StockAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: StockAlert[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function OutOfStockDialog({ open, onOpenChange, alerts, onDismiss, onDismissAll }: StockAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Alertas Críticos ({alerts.length})
          </DialogTitle>
          <DialogDescription>
            Produtos sem estoque ou em nível crítico que precisam de atenção imediata.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={onDismissAll}
            aria-label="Dispensar todos os alertas críticos"
          >
            <X className="h-3.5 w-3.5" />
            Limpar Todos
          </Button>
        </div>
        <ScrollArea className="max-h-[60vh]">
          {alerts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onDismiss={() => onDismiss(alert.id)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-3 text-success" />
              <p className="font-medium">Nenhum alerta crítico</p>
              <p className="text-sm">Todos os produtos estão com estoque disponível.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function LowStockDialog({ open, onOpenChange, alerts, onDismiss, onDismissAll }: StockAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <TrendingDown className="h-5 w-5" />
            Alertas de Estoque Baixo ({alerts.length})
          </DialogTitle>
          <DialogDescription>
            Produtos com estoque abaixo do mínimo ou com previsão de esgotamento.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={onDismissAll}
            aria-label="Dispensar todos os alertas de estoque baixo"
          >
            <X className="h-3.5 w-3.5" />
            Limpar Todos
          </Button>
        </div>
        <ScrollArea className="max-h-[60vh]">
          {alerts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onDismiss={() => onDismiss(alert.id)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-3 text-success" />
              <p className="font-medium">Nenhum alerta de estoque baixo</p>
              <p className="text-sm">Todos os produtos estão com níveis adequados.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
