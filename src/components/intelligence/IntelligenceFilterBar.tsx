import { useState, useMemo } from "react";
import { Filter, X, ChevronDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCategories } from "@/hooks/useCategories";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductsLightweight } from "@/hooks/useProductsLightweight";
import { cn } from "@/lib/utils";

export interface IntelligenceFilters {
  days: number;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  productId: string | null;
  productName: string | null;
}

interface IntelligenceFilterBarProps {
  filters: IntelligenceFilters;
  onFiltersChange: (filters: IntelligenceFilters) => void;
}

const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "15d", days: 15 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "120d", days: 120 },
  { label: "150d", days: 150 },
  { label: "180d", days: 180 },
  { label: "1 ano", days: 360 },
];

export function IntelligenceFilterBar({ filters, onFiltersChange }: IntelligenceFilterBarProps) {
  const { data: categories = [] } = useCategories();
  const { suppliers } = useSuppliers();
  const { data: products = [] } = useProductsLightweight();
  const [catOpen, setCatOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);

  const activeFilterCount =
    (filters.categoryId ? 1 : 0) + (filters.supplierId ? 1 : 0) + (filters.productId ? 1 : 0);

  const clearAll = () => {
    onFiltersChange({ ...filters, categoryId: null, categoryName: null, supplierId: null, supplierName: null, productId: null, productName: null });
  };

  return (
    <div className="space-y-3">
      {/* Period + Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period pills */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/50 overflow-x-auto">
          {PERIOD_OPTIONS.map((p) => (
            <Button
              key={p.days}
              variant={filters.days === p.days ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 text-xs px-2.5 rounded-lg shrink-0 transition-all",
                filters.days === p.days && "bg-primary shadow-sm"
              )}
              onClick={() => onFiltersChange({ ...filters, days: p.days })}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Category Filter */}
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs",
                filters.categoryId && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <Filter className="h-3 w-3" />
              {filters.categoryName || "Categoria"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar categoria..." />
              <CommandList>
                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onFiltersChange({ ...filters, categoryId: null, categoryName: null });
                      setCatOpen(false);
                    }}
                  >
                    <span className="text-muted-foreground">Todas as categorias</span>
                  </CommandItem>
                  {categories.map((cat) => (
                    <CommandItem
                      key={String(cat.id)}
                      value={cat.name}
                      onSelect={() => {
                        onFiltersChange({ ...filters, categoryId: String(cat.id), categoryName: cat.name });
                        setCatOpen(false);
                      }}
                    >
                      <span className={cn(
                        filters.categoryId === String(cat.id) && "font-semibold text-primary"
                      )}>
                        {cat.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Supplier Filter */}
        <Popover open={supOpen} onOpenChange={setSupOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs",
                filters.supplierId && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <Filter className="h-3 w-3" />
              {filters.supplierName || "Fornecedor"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar fornecedor..." />
              <CommandList>
                <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onFiltersChange({ ...filters, supplierId: null, supplierName: null });
                      setSupOpen(false);
                    }}
                  >
                    <span className="text-muted-foreground">Todos os fornecedores</span>
                  </CommandItem>
                  {suppliers.map((sup) => (
                    <CommandItem
                      key={sup.id}
                      value={sup.name}
                      onSelect={() => {
                        onFiltersChange({ ...filters, supplierId: sup.id, supplierName: sup.name });
                        setSupOpen(false);
                      }}
                    >
                      <span className={cn(
                        filters.supplierId === sup.id && "font-semibold text-primary"
                      )}>
                        {sup.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Product Filter */}
        <Popover open={prodOpen} onOpenChange={setProdOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs",
                filters.productId && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <Package className="h-3 w-3" />
              {filters.productName ? (filters.productName.length > 20 ? filters.productName.slice(0, 20) + '…' : filters.productName) : "Produto"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar produto por nome ou SKU..." />
              <CommandList className="max-h-64">
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onFiltersChange({ ...filters, productId: null, productName: null });
                      setProdOpen(false);
                    }}
                  >
                    <span className="text-muted-foreground">Todos os produtos</span>
                  </CommandItem>
                  {products.map((prod) => (
                    <CommandItem
                      key={prod.id}
                      value={`${prod.name} ${prod.sku || ''}`}
                      onSelect={() => {
                        onFiltersChange({ ...filters, productId: prod.id, productName: prod.name });
                        setProdOpen(false);
                      }}
                    >
                      <div className={cn(
                        "flex flex-col",
                        filters.productId === prod.id && "font-semibold text-primary"
                      )}>
                        <span className="text-sm truncate">{prod.name}</span>
                        {prod.sku && <span className="text-[10px] text-muted-foreground">{prod.sku}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Active filter count + clear */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={clearAll}>
            <X className="h-3 w-3" />
            Limpar filtros
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.productName && (
            <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 bg-primary/5 border-primary/20">
              Produto: {filters.productName}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => onFiltersChange({ ...filters, productId: null, productName: null })}
              />
            </Badge>
          )}
          {filters.categoryName && (
            <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 bg-primary/5 border-primary/20">
              Categoria: {filters.categoryName}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => onFiltersChange({ ...filters, categoryId: null, categoryName: null })}
              />
            </Badge>
          )}
          {filters.supplierName && (
            <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 bg-primary/5 border-primary/20">
              Fornecedor: {filters.supplierName}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => onFiltersChange({ ...filters, supplierId: null, supplierName: null })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
