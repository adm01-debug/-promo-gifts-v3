import { useState, useMemo } from "react";
import {
  Package, TrendingDown, RefreshCw, Truck, CheckCircle2, XCircle, Palette, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useVariantStock } from "@/hooks/useVariantStock";
import { VariantStockTable } from "./VariantStockTable";
import { SupplierRiskPanel } from "./SupplierRiskPanel";
import { StatCard } from "./StockStatCard";
import { AlertCard } from "./StockAlertCard";
import { OutOfStockDialog, LowStockDialog } from "./StockAlertDialogs";
import { StockFilterToolbar } from "./StockFilterToolbar";

export function StockDashboard() {
  const [outOfStockDialogOpen, setOutOfStockDialogOpen] = useState(false);
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false);
  const {
    isLoading, isFetching, loadingProgress, productStocks, allProductStocks,
    summary, alerts, criticalAlerts, filters, futureStock, allColors,
    availableCategories, availableSuppliers, availableColorGroups,
    fetchStockData, updateFilter, resetFilters, dismissAlert, dismissAlertsBySeverity,
  } = useVariantStock();

  const warningAlerts = useMemo(() => alerts.filter(a => a.severity === 'warning'), [alerts]);
  const infoAlerts = useMemo(() => alerts.filter(a => a.severity === 'info'), [alerts]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg font-medium mb-2">Carregando estoque...</p>
          {loadingProgress && (
            <p className="text-sm text-muted-foreground">
              {loadingProgress.step} ({loadingProgress.current}/{loadingProgress.total})
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Alert Dialogs */}
      <OutOfStockDialog open={outOfStockDialogOpen} onOpenChange={setOutOfStockDialogOpen}
        alerts={criticalAlerts} onDismiss={dismissAlert} onDismissAll={() => dismissAlertsBySeverity('error')} />
      <LowStockDialog open={lowStockDialogOpen} onOpenChange={setLowStockDialogOpen}
        alerts={warningAlerts} onDismiss={dismissAlert} onDismissAll={() => dismissAlertsBySeverity('warning')} />

      {/* Advanced Filters */}
      <Card>
        <CardContent className="p-4">
          <StockFilterToolbar
            filters={filters}
            onUpdateFilter={updateFilter}
            onResetFilters={resetFilters}
            categories={availableCategories}
            suppliers={availableSuppliers}
            colors={allColors}
            colorGroups={availableColorGroups}
            totalProducts={allProductStocks.length}
            filteredCount={productStocks.length}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard title="Total de Produtos" value={summary.totalProducts.toLocaleString('pt-BR')}
          icon={<Package className="h-6 w-6 text-primary" />} />
        <StatCard title="Em Estoque" value={summary.productsInStock.toLocaleString('pt-BR')}
          icon={<CheckCircle2 className="h-6 w-6 text-success" />} variant="success" />
        <StatCard title="Estoque Baixo" value={(summary.productsLowStock + summary.productsCritical).toLocaleString('pt-BR')}
          icon={<TrendingDown className="h-6 w-6 text-warning" />} variant="warning"
          onClick={warningAlerts.length > 0 ? () => setLowStockDialogOpen(true) : undefined}
          clickHint={warningAlerts.length > 0 ? "Clique para ver alertas" : undefined} />
        <StatCard title="Sem Estoque" value={summary.productsOutOfStock.toLocaleString('pt-BR')}
          icon={<XCircle className="h-6 w-6 text-destructive" />} variant="error"
          onClick={criticalAlerts.length > 0 ? () => setOutOfStockDialogOpen(true) : undefined}
          clickHint={criticalAlerts.length > 0 ? "Clique para ver alertas" : undefined} />
        <StatCard title="Estoque Futuro"
          value={futureStock.length > 0 ? `${futureStock.length} previsões` : '-'}
          icon={<Truck className="h-6 w-6 text-primary" />} />
      </div>

      <SupplierRiskPanel products={allProductStocks} />

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Estoque por Cor/Variação ({productStocks.length} produtos)
            </span>
          </CardTitle>
          <CardDescription>Visualização detalhada do estoque segmentado por cores e variações</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[min(600px,_60vh)]">
            <VariantStockTable products={productStocks} />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info Alerts */}
      {infoAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Outros Alertas ({infoAlerts.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => dismissAlertsBySeverity('info')}>
                <XCircle className="h-3.5 w-3.5" />Limpar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {infoAlerts.slice(0, 10).map(alert => (
                  <AlertCard key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StockDashboard;
