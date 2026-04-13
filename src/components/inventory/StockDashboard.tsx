import { useState, useMemo } from "react";
import {
  Package,
  TrendingDown,
  RefreshCw,
  Search,
  ArrowUpDown,
  X,
  Truck,
  CheckCircle2,
  XCircle,
  Palette,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVariantStock } from "@/hooks/useVariantStock";
import { VariantStockTable } from "./VariantStockTable";
import { SupplierRiskPanel } from "./SupplierRiskPanel";
import { StatCard } from "./StockStatCard";
import { AlertCard } from "./StockAlertCard";
import { OutOfStockDialog, LowStockDialog } from "./StockAlertDialogs";
import type { StockStatus } from "@/types/stock";

const STATUS_CONFIG: Record<StockStatus, { label: string; icon: React.ReactNode }> = {
  in_stock: { label: 'Em Estoque', icon: <CheckCircle2 className="h-4 w-4" /> },
  low_stock: { label: 'Estoque Baixo', icon: <TrendingDown className="h-4 w-4" /> },
  critical: { label: 'Crítico', icon: <Package className="h-4 w-4" /> },
  out_of_stock: { label: 'Sem Estoque', icon: <XCircle className="h-4 w-4" /> },
  overstocked: { label: 'Excesso', icon: <Package className="h-4 w-4" /> },
  incoming: { label: 'Chegando', icon: <Truck className="h-4 w-4" /> },
};

export function StockDashboard() {
  const [outOfStockDialogOpen, setOutOfStockDialogOpen] = useState(false);
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false);
  const {
    isLoading, isFetching, loadingProgress, productStocks, allProductStocks,
    summary, alerts, criticalAlerts, filters, futureStock,
    fetchStockData, updateFilter, resetFilters, dismissAlert, dismissAlertsBySeverity,
  } = useVariantStock();

  const warningAlerts = useMemo(() => alerts.filter(a => a.severity === 'warning'), [alerts]);
  const infoAlerts = useMemo(() => alerts.filter(a => a.severity === 'info'), [alerts]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-primary animate-pulse mb-4" aria-hidden="true" />
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

  const hasActiveFilters = filters.search || filters.status !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" aria-hidden="true" />
            Dashboard de Estoque
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do estoque em tempo real</p>
        </div>
        <Button variant="outline" onClick={fetchStockData} className="gap-2" disabled={isFetching}
          aria-label={isFetching ? "Atualizando estoque..." : "Atualizar dados de estoque"}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isFetching ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {/* Alert Dialogs */}
      <OutOfStockDialog open={outOfStockDialogOpen} onOpenChange={setOutOfStockDialogOpen}
        alerts={criticalAlerts} onDismiss={dismissAlert} onDismissAll={() => dismissAlertsBySeverity('error')} />
      <LowStockDialog open={lowStockDialogOpen} onOpenChange={setLowStockDialogOpen}
        alerts={warningAlerts} onDismiss={dismissAlert} onDismissAll={() => dismissAlertsBySeverity('warning')} />

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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input placeholder="Buscar por nome ou SKU..." value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)} className="pl-9" aria-label="Buscar produtos no estoque" />
            </div>
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value as StockStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por status de estoque">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">{config.icon}{config.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value as typeof filters.sortBy)}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Ordenar produtos">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome (A-Z)</SelectItem>
                <SelectItem value="stock_asc">Menor Estoque</SelectItem>
                <SelectItem value="stock_desc">Maior Estoque</SelectItem>
                <SelectItem value="days_remaining">Dias Restantes</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} size="icon" aria-label="Limpar todos os filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="h-5 w-5" aria-hidden="true" />
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
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                Outros Alertas ({infoAlerts.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => dismissAlertsBySeverity('info')} aria-label="Dispensar todos os alertas informativos">
                <X className="h-3.5 w-3.5" />Limpar Todos
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
