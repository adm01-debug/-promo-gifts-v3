import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Grid3X3, List, ArrowUpDown, Building2, FolderTree, X, Sparkles } from "lucide-react";
import { useNoveltiesWithDetails, type NoveltyWithDetails } from "@/hooks/useNovelties";
import { NoveltyBadge } from "@/components/products/NoveltyBadge";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortMode = "recent" | "price" | "name";

/** Days elapsed since product creation */
function daysElapsed(detectedAt: string): number {
  return Math.floor((Date.now() - new Date(detectedAt).getTime()) / 86400000);
}

/** Returns true if product arrived in last 2 days */
function isFresh(detectedAt: string): boolean {
  return daysElapsed(detectedAt) <= 2;
}

function NoveltyCard({ product, viewMode, onClick }: { product: NoveltyWithDetails; viewMode: ViewMode; onClick: () => void }) {
  const fresh = isFresh(product.detected_at);
  const elapsed = daysElapsed(product.detected_at);

  if (viewMode === "list") {
    return (
      <Card 
        className={cn(
          "group cursor-pointer transition-all duration-200",
          "hover:shadow-md hover:border-primary/30",
          fresh && "border-success/30 shadow-[0_0_12px_hsl(var(--success)/0.08)]"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden relative">
            {product.product_image ? (
              <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
            {fresh && (
              <div className="absolute inset-0 ring-2 ring-success/40 rounded-lg" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <NoveltyBadge daysRemaining={product.days_remaining} size="sm" />
            </div>
            <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {product.product_name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {product.product_sku && <p className="text-xs text-muted-foreground">SKU: {product.product_sku}</p>}
              {product.supplier_name && (
                <Badge variant="outline" className="text-[10px] border-info/30 text-info">
                  <Building2 className="h-2.5 w-2.5 mr-0.5" />{product.supplier_name}
                </Badge>
              )}
              {product.category_name && (
                <Badge variant="outline" className="text-[10px]">
                  <FolderTree className="h-2.5 w-2.5 mr-0.5" />{product.category_name}
                </Badge>
              )}
            </div>
          </div>
          {product.base_price != null && product.base_price > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">
                {product.base_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-300",
        "border-border/50 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30",
        fresh && "border-success/30 shadow-[0_0_16px_hsl(var(--success)/0.1)]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
          {product.product_image ? (
            <img 
              src={product.product_image} 
              alt={product.product_name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              loading="lazy" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <NoveltyBadge daysRemaining={product.days_remaining} size="sm" />
          </div>
          {/* Gradient overlay on hover */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-3 space-y-1.5">
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
            {product.product_name}
          </h4>
          <div className="flex items-center justify-between gap-2">
            {product.product_sku && (
              <p className="text-[11px] text-muted-foreground truncate">{product.product_sku}</p>
            )}
            {product.category_name && (
              <Badge variant="outline" className="text-[10px] shrink-0">{product.category_name}</Badge>
            )}
          </div>
          {product.supplier_name && (
            <p className="text-[11px] text-muted-foreground/70 truncate flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />{product.supplier_name}
            </p>
          )}
          {product.base_price != null && product.base_price > 0 && (
            <p className="text-sm font-semibold text-primary tabular-nums">
              {product.base_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NoveltyCardSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <Card className="border-border/50">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-4 w-full rounded shimmer" style={{ animationDelay: '150ms' }} />
            <div className="h-3 w-24 rounded shimmer" style={{ animationDelay: '300ms' }} />
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-square shimmer" />
        <div className="p-3 space-y-2">
          <div className="h-4 w-full rounded shimmer" style={{ animationDelay: '100ms' }} />
          <div className="h-4 w-3/4 rounded shimmer" style={{ animationDelay: '200ms' }} />
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded shimmer" style={{ animationDelay: '300ms' }} />
            <div className="h-5 w-14 rounded shimmer" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoveltyProductGrid() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: novelties, isLoading, error } = useNoveltiesWithDetails({ limit: 200 });
  const products = novelties || [];

  const { suppliers, categories } = useMemo(() => {
    const supMap = new Map<string, { id: string; name: string; count: number }>();
    const catMap = new Map<string, { id: string; name: string; count: number }>();

    products.forEach(p => {
      if (p.supplier_id && p.supplier_name) {
        const existing = supMap.get(p.supplier_id);
        if (existing) existing.count++;
        else supMap.set(p.supplier_id, { id: p.supplier_id, name: p.supplier_name, count: 1 });
      }
      if (p.category_id && p.category_name) {
        const existing = catMap.get(p.category_id);
        if (existing) existing.count++;
        else catMap.set(p.category_id, { id: p.category_id, name: p.category_name, count: 1 });
      }
    });

    return {
      suppliers: [...supMap.values()].sort((a, b) => b.count - a.count),
      categories: [...catMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedSupplier !== "all") {
      filtered = filtered.filter(p => p.supplier_id === selectedSupplier);
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    filtered.sort((a, b) => {
      switch (sortMode) {
        case "price":
          return (b.base_price || 0) - (a.base_price || 0);
        case "name":
          return (a.product_name || "").localeCompare(b.product_name || "", 'pt-BR');
        case "recent":
        default:
          return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
    });

    return filtered;
  }, [products, selectedSupplier, selectedCategory, sortMode]);

  const hasActiveFilters = selectedSupplier !== "all" || selectedCategory !== "all";

  const handleProductClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  const clearFilters = () => {
    setSelectedSupplier("all");
    setSelectedCategory("all");
  };

  if (error) {
    console.error('Erro ao carregar novidades:', error);
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col gap-3">
          {/* Title + View Toggle */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-success" />
              Produtos Novidade
              <Badge variant="secondary" className="text-xs tabular-nums">
                {filteredProducts.length}
                {hasActiveFilters && <span className="text-muted-foreground">/{products.length}</span>}
              </Badge>
            </CardTitle>
            <div className="flex border rounded-lg overflow-hidden">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" aria-label="Grid" className="h-8 w-8 rounded-none" onClick={() => setViewMode("grid")}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" aria-label="Lista" className="h-8 w-8 rounded-none" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <Building2 className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos fornecedores</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <FolderTree className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="price">Maior preço</SelectItem>
                <SelectItem value="name">Nome A-Z</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5">
              {selectedSupplier !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setSelectedSupplier("all")}>
                  <Building2 className="h-3 w-3" />
                  {suppliers.find(s => s.id === selectedSupplier)?.name}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setSelectedCategory("all")}>
                  <FolderTree className="h-3 w-3" />
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className={cn(
            viewMode === "grid" 
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
              : "space-y-3"
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              <NoveltyCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className={cn(
            viewMode === "grid" 
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
              : "space-y-3"
          )}>
            {filteredProducts.map((product, index) => (
              <div 
                key={product.novelty_id}
                className="stagger-item"
                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
              >
                <NoveltyCard
                  product={product}
                  viewMode={viewMode}
                  onClick={() => handleProductClick(product.product_id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              {hasActiveFilters ? "Nenhuma novidade com esses filtros" : "Nenhuma novidade encontrada"}
            </p>
            {hasActiveFilters ? (
              <Button variant="link" className="mt-2 text-sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground/70 mt-1">
                Produtos novos aparecerão aqui automaticamente
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
