import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, TrendingDown, Package, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  alertType: "low" | "critical" | "out";
  supplier: string;
  createdAt: Date;
}

interface StockAlertsIndicatorProps {
  lowStockThreshold?: number;
  criticalStockThreshold?: number;
}

// Componente interno com ref para o PopoverTrigger
interface StockAlertTriggerProps extends React.ComponentPropsWithoutRef<typeof Button> {
  totalCount: number;
  criticalCount: number;
}

const StockAlertTrigger = forwardRef<HTMLButtonElement, StockAlertTriggerProps>(
  ({ totalCount, criticalCount, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className="relative"
      {...props}
    >
      <Bell className="h-5 w-5" />
      {totalCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white",
            criticalCount > 0 ? "bg-destructive" : "bg-orange"
          )}
        >
          {totalCount > 99 ? "99+" : totalCount}
        </motion.span>
      )}
    </Button>
  )
);
StockAlertTrigger.displayName = "StockAlertTrigger";

export function StockAlertsIndicator({
  lowStockThreshold = 50,
  criticalStockThreshold = 10,
}: StockAlertsIndicatorProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStockAlerts();
    
    // Set up realtime subscription for stock changes
    const channel = supabase
      .channel("stock-alerts")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `stock=lt.${lowStockThreshold}`,
        },
        (payload) => {
          fetchStockAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lowStockThreshold]);

  const fetchStockAlerts = async () => {
    try {
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const productsData = await fetchPromobrindProducts({ limit: 500 });

      // Filtrar produtos com estoque baixo
      const lowStockProducts = productsData.filter(p => (p.stock || 0) < lowStockThreshold);

      const newAlerts: StockAlert[] = lowStockProducts.map((product) => {
        let alertType: "low" | "critical" | "out" = "low";
        if ((product.stock || 0) === 0) {
          alertType = "out";
        } else if ((product.stock || 0) <= criticalStockThreshold) {
          alertType = "critical";
        }

        return {
          id: product.id,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: product.stock || 0,
          alertType,
          supplier: product.brand || "Desconhecido",
          createdAt: new Date(),
        };
      }).slice(0, 50);

      setAlerts(newAlerts);
    } catch (error) {
      console.error("Error fetching stock alerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));
  const criticalCount = visibleAlerts.filter((a) => a.alertType === "critical" || a.alertType === "out").length;
  const totalCount = visibleAlerts.length;

  const getAlertIcon = (type: StockAlert["alertType"]) => {
    switch (type) {
      case "out":
        return <Package className="h-4 w-4 text-destructive" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-orange" />;
      default:
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getAlertBadge = (type: StockAlert["alertType"]) => {
    switch (type) {
      case "out":
        return <Badge variant="destructive">Esgotado</Badge>;
      case "critical":
        return <Badge className="bg-orange text-white">Crítico</Badge>;
      default:
        return <Badge variant="secondary">Baixo</Badge>;
    }
  };

  if (isLoading || totalCount === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <StockAlertTrigger totalCount={totalCount} criticalCount={criticalCount} />
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange" />
                Alertas de Estoque
              </span>
              <Badge variant="outline">{totalCount} alerta(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {visibleAlerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="mt-0.5">
                        {getAlertIcon(alert.alertType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {alert.productName}
                          </p>
                          {getAlertBadge(alert.alertType)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          SKU: {alert.sku}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Estoque: <span className={alert.alertType === "out" ? "text-destructive font-medium" : ""}>{alert.currentStock} unidades</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fornecedor: {alert.supplier}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {visibleAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum alerta de estoque</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
