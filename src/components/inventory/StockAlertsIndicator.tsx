import { useState, useEffect, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, TrendingDown, Package, X, Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  imageUrl: string | null;
}

interface StockAlertsIndicatorProps {
  lowStockThreshold?: number;
  criticalStockThreshold?: number;
}

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
      className="relative h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
      {...props}
    >
      <Bell className="h-4 w-4" />
      {totalCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full text-white",
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

export const StockAlertsIndicator = forwardRef<HTMLDivElement, StockAlertsIndicatorProps>(function StockAlertsIndicator({
  lowStockThreshold = 50,
  criticalStockThreshold = 10,
}: StockAlertsIndicatorProps, ref) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStockAlerts();

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
        () => {
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
      const { fetchPromobrindProducts, getProductImageUrl } = await import('@/lib/external-db');
      const productsData = await fetchPromobrindProducts({ limit: 500 });

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
          supplier: product.brand || "",
          imageUrl: getProductImageUrl(product),
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

  const getAlertBadge = (type: StockAlert["alertType"]) => {
    switch (type) {
      case "out":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Esgotado</Badge>;
      case "critical":
        return <Badge className="bg-orange text-white text-[10px] px-1.5 py-0">Crítico</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Baixo</Badge>;
    }
  };

  const getAlertIcon = (type: StockAlert["alertType"]) => {
    switch (type) {
      case "out":
        return <Package className="h-3.5 w-3.5 text-destructive" />;
      case "critical":
        return <AlertTriangle className="h-3.5 w-3.5 text-orange" />;
      default:
        return <TrendingDown className="h-3.5 w-3.5 text-yellow-500" />;
    }
  };

  if (isLoading || totalCount === 0) {
    return null;
  }

  return (
    <div ref={ref}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <StockAlertTrigger totalCount={totalCount} criticalCount={criticalCount} />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="bg-card border-border">Alertas de Estoque</TooltipContent>
        </Tooltip>

        <PopoverContent
          className="w-[400px] p-0 rounded-xl border-border/50 shadow-xl overflow-hidden relative"
          align="end"
          sideOffset={8}
        >
          {/* Close button */}
          <button
            className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors z-10"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2 pr-8">
              <div className="h-7 w-7 rounded-lg bg-orange/10 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-orange" />
              </div>
              <h3 className="font-semibold text-sm">Alertas de Estoque</h3>
              <span className="text-[10px] text-muted-foreground font-medium tabular-nums ml-auto">
                {totalCount} {totalCount === 1 ? "alerta" : "alertas"}
              </span>
            </div>
          </div>

          {/* Alerts list */}
          <ScrollArea className="max-h-[400px]">
            <div className="p-3 space-y-1.5">
              <AnimatePresence>
                {visibleAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/30 hover:border-border/50 hover:bg-muted/30 transition-all group cursor-pointer"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(`/produto/${alert.productId}`);
                    }}
                  >
                    {/* Thumbnail */}
                    {alert.imageUrl ? (
                      <img
                        src={alert.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-contain bg-background border border-border/30 flex-shrink-0 p-0.5"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted/40 flex-shrink-0 flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <p className="text-xs font-medium text-foreground/90 leading-tight line-clamp-2 flex-1">
                          {alert.productName}
                        </p>
                        {getAlertBadge(alert.alertType)}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="font-mono">{alert.sku}</span>
                        <span className="flex items-center gap-1">
                          {getAlertIcon(alert.alertType)}
                          <span className={cn(
                            "font-medium",
                            alert.alertType === "out" && "text-destructive"
                          )}>
                            {alert.currentStock} un.
                          </span>
                        </span>
                        {alert.supplier && (
                          <span className="truncate">{alert.supplier}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              navigate(`/produto/${alert.productId}`);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-[11px]">Ver produto</TooltipContent>
                      </Tooltip>
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
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
        </PopoverContent>
      </Popover>
    </div>
  );
});
