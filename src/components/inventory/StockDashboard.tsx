import { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Package, TrendingDown, RefreshCw, Truck, CheckCircle2, XCircle, Palette, Loader2, AlertCircle, X,
  ChevronDown, ChevronRight, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
  const [riskPanelOpen, setRiskPanelOpen] = useState(true);
  const { toast } = useToast();
  const prevCriticalCountRef = useRef<number | null>(null);
  const {
    isLoading, isFetching, loadingProgress, productStocks, allProductStocks,
    summary, alerts, criticalAlerts, filters, futureStock, allColors,
    availableCategories, availableSuppliers, availableColorGroups,
    fetchStockData, updateFilter, resetFilters, dismissAlert, dismissAlertsBySeverity,
  } = useVariantStock();

  // Toast when new critical alerts appear after refresh
  useEffect(() => {
    if (isLoading) return;
    const count = criticalAlerts.length;
    if (prevCriticalCountRef.current !== null && count > prevCriticalCountRef.current) {
      const newCount = count - prevCriticalCountRef.current;
      toast({
        title: `⚠️ ${newCount} novo${newCount > 1 ? 's' : ''} alerta${newCount > 1 ? 's' : ''} crítico${newCount > 1 ? 's' : ''}`,
        description: "Produtos sem estoque ou em nível crítico detectados.",
        variant: "destructive",
      });
    }
    prevCriticalCountRef.current = count;
  }, [criticalAlerts.length, isLoading, toast]);

  const warningAlerts = useMemo(() => alerts.filter(a => a.severity === 'warning'), [alerts]);
  const infoAlerts = useMemo(() => alerts.filter(a => a.severity === 'info'), [alerts]);

  const activeFilterLabel = useMemo(() => {
    switch (filters.status) {
      case 'in_stock': return 'Em Estoque';
      case 'low_stock': return 'Estoque Baixo';
      case 'critical': return 'Estoque Crítico';
      case 'out_of_stock': return 'Sem Estoque';
      case 'incoming': return 'Estoque Futuro';
      default: return null;
    }
  }, [filters.status]);

  const isFiltered = filters.status !== 'all';

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

      {/* Header with timestamp */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Visão Geral</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Última atualização: {new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
      </div>

      {/* Summary Cards — clickable filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard title="Total de Produtos" value={summary.totalProducts.toLocaleString('pt-BR')}
          icon={<Package className="h-6 w-6 text-primary" />}
          isActive={filters.status === 'all'}
          onClick={() => updateFilter('status', 'all')}
          clickHint="Mostrar todos os produtos"
          trend={{ value: summary.totalVariants, label: `${summary.totalVariants.toLocaleString('pt-BR')} variações` }} />
        <StatCard title="Em Estoque" value={summary.productsInStock.toLocaleString('pt-BR')}
          icon={<CheckCircle2 className="h-6 w-6 text-success" />} variant="success"
          isActive={filters.status === 'in_stock'}
          onClick={() => updateFilter('status', filters.status === 'in_stock' ? 'all' : 'in_stock')}
          clickHint="Filtrar produtos em estoque"
          trend={summary.totalProducts > 0 ? { value: 1, label: `${Math.round((summary.productsInStock / summary.totalProducts) * 100)}% do total` } : undefined} />
        <StatCard title="Estoque Baixo" value={(summary.productsLowStock + summary.productsCritical).toLocaleString('pt-BR')}
          icon={<TrendingDown className="h-6 w-6 text-warning" />} variant="warning"
          isActive={filters.status === 'low_stock' || filters.status === 'critical'}
          onClick={() => {
            updateFilter('status', filters.status === 'low_stock' ? 'all' : 'low_stock');
            if (warningAlerts.length > 0) setLowStockDialogOpen(true);
          }}
          clickHint="Filtrar produtos com estoque baixo"
          trend={summary.productsCritical > 0 ? { value: -1, label: `${summary.productsCritical} críticos` } : undefined} />
        <StatCard title="Sem Estoque" value={summary.productsOutOfStock.toLocaleString('pt-BR')}
          icon={<XCircle className="h-6 w-6 text-destructive" />} variant="error"
          isActive={filters.status === 'out_of_stock'}
          onClick={() => {
            updateFilter('status', filters.status === 'out_of_stock' ? 'all' : 'out_of_stock');
            if (criticalAlerts.length > 0) setOutOfStockDialogOpen(true);
          }}
          clickHint="Filtrar produtos sem estoque"
          trend={summary.criticalAlerts > 0 ? { value: -1, label: `${summary.criticalAlerts} alertas ativos` } : undefined} />
        <StatCard title="Estoque Futuro"
          value={futureStock.length > 0 ? `${futureStock.length} previsões` : '-'}
          icon={<Truck className="h-6 w-6 text-primary" />}
          isActive={filters.status === 'incoming'}
          onClick={() => updateFilter('status', filters.status === 'incoming' ? 'all' : 'incoming')}
          clickHint="Filtrar produtos com estoque futuro"
          trend={futureStock.length > 0 ? { value: 1, label: 'reposições previstas' } : undefined} />
      </div>

      {/* Active Filter Badge */}
      {isFiltered && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="text-sm text-muted-foreground">Filtro ativo:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-medium text-primary">
            {activeFilterLabel}
            <button
              type="button"
              onClick={() => updateFilter('status', 'all')}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
              aria-label="Remover filtro"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="text-xs text-muted-foreground">
            ({productStocks.length} de {allProductStocks.length} produtos)
          </span>
        </div>
      )}

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

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Estoque por Cor/Variação
              {isFiltered ? (
                <span className="text-base font-normal text-muted-foreground">
                  ({productStocks.length} de {allProductStocks.length} produtos)
                </span>
              ) : (
                <span className="text-base font-normal text-muted-foreground">
                  ({productStocks.length} produtos)
                </span>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStockData}
              disabled={isFetching}
              className="gap-1.5"
              aria-label="Atualizar dados de estoque"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {isFetching ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </CardTitle>
          <CardDescription>Visualização detalhada do estoque segmentado por cores e variações</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[min(600px,_60vh)]">
            <VariantStockTable products={productStocks} />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Collapsible Risk Panel */}
      <div className="space-y-0">
        <button
          type="button"
          onClick={() => setRiskPanelOpen(prev => !prev)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          {riskPanelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Painel de Risco do Fornecedor
        </button>
        {riskPanelOpen && <SupplierRiskPanel products={allProductStocks} />}
      </div>

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
