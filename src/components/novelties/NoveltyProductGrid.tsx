import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, ArrowUpDown, Building2, FolderTree, X, Sparkles, Search, CheckSquare, Loader2 } from "lucide-react";
import { useNoveltiesWithDetails, type NoveltyWithDetails } from "@/hooks/useNovelties";
import { useNoveltiesSelectionMode } from "@/hooks/useNoveltiesSelectionMode";
import { NoveltyBadge } from "@/components/products/NoveltyBadge";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { BulkActionBar } from "@/components/products/BulkActionBar";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import { BulkAddToCartModal } from "@/components/catalog/BulkAddToCartModal";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

type ViewMode = "grid" | "list" | "table";
type SortMode = "name" | "price-asc" | "price-desc" | "newest" | "stock" | "best-seller-supplier" | "best-seller-promo";

function daysElapsed(detectedAt: string): number {
  return Math.floor((Date.now() - new Date(detectedAt).getTime()) / 86400000);
}

function isFresh(detectedAt: string): boolean {
  return daysElapsed(detectedAt) <= 2;
}

function getGridColsClass(cols: ColumnCount): string {
  switch (cols) {
    case 3: return "grid-cols-2 sm:grid-cols-3";
    case 4: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    case 5: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
    case 6: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7";
    case 8: return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10";
    default: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }
}

interface NoveltyCardProps {
  product: NoveltyWithDetails;
  onClick: () => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function NoveltyGridCard({ product, onClick, selectionMode, isSelected, onToggleSelect }: NoveltyCardProps) {
  const fresh = isFresh(product.detected_at);
  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-300",
        "border-border/50 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30",
        fresh && "border-success/30 shadow-[0_0_16px_hsl(var(--success)/0.1)]",
        isSelected && "ring-2 ring-primary border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
      )}
      onClick={selectionMode ? onToggleSelect : onClick}
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
          {/* Selection checkbox */}
          {selectionMode && (
            <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
              <SelectionCheckbox
                checked={isSelected}
                onChange={onToggleSelect}
                size="md"
                animateEntry
              />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <NoveltyBadge daysRemaining={product.days_remaining} size="sm" />
          </div>
          {fresh && !selectionMode && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-success/90 text-success-foreground text-[9px] px-1.5 py-0 gap-0.5 border-0">
                <Sparkles className="h-2.5 w-2.5" />NEW
              </Badge>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-2.5 space-y-1">
          <h4 className="font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug min-h-[2rem]">
            {product.product_name}
          </h4>
          <div className="flex items-center justify-between gap-1">
            {product.product_sku && (
              <p className="text-[10px] text-muted-foreground truncate">{product.product_sku}</p>
            )}
            {product.category_name && (
              <Badge variant="outline" className="text-[9px] shrink-0 px-1 py-0">{product.category_name}</Badge>
            )}
          </div>
          {product.supplier_name && (
            <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1">
              <Building2 className="h-2.5 w-2.5 shrink-0" />{product.supplier_name}
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

function NoveltyListCard({ product, onClick, selectionMode, isSelected, onToggleSelect }: NoveltyCardProps) {
  const fresh = isFresh(product.detected_at);
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/30",
        fresh && "border-success/30 shadow-[0_0_12px_hsl(var(--success)/0.08)]",
        isSelected && "ring-2 ring-primary border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
      )}
      onClick={selectionMode ? onToggleSelect : onClick}
    >
      <CardContent className="p-2.5 flex items-center gap-2.5">
        {/* Selection checkbox */}
        {selectionMode && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <SelectionCheckbox
              checked={isSelected}
              onChange={onToggleSelect}
              size="md"
              animateEntry
            />
          </div>
        )}
        <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted overflow-hidden relative">
          {product.product_image ? (
            <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground/30" />
            </div>
          )}
          {fresh && <div className="absolute inset-0 ring-2 ring-success/40 rounded-lg" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <NoveltyBadge daysRemaining={product.days_remaining} size="sm" />
            {fresh && (
              <Badge className="bg-success/90 text-success-foreground text-[9px] px-1 py-0 border-0">NEW</Badge>
            )}
          </div>
          <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {product.product_name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {product.product_sku && <p className="text-[10px] text-muted-foreground">SKU: {product.product_sku}</p>}
            {product.supplier_name && (
              <Badge variant="outline" className="text-[9px] border-info/30 text-info px-1 py-0">
                <Building2 className="h-2.5 w-2.5 mr-0.5" />{product.supplier_name}
              </Badge>
            )}
            {product.category_name && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
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

function NoveltyTableView({ 
  products, onProductClick, selectionMode, selectedIds, onToggleSelect 
}: { 
  products: NoveltyWithDetails[]; 
  onProductClick: (id: string) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {selectionMode && <TableHead className="w-[40px] px-2"></TableHead>}
            <TableHead className="w-[44px] px-2">Img</TableHead>
            <TableHead className="px-2">Produto</TableHead>
            <TableHead className="hidden sm:table-cell px-2">SKU</TableHead>
            <TableHead className="hidden md:table-cell px-2">Fornecedor</TableHead>
            <TableHead className="hidden lg:table-cell px-2">Categoria</TableHead>
            <TableHead className="text-center px-2">Status</TableHead>
            <TableHead className="text-right px-2">Preço</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const fresh = isFresh(product.detected_at);
            const isSelected = selectedIds.has(product.product_id);
            return (
              <TableRow
                key={product.novelty_id}
                className={cn(
                  "cursor-pointer transition-colors",
                  fresh && "bg-success/5",
                  isSelected && "bg-primary/10"
                )}
                onClick={() => selectionMode ? onToggleSelect(product.product_id) : onProductClick(product.product_id)}
              >
                {selectionMode && (
                  <TableCell className="p-1.5">
                    <div onClick={(e) => e.stopPropagation()}>
                      <SelectionCheckbox
                        checked={isSelected}
                        onChange={() => onToggleSelect(product.product_id)}
                        size="sm"
                      />
                    </div>
                  </TableCell>
                )}
                <TableCell className="p-1.5">
                  <div className="w-9 h-9 rounded bg-muted overflow-hidden">
                    {product.product_image ? (
                      <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-3.5 w-3.5 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <p className="font-medium text-xs line-clamp-1">{product.product_name}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell px-2 py-1.5">
                  <span className="text-[11px] text-muted-foreground">{product.product_sku || "—"}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell px-2 py-1.5">
                  <span className="text-[11px] text-muted-foreground">{product.supplier_name || "—"}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell px-2 py-1.5">
                  <span className="text-[11px] text-muted-foreground">{product.category_name || "—"}</span>
                </TableCell>
                <TableCell className="text-center px-2 py-1.5">
                  <NoveltyBadge daysRemaining={product.days_remaining} size="sm" />
                </TableCell>
                <TableCell className="text-right px-2 py-1.5">
                  {product.base_price != null && product.base_price > 0 ? (
                    <span className="text-xs font-semibold tabular-nums">
                      {product.base_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function NoveltyCardSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <Card className="border-border/50">
        <CardContent className="p-2.5 flex items-center gap-2.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shimmer" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-16 rounded shimmer" />
            <div className="h-3.5 w-full rounded shimmer" style={{ animationDelay: '150ms' }} />
            <div className="h-3 w-24 rounded shimmer" style={{ animationDelay: '300ms' }} />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (viewMode === "table") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/30">
        <div className="w-9 h-9 rounded shimmer" />
        <div className="flex-1 h-3 rounded shimmer" style={{ animationDelay: '100ms' }} />
        <div className="w-14 h-3 rounded shimmer" style={{ animationDelay: '200ms' }} />
        <div className="w-14 h-3 rounded shimmer" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }
  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-square shimmer" />
        <div className="p-2.5 space-y-1.5">
          <div className="h-3.5 w-full rounded shimmer" style={{ animationDelay: '100ms' }} />
          <div className="h-3.5 w-3/4 rounded shimmer" style={{ animationDelay: '200ms' }} />
          <div className="flex justify-between">
            <div className="h-3 w-14 rounded shimmer" style={{ animationDelay: '300ms' }} />
            <div className="h-4 w-12 rounded shimmer" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoveltyProductGrid() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);

  const { data: novelties, isLoading, isFetching, error } = useNoveltiesWithDetails({ limit: 200 });
  const products = novelties || [];

  // Simulated progressive loading progress
  const [loadingProgress, setLoadingProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      progressRef.current = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) { clearInterval(progressRef.current!); return prev; }
          return prev + Math.random() * 12 + 3;
        });
      }, 300);
    } else {
      if (progressRef.current) clearInterval(progressRef.current);
      setLoadingProgress(100);
      const t = setTimeout(() => setLoadingProgress(0), 800);
      return () => clearTimeout(t);
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [isLoading]);

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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        (p.product_sku && p.product_sku.toLowerCase().includes(q)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
      );
    }
    if (selectedSupplier !== "all") {
      filtered = filtered.filter(p => p.supplier_id === selectedSupplier);
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    filtered.sort((a, b) => {
      switch (sortMode) {
        case "name": return (a.product_name || "").localeCompare(b.product_name || "", 'pt-BR');
        case "price-asc": return (a.base_price || 0) - (b.base_price || 0);
        case "price-desc": return (b.base_price || 0) - (a.base_price || 0);
        case "stock": return 0;
        case "best-seller-supplier": return 0;
        case "best-seller-promo": return (a.product_name || "").localeCompare(b.product_name || "", 'pt-BR');
        case "newest":
        default: return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
    });

    return filtered;
  }, [products, selectedSupplier, selectedCategory, sortMode, searchQuery]);

  // Selection mode hook
  const sel = useNoveltiesSelectionMode({ selectionMode, filteredProducts });

  const hasActiveFilters = selectedSupplier !== "all" || selectedCategory !== "all" || searchQuery.trim() !== "";

  const handleProductClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  const clearFilters = () => {
    setSelectedSupplier("all");
    setSelectedCategory("all");
    setSearchQuery("");
  };

  if (error) console.error('Erro ao carregar novidades:', error);

  const renderContent = () => {
    // Show skeletons only on first load (no cached data)
    if (isLoading && products.length === 0) {
      if (viewMode === "table") {
        return (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <NoveltyCardSkeleton key={i} viewMode="table" />
            ))}
          </div>
        );
      }
      return (
        <div className={cn(
          viewMode === "grid"
            ? `grid ${getGridColsClass(gridColumns)} gap-2 sm:gap-3`
            : "space-y-2"
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
            <NoveltyCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/80 mb-3">
            <Package className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium text-sm">
            {hasActiveFilters ? "Nenhuma novidade com esses filtros" : "Nenhuma novidade encontrada"}
          </p>
          {hasActiveFilters ? (
            <Button variant="link" className="mt-1 text-xs" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground/70 mt-1">
              Produtos novos aparecerão aqui automaticamente
            </p>
          )}
        </div>
      );
    }

    if (viewMode === "table") {
      return (
        <NoveltyTableView
          products={filteredProducts}
          onProductClick={handleProductClick}
          selectionMode={selectionMode}
          selectedIds={sel.selectedIds}
          onToggleSelect={sel.toggleSelect}
        />
      );
    }

    return (
      <div className={cn(
        viewMode === "grid"
          ? `grid ${getGridColsClass(gridColumns)} gap-2 sm:gap-3`
          : "space-y-2"
      )}>
        {filteredProducts.map((product, index) => (
          <div
            key={product.novelty_id}
            className="stagger-item"
            style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
          >
            {viewMode === "grid" ? (
              <NoveltyGridCard
                product={product}
                onClick={() => handleProductClick(product.product_id)}
                selectionMode={selectionMode}
                isSelected={sel.selectedIds.has(product.product_id)}
                onToggleSelect={() => sel.toggleSelect(product.product_id)}
              />
            ) : (
              <NoveltyListCard
                product={product}
                onClick={() => handleProductClick(product.product_id)}
                selectionMode={selectionMode}
                isSelected={sel.selectedIds.has(product.product_id)}
                onToggleSelect={() => sel.toggleSelect(product.product_id)}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar compacto */}
      <div className="flex flex-col gap-2">
        {/* Row 1: Título + busca + selecionar + layout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="h-4 w-4 text-success" />
            <h2 className="text-base sm:text-lg font-semibold">Novidades</h2>
            <Badge variant="secondary" className="text-[10px] tabular-nums px-1.5">
              {isLoading && products.length === 0 ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  carregando...
                </span>
              ) : (
                <>
                  {filteredProducts.length}
                  {hasActiveFilters && <span className="text-muted-foreground">/{products.length}</span>}
                </>
              )}
            </Badge>
            {/* Inline progress bar next to title */}
            <AnimatePresence>
              {isLoading && loadingProgress > 0 && loadingProgress < 100 && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 48 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="inline-flex items-center gap-1 ml-1"
                >
                  <span className="h-1 w-12 bg-muted/50 rounded-full overflow-hidden inline-block align-middle">
                    <motion.span
                      className="block h-full bg-primary/60 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${loadingProgress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">{Math.round(loadingProgress)}%</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar novidades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-muted/40 border-border/50 focus:bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Botão Selecionar */}
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5 shrink-0 transition-all",
              selectionMode && "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
            )}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) sel.clearSelection();
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{selectionMode ? "Cancelar" : "Selecionar"}</span>
          </Button>

          <LayoutPopover
            viewMode={viewMode}
            setViewMode={setViewMode}
            gridColumns={gridColumns}
            setGridColumns={setGridColumns}
          />
        </div>

        {/* Row 2: Filtros compactos */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[160px] h-7 text-[11px] gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
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
            <SelectTrigger className="w-[160px] h-7 text-[11px] gap-1">
              <FolderTree className="h-3 w-3 shrink-0" />
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
            <SelectTrigger className="w-[180px] h-7 text-[11px] gap-1">
              <ArrowUpDown className="h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="price-asc">Preço (Menor → Maior)</SelectItem>
              <SelectItem value="price-desc">Preço (Maior → Menor)</SelectItem>
              <SelectItem value="newest">Mais Recentes</SelectItem>
              <SelectItem value="stock">Maior Estoque</SelectItem>
              <SelectItem value="best-seller-supplier">+ Vendidos Fornecedores</SelectItem>
              <SelectItem value="best-seller-promo">+ Vendidos Promo Brindes</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 mr-0.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1" role="list" aria-label="Filtros ativos">
            {searchQuery.trim() && (
              <Badge
                role="listitem"
                variant="secondary"
                className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5"
                onClick={() => setSearchQuery("")}
              >
                <Search className="h-2.5 w-2.5" />
                "{searchQuery}"
                <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {selectedSupplier !== "all" && (
              <Badge
                role="listitem"
                variant="secondary"
                className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5"
                onClick={() => setSelectedSupplier("all")}
              >
                <Building2 className="h-2.5 w-2.5" />
                {suppliers.find(s => s.id === selectedSupplier)?.name}
                <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge
                role="listitem"
                variant="secondary"
                className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5"
                onClick={() => setSelectedCategory("all")}
              >
                <FolderTree className="h-2.5 w-2.5" />
                {categories.find(c => c.id === selectedCategory)?.name}
                <X className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results summary */}
      {!isLoading && filteredProducts.length > 0 && hasActiveFilters && (
        <p className="text-[11px] text-muted-foreground">
          Mostrando <span className="font-medium text-foreground">{filteredProducts.length}</span> de {products.length} novidades
        </p>
      )}

      {/* Content with floating loading indicator */}
      <div className="relative">
        {renderContent()}

        {/* Floating "Filtrando..." indicator — shown during refetch with existing data */}
        <AnimatePresence>
          {isFetching && products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Filtrando...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && (
        <BulkActionBar
          selectedCount={sel.selectedCount}
          totalCount={filteredProducts.length}
          onSelectAll={sel.selectAll}
          onClearSelection={sel.clearSelection}
          onBulkFavorite={sel.handleBulkFavorite}
          onBulkCompare={sel.handleBulkCompare}
          onBulkCollection={sel.handleBulkCollection}
          onBulkCart={sel.handleBulkCart}
          onBulkQuote={sel.handleBulkQuote}
        />
      )}

      {/* Bulk Variant Wizard */}
      <BulkVariantWizard
        open={sel.variantWizardOpen}
        onOpenChange={sel.setVariantWizardOpen}
        products={sel.selectedProducts}
        mode={sel.wizardMode}
        onComplete={sel.handleWizardComplete}
      />

      {/* Bulk Add to Cart Modal */}
      <BulkAddToCartModal
        open={sel.cartModalOpen}
        onOpenChange={sel.setCartModalOpen}
        products={sel.bulkCartProducts}
        variantSelections={sel.wizardSelections}
        onDone={sel.clearSelection}
      />

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        open={sel.collectionModalOpen}
        onOpenChange={sel.setCollectionModalOpen}
        productId={sel.firstSelectedId}
        productName={sel.firstSelectedProduct?.product_name || ""}
      />
    </div>
  );
}
