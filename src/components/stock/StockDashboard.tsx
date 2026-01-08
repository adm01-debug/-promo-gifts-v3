import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpDown,
  X,
  Bell,
  PackageX,
  Boxes
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  useStockDashboard, 
  StockStatus, 
  StockItem, 
  StockAlert,
  defaultStockFilters 
} from "@/hooks/useStockDashboard";

const STATUS_CONFIG: Record<StockStatus, { 
  label: string; 
  color: string; 
  bgColor: string; 
  icon: React.ElementType;
  progress: number;
}> = {
  in_stock: { 
    label: 'Em Estoque', 
    color: 'text-success', 
    bgColor: 'bg-success/10',
    icon: CheckCircle,
    progress: 100
  },
  low_stock: { 
    label: 'Estoque Baixo', 
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    icon: TrendingDown,
    progress: 40
  },
  critical: { 
    label: 'Crítico', 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    icon: AlertTriangle,
    progress: 15
  },
  out_of_stock: { 
    label: 'Sem Estoque', 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/20',
    icon: XCircle,
    progress: 0
  },
  overstocked: { 
    label: 'Excesso', 
    color: 'text-info', 
    bgColor: 'bg-info/10',
    icon: TrendingUp,
    progress: 100
  },
};

interface StockDashboardProps {
  className?: string;
  compact?: boolean;
}

export function StockDashboard({ className, compact = false }: StockDashboardProps) {
  const {
    isLoading,
    stockItems,
    summary,
    alerts,
    criticalAlerts,
    filters,
    updateFilter,
    resetFilters,
    dismissAlert,
    fetchStockData,
  } = useStockDashboard();

  const [showAlerts, setShowAlerts] = useState(true);

  // Summary Cards
  const summaryCards = [
    { label: 'Total Produtos', value: summary.totalProducts, icon: Package, color: 'text-primary' },
    { label: 'Em Estoque', value: summary.inStock, icon: CheckCircle, color: 'text-success' },
    { label: 'Estoque Baixo', value: summary.lowStock, icon: TrendingDown, color: 'text-warning' },
    { label: 'Crítico', value: summary.critical, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Sem Estoque', value: summary.outOfStock, icon: XCircle, color: 'text-destructive' },
  ];

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              Visão de Estoque
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => fetchStockData()}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mini Summary */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'OK', value: summary.inStock, color: 'bg-success' },
              { label: 'Baixo', value: summary.lowStock, color: 'bg-warning' },
              { label: 'Crítico', value: summary.critical, color: 'bg-destructive' },
              { label: 'Zerado', value: summary.outOfStock, color: 'bg-destructive/50' },
            ].map((item) => (
              <div key={item.label} className="text-center p-2 rounded-lg bg-muted/50">
                <div className={cn("w-2 h-2 rounded-full mx-auto mb-1", item.color)}></div>
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {criticalAlerts.length} alerta(s) crítico(s)
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" />
            Dashboard de Estoque
          </h2>
          <p className="text-muted-foreground">
            Monitore o estoque em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAlerts(!showAlerts)}>
            <Bell className={cn("h-4 w-4 mr-2", criticalAlerts.length > 0 && "text-destructive")} />
            Alertas
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">{criticalAlerts.length}</Badge>
            )}
          </Button>
          <Button variant="outline" onClick={() => fetchStockData()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alerts Panel */}
      <AnimatePresence>
        {showAlerts && alerts.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas de Estoque ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {alerts.slice(0, 10).map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          alert.severity === 'error' ? 'bg-destructive/10' : 'bg-warning/10'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {alert.severity === 'error' ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{alert.productName}</p>
                            <p className="text-xs text-muted-foreground">{alert.message}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <Icon className={cn("h-5 w-5", card.color)} />
                    <span className="text-2xl font-bold">{card.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter('status', value as StockStatus | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="in_stock">Em Estoque</SelectItem>
                <SelectItem value="low_stock">Estoque Baixo</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
                <SelectItem value="overstocked">Excesso</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter('sortBy', value as typeof filters.sortBy)}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome A-Z</SelectItem>
                <SelectItem value="stock_asc">Menor Estoque</SelectItem>
                <SelectItem value="stock_desc">Maior Estoque</SelectItem>
                <SelectItem value="days_remaining">Dias Restantes</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" onClick={resetFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Produtos ({stockItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : stockItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PackageX className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-center">Nível</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.slice(0, 50).map((item, index) => {
                    const statusConfig = STATUS_CONFIG[item.status];
                    const StatusIcon = statusConfig.icon;
                    const stockPercentage = item.minStock > 0 
                      ? Math.min(100, (item.currentStock / item.minStock) * 100)
                      : 100;

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="group"
                      >
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {item.sku}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className={cn(statusConfig.bgColor, statusConfig.color, "gap-1")}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{statusConfig.label}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.currentStock}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.minStock}
                        </TableCell>
                        <TableCell>
                          <Progress 
                            value={stockPercentage} 
                            className={cn(
                              "h-2",
                              item.status === 'critical' && "[&>div]:bg-destructive",
                              item.status === 'low_stock' && "[&>div]:bg-warning",
                              item.status === 'in_stock' && "[&>div]:bg-success"
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {item.daysUntilStockout !== undefined ? (
                            <div className="flex items-center justify-end gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className={cn(
                                item.daysUntilStockout <= 7 && "text-destructive font-medium",
                                item.daysUntilStockout <= 30 && item.daysUntilStockout > 7 && "text-warning"
                              )}>
                                {item.daysUntilStockout}d
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Mini widget for sidebar/cards
export function StockStatusWidget({ className }: { className?: string }) {
  const { summary, criticalAlerts } = useStockDashboard();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-success"></div>
        <span className="text-xs">{summary.inStock}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-warning"></div>
        <span className="text-xs">{summary.lowStock}</span>
      </div>
      {criticalAlerts.length > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div>
          <span className="text-xs text-destructive">{criticalAlerts.length}</span>
        </div>
      )}
    </div>
  );
}
