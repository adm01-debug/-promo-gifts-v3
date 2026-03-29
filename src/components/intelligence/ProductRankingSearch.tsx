import { useState, useMemo, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, Minus, Package, Filter, ChevronDown, X, Trophy, Hash, Medal, Tag, DollarSign, ShoppingBag, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useTrendingProducts, type TrendingProduct } from "@/hooks/useCommercialIntelligence";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCategories } from "@/hooks/useCategories";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/excelExport";
import { toast } from "sonner";

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

function RankBadge({ index }: { index: number }) {
  if (index === 0) return <span className="text-base" title="1º lugar">🥇</span>;
  if (index === 1) return <span className="text-base" title="2º lugar">🥈</span>;
  if (index === 2) return <span className="text-base" title="3º lugar">🥉</span>;
  return (
    <span className={cn(
      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
      "bg-muted text-muted-foreground",
    )}>
      {index + 1}
    </span>
  );
}

function ABCBadge({ revenue, topRevenue }: { revenue: number; topRevenue: number }) {
  const ratio = topRevenue > 0 ? revenue / topRevenue : 0;
  if (ratio >= 0.5) return <Badge variant="default" className="text-[9px] h-4 px-1 bg-emerald-600 hover:bg-emerald-600">🔥 A</Badge>;
  if (ratio >= 0.2) return <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">⚡ B</Badge>;
  return <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">📦 C</Badge>;
}

export function ProductRankingSearch() {
  const navigate = useNavigate();
  const { suppliers } = useSuppliers();
  const { data: categories = [] } = useCategories();

  // Local filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [days, setDays] = useState(90);
  const [limit, setLimit] = useState(10);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [supOpen, setSupOpen] = useState(false);
  const [supSearch, setSupSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  // Debounce
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    setDebounceTimer(timer);
  }, [debounceTimer]);

  const { data: products, isLoading } = useTrendingProducts(
    days, categoryId, supplierId, null, limit,
    debouncedSearch.trim() || null
  );

  const filteredSuppliers = useMemo(() => {
    if (!supSearch.trim()) return suppliers;
    const q = supSearch.toLowerCase().trim();
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, supSearch]);

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.toLowerCase().trim();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const hasResults = !!(products?.length);
  const hasActiveFilters = !!(supplierId || categoryId || debouncedSearch);

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
    const avgTicket = totalOrders > 0 ? totalRev / totalOrders : 0;
    return { totalRev, totalQty, totalOrders, avgTicket };
  }, [products]);

  const topRevenue = products?.[0]?.totalRevenue || 0;

  // Export
  const handleExport = async () => {
    if (!products?.length) return;
    try {
      await exportToExcel({
        filename: `ranking-produtos${supplierName ? `-${supplierName}` : ''}`,
        sheetName: 'Ranking Produtos',
        columns: [
          { key: 'rank', header: '#', width: 5 },
          { key: 'productName', header: 'Produto', width: 40 },
          { key: 'productSku', header: 'SKU', width: 15 },
          { key: 'totalQuantity', header: 'Qtd Vendida', width: 12 },
          { key: 'orderCount', header: 'Pedidos', width: 10 },
          { key: 'totalRevenue', header: 'Receita (R$)', width: 15, format: (v: number) => Number(v.toFixed(2)) },
          { key: 'avgUnitPrice', header: 'Preço Médio Un.', width: 15, format: (v: number) => Number(v.toFixed(2)) },
          { key: 'conversionRate', header: 'Conversão (%)', width: 12 },
          { key: 'trend', header: 'Tendência', width: 10 },
        ],
        data: products.map((p, i) => ({
          ...p,
          rank: i + 1,
          avgUnitPrice: p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0,
        })),
        includeTimestamp: true,
      });
      toast.success('Ranking exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar ranking');
    }
  };

  const clearAllFilters = () => {
    setSupplierId(null); setSupplierName(null);
    setCategoryId(null); setCategoryName(null);
    setSearchTerm(""); setDebouncedSearch("");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Trophy className="h-3.5 w-3.5 text-white" />
              </div>
              🏆 Ranking de Produtos Mais Vendidos
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Pesquise por tipo de produto, filtre por fornecedor/categoria e veja o ranking dos mais vendidos
            </CardDescription>
          </div>
          {hasResults && (
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5" onClick={handleExport}>
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
        </div>
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

            {/* Category filter */}
            <Popover open={catOpen} onOpenChange={setCatOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 gap-1 text-[11px]",
                    categoryId && "border-primary/50 bg-primary/5 text-primary"
                  )}
                >
                  <Tag className="h-3 w-3" />
                  {categoryName || "Categoria"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar categoria..." value={catSearch} onValueChange={setCatSearch} />
                  <CommandList>
                    <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => { setCategoryId(null); setCategoryName(null); setCatOpen(false); setCatSearch(""); }}>
                        <span className="text-muted-foreground">Todas as categorias</span>
                      </CommandItem>
                      {filteredCategories.map((cat) => (
                        <CommandItem
                          key={String(cat.id)}
                          value={String(cat.id)}
                          onSelect={() => { setCategoryId(String(cat.id)); setCategoryName(cat.name); setCatOpen(false); setCatSearch(""); }}
                        >
                          <span className={cn(categoryId === String(cat.id) && "font-semibold text-primary")}>
                            {catSearch ? <HighlightMatch text={cat.name} query={catSearch} /> : cat.name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

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
                            {supSearch ? <HighlightMatch text={sup.name} query={supSearch} /> : sup.name}
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

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-muted-foreground gap-1"
                onClick={clearAllFilters}
              >
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <DollarSign className="h-3 w-3 text-emerald-500" />
              </div>
              <p className="text-base sm:text-lg font-bold text-foreground">{formatCurrency(summary.totalRev)}</p>
              <p className="text-[10px] text-muted-foreground">Faturamento</p>
            </div>
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <ShoppingBag className="h-3 w-3 text-blue-500" />
              </div>
              <p className="text-base sm:text-lg font-bold text-foreground">{summary.totalQty.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-muted-foreground">Unidades</p>
            </div>
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <BarChart3 className="h-3 w-3 text-violet-500" />
              </div>
              <p className="text-base sm:text-lg font-bold text-foreground">{summary.totalOrders}</p>
              <p className="text-[10px] text-muted-foreground">Pedidos</p>
            </div>
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Medal className="h-3 w-3 text-amber-500" />
              </div>
              <p className="text-base sm:text-lg font-bold text-foreground">{formatCurrency(summary.avgTicket)}</p>
              <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
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
            {/* Header — hidden on mobile, visible sm+ */}
            <div className="hidden sm:grid grid-cols-[2rem_2.5rem_1fr_4.5rem_5rem_5rem_4rem] gap-2 px-3 py-2 bg-muted/40 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <span>#</span>
              <span></span>
              <span>Produto</span>
              <span className="text-right">Qtd</span>
              <span className="text-right">Receita</span>
              <span className="text-right">P.Médio</span>
              <span className="text-right">Conv.</span>
            </div>

            {products!.map((product, index) => {
              const avgUnit = product.totalQuantity > 0 ? product.totalRevenue / product.totalQuantity : 0;
              return (
                <div
                  key={product.productSku || product.productId || index}
                  className={cn(
                    "grid gap-2 px-3 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors items-center",
                    "grid-cols-[2rem_2.5rem_1fr_auto] sm:grid-cols-[2rem_2.5rem_1fr_4.5rem_5rem_5rem_4rem]",
                    index < 3 && "bg-primary/[0.02]"
                  )}
                  onClick={() => product.productId && navigate(`/produto/${product.productId}`)}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    <RankBadge index={index} />
                  </div>

                  {/* Image */}
                  <div className="w-9 h-9 rounded-md overflow-hidden bg-muted border border-border/50 flex-shrink-0">
                    {product.productImage ? (
                      <img src={product.productImage} alt="" className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Name + Meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">
                        <HighlightMatch text={product.productName} query={debouncedSearch} />
                      </p>
                      <ABCBadge revenue={product.totalRevenue} topRevenue={topRevenue} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                      {product.productSku && <HighlightMatch text={product.productSku} query={debouncedSearch} />}
                      {product.productSku && ' · '}{product.orderCount} pedidos
                      {/* Mobile inline stats */}
                      <span className="sm:hidden"> · {product.totalQuantity.toLocaleString('pt-BR')} un. · {formatCurrency(product.totalRevenue)}</span>
                    </div>
                  </div>

                  {/* Mobile trend indicator */}
                  <div className="flex items-center gap-1 sm:hidden">
                    {trendIcon[product.trend]}
                  </div>

                  {/* Quantity — desktop */}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium">{product.totalQuantity.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground">un.</p>
                  </div>

                  {/* Revenue — desktop */}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</p>
                  </div>

                  {/* Avg unit price — desktop */}
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-muted-foreground">{formatCurrency(avgUnit)}</p>
                    <p className="text-[9px] text-muted-foreground/70">p/ un.</p>
                  </div>

                  {/* Conversion + Trend — desktop */}
                  <div className="hidden sm:flex items-center gap-1 justify-end">
                    {trendIcon[product.trend]}
                    <span className="text-[10px] text-muted-foreground">{product.conversionRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Context info */}
        {hasResults && (
          <p className="text-[10px] text-muted-foreground text-center">
            Top {products!.length} {debouncedSearch ? `para "${debouncedSearch}"` : 'produtos'} 
            {categoryName ? ` · ${categoryName}` : ''}
            {supplierName ? ` · ${supplierName}` : ''} · {days} dias · ordenado por faturamento
          </p>
        )}
      </CardContent>
    </Card>
  );
}
