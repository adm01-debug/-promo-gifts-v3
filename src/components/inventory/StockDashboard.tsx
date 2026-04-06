import { useState } from "react";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Clock,
  Truck,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Palette,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { useVariantStock } from "@/hooks/useVariantStock";
import { VariantStockTable } from "./VariantStockTable";
import { SupplierRiskPanel } from "./SupplierRiskPanel";
import { StockStatus, StockAlert } from "@/types/stock";

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const STATUS_CONFIG: Record<StockStatus, { label: string; color: string; icon: React.ReactNode }> = {
  in_stock: { 
    label: 'Em Estoque', 
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  low_stock: { 
    label: 'Estoque Baixo', 
    color: 'bg-warning/10 text-warning border-warning/20',
    icon: <TrendingDown className="h-4 w-4" />
  },
  critical: { 
    label: 'Crítico', 
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: <AlertTriangle className="h-4 w-4" />
  },
  out_of_stock: { 
    label: 'Sem Estoque', 
    color: 'bg-destructive/15 text-destructive border-destructive/25',
    icon: <XCircle className="h-4 w-4" />
  },
  overstocked: { 
    label: 'Excesso', 
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: <TrendingUp className="h-4 w-4" />
  },
  incoming: { 
    label: 'Chegando', 
    color: 'bg-accent text-accent-foreground border-accent',
    icon: <Truck className="h-4 w-4" />
  },
};

function StockStatusBadge({ status }: { status: StockStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  variant = 'default',
  onClick,
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
    error: 'bg-destructive/5 border-destructive/20',
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-200", 
        variantStyles[variant],
        onClick && "cursor-pointer hover:shadow-md hover:border-destructive/40"
      )} 
      role="status" 
      aria-label={`${title}: ${value}`}
      onClick={onClick}
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

function AlertCard({ alert, onDismiss }: { alert: StockAlert; onDismiss: () => void }) {
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

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function StockDashboard() {
  const [outOfStockDialogOpen, setOutOfStockDialogOpen] = useState(false);
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false);
  const {
    isLoading,
    isFetching,
    loadingProgress,
    productStocks,
    allProductStocks,
    summary,
    alerts,
    criticalAlerts,
    filters,
    allColors,
    futureStock,
    fetchStockData,
    updateFilter,
    resetFilters,
    dismissAlert,
    dismissAllAlerts,
  } = useVariantStock();

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
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
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
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral do estoque em tempo real
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchStockData}
          className="gap-2"
          disabled={isFetching}
          aria-label={isFetching ? "Atualizando estoque..." : "Atualizar dados de estoque"}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isFetching ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {/* Dialog de Alertas Sem Estoque */}
      <Dialog open={outOfStockDialogOpen} onOpenChange={setOutOfStockDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas Críticos ({criticalAlerts.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={dismissAllAlerts}
              aria-label="Dispensar todos os alertas"
            >
              <X className="h-3.5 w-3.5" />
              Limpar Todos
            </Button>
          </div>
          <ScrollArea className="max-h-[60vh]">
            {criticalAlerts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {criticalAlerts.map(alert => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onDismiss={() => dismissAlert(alert.id)} 
                  />
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

      {/* Dialog de Alertas Estoque Baixo */}
      <Dialog open={lowStockDialogOpen} onOpenChange={setLowStockDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <TrendingDown className="h-5 w-5" />
              Alertas de Estoque Baixo ({alerts.filter(a => a.severity === 'warning').length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={dismissAllAlerts}
              aria-label="Dispensar todos os alertas"
            >
              <X className="h-3.5 w-3.5" />
              Limpar Todos
            </Button>
          </div>
          <ScrollArea className="max-h-[60vh]">
            {alerts.filter(a => a.severity === 'warning').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {alerts.filter(a => a.severity === 'warning').map(alert => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onDismiss={() => dismissAlert(alert.id)} 
                  />
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total de Produtos"
          value={summary.totalProducts.toLocaleString('pt-BR')}
          icon={<Package className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="Em Estoque"
          value={summary.productsInStock.toLocaleString('pt-BR')}
          icon={<CheckCircle2 className="h-6 w-6 text-success" />}
          variant="success"
        />
        <StatCard
          title="Estoque Baixo"
          value={(summary.productsLowStock + summary.productsCritical).toLocaleString('pt-BR')}
          icon={<TrendingDown className="h-6 w-6 text-warning" />}
          variant="warning"
        />
        <StatCard
          title="Sem Estoque"
          value={summary.productsOutOfStock.toLocaleString('pt-BR')}
          icon={<XCircle className="h-6 w-6 text-destructive" />}
          variant="error"
          onClick={() => setOutOfStockDialogOpen(true)}
        />
        <StatCard
          title="Estoque Futuro"
          value={futureStock.length > 0 ? `${futureStock.length} previsões` : '-'}
          icon={<Truck className="h-6 w-6 text-primary" />}
        />
      </div>

      {/* Painel de Risco de Fornecedor */}
      <SupplierRiskPanel products={allProductStocks} />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9"
                aria-label="Buscar produtos no estoque"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter('status', value as StockStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por status de estoque">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter('sortBy', value as typeof filters.sortBy)}
            >
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

      {/* Tabela de Estoque por Variação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="h-5 w-5" aria-hidden="true" />
              Estoque por Cor/Variação ({productStocks.length} produtos)
            </span>
          </CardTitle>
          <CardDescription>
            Visualização detalhada do estoque segmentado por cores e variações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[min(600px,_60vh)]">
            <VariantStockTable products={productStocks} />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alertas Gerais */}
      {alerts.length > criticalAlerts.length && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                Outros Alertas ({alerts.length - criticalAlerts.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={dismissAllAlerts}
                aria-label="Dispensar todos os alertas"
              >
                <X className="h-3.5 w-3.5" />
                Limpar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {alerts
                  .filter(a => a.severity !== 'error')
                  .slice(0, 10)
                  .map(alert => (
                    <AlertCard 
                      key={alert.id} 
                      alert={alert} 
                      onDismiss={() => dismissAlert(alert.id)} 
                    />
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
