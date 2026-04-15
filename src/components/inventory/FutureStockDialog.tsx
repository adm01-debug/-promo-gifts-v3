import { useState, useMemo } from "react";
import {
  Truck, Search, Calendar, Package, Filter, CheckCircle2,
  Clock, ArrowUpDown, ChevronDown, X, TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FutureStockEntry } from "@/types/stock";

interface FutureStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: FutureStockEntry[];
}

type SortField = 'date' | 'quantity' | 'product' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'in_transit';
type DateRange = 'all' | '7d' | '15d' | '30d' | '60d' | '90d';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: 'Confirmado', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  pending: { label: 'Pendente', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  in_transit: { label: 'Em Trânsito', color: 'bg-primary/10 text-primary border-primary/20', icon: Truck },
};

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'Todas as datas',
  '7d': 'Próx. 7 dias',
  '15d': 'Próx. 15 dias',
  '30d': 'Próx. 30 dias',
  '60d': 'Próx. 60 dias',
  '90d': 'Próx. 90 dias',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysLabel(days: number): { text: string; urgency: 'ok' | 'soon' | 'imminent' } {
  if (days < 0) return { text: `${Math.abs(days)}d atrasado`, urgency: 'imminent' };
  if (days === 0) return { text: 'Hoje', urgency: 'imminent' };
  if (days <= 3) return { text: `Em ${days}d`, urgency: 'imminent' };
  if (days <= 7) return { text: `Em ${days}d`, urgency: 'soon' };
  return { text: `Em ${days}d`, urgency: 'ok' };
}

export function FutureStockDialog({ open, onOpenChange, entries }: FutureStockDialogProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    let items = [...entries];

    // Search
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(e =>
        e.productName?.toLowerCase().includes(q) ||
        e.productSku?.toLowerCase().includes(q) ||
        e.colorName?.toLowerCase().includes(q)
      );
    }

    // Status
    if (statusFilter !== 'all') {
      items = items.filter(e => e.status === statusFilter);
    }

    // Date range
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      items = items.filter(e => new Date(e.expectedDate) <= cutoff);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
          break;
        case 'quantity':
          cmp = a.expectedQuantity - b.expectedQuantity;
          break;
        case 'product':
          cmp = (a.productName || '').localeCompare(b.productName || '');
          break;
        case 'status': {
          const order = { confirmed: 0, in_transit: 1, pending: 2 };
          cmp = (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [entries, search, statusFilter, dateRange, sortField, sortDir]);

  // Summary stats
  const stats = useMemo(() => {
    const totalUnits = filtered.reduce((s, e) => s + e.expectedQuantity, 0);
    const confirmed = filtered.filter(e => e.status === 'confirmed');
    const confirmedUnits = confirmed.reduce((s, e) => s + e.expectedQuantity, 0);
    const uniqueProducts = new Set(filtered.map(e => e.productId)).size;
    const nextDate = filtered.length > 0
      ? filtered.reduce((min, e) => e.expectedDate < min ? e.expectedDate : min, filtered[0].expectedDate)
      : null;
    return { totalUnits, confirmedUnits, uniqueProducts, nextDate, total: filtered.length };
  }, [filtered]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (dateRange !== 'all' ? 1 : 0) + (search ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Previsão de Reposição
            <Badge variant="secondary" className="ml-1 font-normal">
              {entries.length} previsões
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Acompanhe todas as reposições previstas — filtre por data, status ou produto para planejar suas vendas.
          </DialogDescription>
        </DialogHeader>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Total Previsto</p>
            <p className="text-xl font-bold text-primary">{stats.totalUnits.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground">{stats.total} reposições</p>
          </div>
          <div className="rounded-lg bg-success/5 border border-success/10 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Confirmado</p>
            <p className="text-xl font-bold text-success">{stats.confirmedUnits.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground">unidades confirmadas</p>
          </div>
          <div className="rounded-lg bg-muted/50 border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Produtos</p>
            <p className="text-xl font-bold">{stats.uniqueProducts}</p>
            <p className="text-[10px] text-muted-foreground">com reposição</p>
          </div>
          <div className="rounded-lg bg-muted/50 border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Próx. Chegada</p>
            <p className="text-lg font-bold">
              {stats.nextDate ? getDaysLabel(daysUntil(stats.nextDate)).text : '-'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {stats.nextDate ? formatDate(stats.nextDate) : 'sem previsão'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto, SKU ou cor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="confirmed">✅ Confirmado</SelectItem>
              <SelectItem value="pending">⏳ Pendente</SelectItem>
              <SelectItem value="in_transit">🚚 Em Trânsito</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={v => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[160px] h-9">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs"
              onClick={() => { setSearch(''); setStatusFilter('all'); setDateRange('all'); }}>
              <X className="h-3.5 w-3.5" /> Limpar ({activeFilters})
            </Button>
          )}
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_120px_100px_90px] gap-2 px-3 py-2 bg-muted/30 rounded-md text-xs font-medium text-muted-foreground">
          <button type="button" onClick={() => toggleSort('product')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Produto
            {sortField === 'product' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button type="button" onClick={() => toggleSort('quantity')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Qtd.
            {sortField === 'quantity' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button type="button" onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Previsão
            {sortField === 'date' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button type="button" onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Status
            {sortField === 'status' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <span className="text-right">Tempo</span>
        </div>

        {/* Entries List */}
        <ScrollArea className="flex-1 max-h-[40vh]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mb-3 opacity-50" />
              <p className="font-medium">Nenhuma reposição encontrada</p>
              <p className="text-sm">Ajuste os filtros para ver as previsões.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(entry => {
                const days = daysUntil(entry.expectedDate);
                const daysInfo = getDaysLabel(days);
                const statusConf = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "grid grid-cols-[1fr_100px_120px_100px_90px] gap-2 px-3 py-2.5 rounded-md border transition-colors",
                      "hover:bg-muted/30",
                      daysInfo.urgency === 'imminent' && "border-primary/30 bg-primary/5",
                      daysInfo.urgency === 'soon' && "border-warning/20 bg-warning/5",
                      daysInfo.urgency === 'ok' && "border-border",
                    )}
                  >
                    {/* Product */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={entry.productName}>
                        {entry.productName || 'Produto'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {entry.productSku && (
                          <span className="text-[10px] text-muted-foreground font-mono">{entry.productSku}</span>
                        )}
                        {entry.colorName && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {entry.colorName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center">
                      <span className="text-sm font-bold tabular-nums text-primary">
                        +{entry.expectedQuantity.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground">{formatDate(entry.expectedDate)}</span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      <Badge variant="outline" className={cn("text-[10px] gap-1 px-1.5 py-0.5", statusConf.color)}>
                        <statusConf.icon className="h-2.5 w-2.5" />
                        {statusConf.label}
                      </Badge>
                    </div>

                    {/* Days until */}
                    <div className="flex items-center justify-end">
                      <span className={cn(
                        "text-xs font-medium tabular-nums",
                        daysInfo.urgency === 'imminent' && "text-primary",
                        daysInfo.urgency === 'soon' && "text-warning",
                        daysInfo.urgency === 'ok' && "text-muted-foreground",
                      )}>
                        {daysInfo.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer summary */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>
              Mostrando {filtered.length} de {entries.length} previsões
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" />
              Total: <strong className="text-foreground">{stats.totalUnits.toLocaleString('pt-BR')} un.</strong> previstas
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
