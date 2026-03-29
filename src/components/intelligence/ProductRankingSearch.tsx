import { useState, useMemo, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, Minus, Package, Filter, ChevronDown, X, Trophy, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useTrendingProducts, type TrendingProduct } from "@/hooks/useCommercialIntelligence";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1 ano", days: 360 },
];

const LIMIT_OPTIONS = [10, 20, 30, 50];

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ProductRankingSearch() {
  const navigate = useNavigate();
  const { suppliers } = useSuppliers();

  // Local filters for this component
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [days, setDays] = useState(90);
  const [limit, setLimit] = useState(10);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [supOpen, setSupOpen] = useState(false);
  const [supSearch, setSupSearch] = useState("");

  // Debounce search
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    setDebounceTimer(timer);
  }, [debounceTimer]);

  const { data: products, isLoading } = useTrendingProducts(
    days, null, supplierId, null, limit,
    debouncedSearch.trim() || null
  );

  const filteredSuppliers = useMemo(() => {
    if (!supSearch.trim()) return suppliers;
    const q = supSearch.toLowerCase().trim();
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, supSearch]);

  const hasResults = !!(products?.length);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const trendIcon = {
    up: <TrendingUp className="h-3 w-3 text-emerald-500" />,
    down: <TrendingDown className="h-3 w-3 text-red-500" />,
    stable: <Minus className="h-3 w-3 text-muted-foreground" />,
  };

  // Summary KPIs
  const summary = useMemo(() => {
    if (!products?.length) return null;
    const totalRev = products.reduce((s, p) => s + p.totalRevenue, 0);
    const totalQty = products.reduce((s, p) => s + p.totalQuantity, 0);
    const totalOrders = products.reduce((s, p) => s + p.orderCount, 0);
    return { totalRev, totalQty, totalOrders };
  }, [products]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Trophy className="h-3.5 w-3.5 text-white" />
          </div>
          🏆 Ranking de Produtos Mais Vendidos
        </CardTitle>
        <CardDescription className="text-xs">
          Pesquise por tipo de produto, filtre por fornecedor e veja o ranking dos mais vendidos
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Search + Controls */}
        <div className="flex flex-col gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder='Ex: "squeeze metal", "caneta", "mochila"...'
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(""); setDebouncedSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/50">
              {PERIOD_OPTIONS.map((p) => (
                <Button
                  key={p.days}
                  variant={days === p.days ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-6 text-[10px] px-2 rounded-md",
                    days === p.days && "bg-primary shadow-sm"
                  )}
                  onClick={() => setDays(p.days)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Supplier filter */}
            <Popover open={supOpen} onOpenChange={setSupOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 gap-1 text-[11px]",
                    supplierId && "border-primary/50 bg-primary/5 text-primary"
                  )}
                >
                  <Filter className="h-3 w-3" />
                  {supplierName || "Fornecedor"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar fornecedor..." value={supSearch} onValueChange={setSupSearch} />
                  <CommandList>
                    <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => { setSupplierId(null); setSupplierName(null); setSupOpen(false); setSupSearch(""); }}>
                        <span className="text-muted-foreground">Todos os fornecedores</span>
                      </CommandItem>
                      {filteredSuppliers.map((sup) => (
                        <CommandItem
                          key={sup.id}
                          value={sup.id}
                          onSelect={() => { setSupplierId(sup.id); setSupplierName(sup.name); setSupOpen(false); setSupSearch(""); }}
                        >
                          <span className={cn(supplierId === sup.id && "font-semibold text-primary")}>
                            {sup.name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Limit selector */}
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Top</span>
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border/50">
                {LIMIT_OPTIONS.map((n) => (
                  <Button
                    key={n}
                    variant={limit === n ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-5 text-[10px] px-1.5 rounded",
                      limit === n && "bg-primary shadow-sm"
                    )}
                    onClick={() => setLimit(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            {/* Active filters */}
            {(supplierId || debouncedSearch) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-muted-foreground gap-1"
                onClick={() => { setSupplierId(null); setSupplierName(null); setSearchTerm(""); setDebouncedSearch(""); }}
              >
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-foreground">{formatCurrency(summary.totalRev)}</p>
              <p className="text-[10px] text-muted-foreground">Faturamento total</p>
            </div>
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-foreground">{summary.totalQty.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-muted-foreground">Unidades vendidas</p>
            </div>
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-foreground">{summary.totalOrders}</p>
              <p className="text-[10px] text-muted-foreground">Pedidos</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !hasResults && (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Search className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
            <p className="text-xs mt-1">
              {debouncedSearch ? `Nenhum resultado para "${debouncedSearch}"` : 'Sem dados de vendas para os filtros selecionados'}
            </p>
            {debouncedSearch && (
              <p className="text-xs mt-2 text-muted-foreground/60">
                Dica: tente termos mais genéricos como "garrafa", "caneta" ou "mochila"
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {!isLoading && hasResults && (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2.5rem_2.5rem_1fr_5rem_5rem_4rem] gap-2 px-3 py-2 bg-muted/40 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <span>#</span>
              <span></span>
              <span>Produto</span>
              <span className="text-right">Qtd</span>
              <span className="text-right">Receita</span>
              <span className="text-right">Conv.</span>
            </div>

            {products!.map((product, index) => (
              <div
                key={product.productSku || product.productId}
                className="grid grid-cols-[2.5rem_2.5rem_1fr_5rem_5rem_4rem] gap-2 px-3 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors items-center"
                onClick={() => product.productId && navigate(`/produto/${product.productId}`)}
              >
                {/* Rank */}
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0 && "bg-amber-500/20 text-amber-600",
                  index === 1 && "bg-slate-300/30 text-slate-500",
                  index === 2 && "bg-orange-400/20 text-orange-600",
                  index > 2 && "bg-muted text-muted-foreground",
                )}>
                  {index + 1}
                </span>

                {/* Image */}
                <div className="w-9 h-9 rounded-md overflow-hidden bg-muted border border-border/50">
                  {product.productImage ? (
                    <img src={product.productImage} alt="" className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    <HighlightMatch text={product.productName} query={debouncedSearch} />
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {product.productSku && <HighlightMatch text={product.productSku} query={debouncedSearch} />}
                    {product.productSku && ' · '}{product.orderCount} pedidos
                  </p>
                </div>

                {/* Quantity */}
                <div className="text-right">
                  <p className="text-sm font-medium">{product.totalQuantity.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground">un.</p>
                </div>

                {/* Revenue */}
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</p>
                </div>

                {/* Conversion + Trend */}
                <div className="flex items-center gap-1 justify-end">
                  {trendIcon[product.trend]}
                  <span className="text-[10px] text-muted-foreground">{product.conversionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Context info */}
        {hasResults && (
          <p className="text-[10px] text-muted-foreground text-center">
            Top {products!.length} {debouncedSearch ? `para "${debouncedSearch}"` : 'produtos'} 
            {supplierName ? ` · ${supplierName}` : ''} · {days} dias · ordenado por faturamento
          </p>
        )}
      </CardContent>
    </Card>
  );
}
