/**
 * StockFilterToolbar — Advanced filter bar for Stock Dashboard
 * Filters: search, category, supplier, color, status, min quantity needed, alerts-only
 */
import { useState, useEffect } from "react";
import {
  Search, X, Building2, FolderTree, Palette, PackageCheck,
  ShoppingCart, AlertTriangle, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StockCategoryTreeSelect } from "./StockCategoryTreeSelect";
import { InlineColorGroupFilter } from "@/components/filters/InlineColorGroupFilter";
import type { StockFilters, StockStatus } from "@/types/stock";
import { motion, AnimatePresence } from "framer-motion";

interface FilterOption {
  name: string;
  count: number;
}

interface StockFilterToolbarProps {
  filters: StockFilters;
  onUpdateFilter: <K extends keyof StockFilters>(key: K, value: StockFilters[K]) => void;
  onResetFilters: () => void;
  categories: FilterOption[];
  suppliers: FilterOption[];
  colors: string[];
  colorGroups: FilterOption[];
  totalProducts: number;
  filteredCount: number;
}

const STATUS_OPTIONS: { value: StockStatus | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'Todos', icon: <PackageCheck className="h-3.5 w-3.5" />, color: 'text-foreground' },
  { value: 'in_stock', label: 'Em Estoque', icon: <PackageCheck className="h-3.5 w-3.5" />, color: 'text-success' },
  { value: 'low_stock', label: 'Baixo', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-warning' },
  { value: 'critical', label: 'Crítico', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-destructive' },
  { value: 'out_of_stock', label: 'Esgotado', icon: <X className="h-3.5 w-3.5" />, color: 'text-destructive' },
  { value: 'incoming', label: 'Chegando', icon: <ShoppingCart className="h-3.5 w-3.5" />, color: 'text-primary' },
];

export function StockFilterToolbar({
  filters, onUpdateFilter, onResetFilters,
  categories, suppliers, colors, colorGroups,
  totalProducts, filteredCount,
}: StockFilterToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [quantityInput, setQuantityInput] = useState(filters.minQuantityNeeded?.toString() || '');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => onUpdateFilter('search', localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  // Debounce quantity
  useEffect(() => {
    const t = setTimeout(() => {
      const num = parseInt(quantityInput) || 0;
      onUpdateFilter('minQuantityNeeded', num > 0 ? num : undefined);
    }, 500);
    return () => clearTimeout(t);
  }, [quantityInput]);

  const activeFiltersCount = [
    filters.status !== 'all',
    !!filters.categoryId,
    !!filters.supplierId,
    !!filters.colorName || !!filters.colorGroup,
    !!filters.minQuantityNeeded && filters.minQuantityNeeded > 0,
    filters.showOnlyWithAlerts,
    !!filters.search,
  ].filter(Boolean).length;

  const handleReset = () => {
    setLocalSearch('');
    setQuantityInput('');
    onResetFilters();
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* 1. Advanced Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="gap-2 relative">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge className="bg-primary text-primary-foreground h-5 min-w-5 text-[10px] px-1.5">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <ScrollArea className="max-h-[70vh]">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtros Avançados
                  </h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-7 text-muted-foreground">
                      Limpar tudo
                    </Button>
                  )}
                </div>
                <Separator />

                {/* Category Filter — Full Tree */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FolderTree className="h-3.5 w-3.5 text-primary" />
                    Categoria
                  </Label>
                  <StockCategoryTreeSelect
                    value={filters.categoryId}
                    onChange={(id, name) => onUpdateFilter('categoryId', id || undefined)}
                  />
                </div>

                {/* Supplier Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Fornecedor
                  </Label>
                  <Select
                    value={filters.supplierId || '__all__'}
                    onValueChange={(v) => onUpdateFilter('supplierId', v === '__all__' ? undefined : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos os fornecedores" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      <SelectItem value="__all__" className="text-xs">Todos ({totalProducts})</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.name} value={s.name} className="text-xs">
                          {s.name} ({s.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color Filter — Visual Swatches (same as Super Filtro) */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    Cores
                  </Label>
                  <InlineColorGroupFilter
                    selection={{ groups: filters.colorGroup ? [filters.colorGroup] : [], variations: [], nuances: [] }}
                    onChange={(sel) => {
                      const selected = sel.groups.length > 0 ? sel.groups[sel.groups.length - 1] : undefined;
                      onUpdateFilter('colorGroup', selected);
                      onUpdateFilter('colorName', undefined);
                    }}
                    showNuances={false}
                    showVariations={false}
                  />
                </div>

                <Separator />

                {/* Alerts only toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5 cursor-pointer">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    Somente com alertas
                  </Label>
                  <Switch
                    checked={filters.showOnlyWithAlerts}
                    onCheckedChange={(v) => onUpdateFilter('showOnlyWithAlerts', v)}
                  />
                </div>

                {/* Sort */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ordenar por</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(v) => onUpdateFilter('sortBy', v as StockFilters['sortBy'])}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock_quantity" className="text-xs">Menor Estoque</SelectItem>
                      <SelectItem value="name" className="text-xs">Nome (A-Z)</SelectItem>
                      <SelectItem value="available_stock" className="text-xs">Disponibilidade</SelectItem>
                      <SelectItem value="days_remaining" className="text-xs">Dias Restantes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* 2. Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto, SKU ou cor..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {localSearch && (
            <button onClick={() => setLocalSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 3. Smart Quantity Filter (Tiragem) */}
        <div className="relative w-full sm:w-48">
          <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Preciso de X un..."
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className="pl-9"
            min={0}
          />
        </div>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={handleReset} size="icon" className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Row 2: Status Quick Chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onUpdateFilter('status', opt.value)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
              filters.status === opt.value
                ? opt.value === 'critical' || opt.value === 'out_of_stock'
                  ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
                  : opt.value === 'low_stock'
                    ? "bg-warning/15 text-warning ring-1 ring-warning/30"
                    : opt.value === 'in_stock'
                      ? "bg-success/15 text-success ring-1 ring-success/30"
                      : "bg-primary/15 text-primary ring-1 ring-primary/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Active Filters Badges */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-1.5 overflow-hidden"
          >
            {filters.categoryId && (
              <Badge variant="secondary" className="gap-1 text-xs pr-1">
                <FolderTree className="h-3 w-3" />
                {filters.categoryId}
                <button onClick={() => onUpdateFilter('categoryId', undefined)} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.supplierId && (
              <Badge variant="secondary" className="gap-1 text-xs pr-1">
                <Building2 className="h-3 w-3" />
                {filters.supplierId}
                <button onClick={() => onUpdateFilter('supplierId', undefined)} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.colorName || filters.colorGroup) && (
              <Badge variant="secondary" className="gap-1 text-xs pr-1">
                <Palette className="h-3 w-3" />
                {filters.colorName || filters.colorGroup}
                <button onClick={() => { onUpdateFilter('colorName', undefined); onUpdateFilter('colorGroup', undefined); }} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.minQuantityNeeded && filters.minQuantityNeeded > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs pr-1">
                <ShoppingCart className="h-3 w-3" />
                ≥ {filters.minQuantityNeeded} un
                <button onClick={() => { setQuantityInput(''); onUpdateFilter('minQuantityNeeded', undefined); }} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.showOnlyWithAlerts && (
              <Badge variant="secondary" className="gap-1 text-xs pr-1">
                <AlertTriangle className="h-3 w-3" />
                Com alertas
                <button onClick={() => onUpdateFilter('showOnlyWithAlerts', false)} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            <span className="text-xs text-muted-foreground flex items-center ml-1">
              <Sparkles className="h-3 w-3 mr-1" />
              {filteredCount} de {totalProducts} produtos
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
