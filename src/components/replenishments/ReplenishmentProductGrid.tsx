import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ArrowUpDown, Building2, FolderTree, X, RefreshCw, Search, CheckSquare, Loader2, AlertTriangle } from "lucide-react";
import { useReplenishmentsWithDetails } from "@/hooks/useReplenishments";
import { useReplenishmentsSelectionMode, replenishmentToProduct } from "@/hooks/useReplenishmentsSelectionMode";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { BulkActionBar } from "@/components/products/BulkActionBar";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import { BulkAddToCartModal } from "@/components/catalog/BulkAddToCartModal";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductListItem } from "@/components/products/ProductListItem";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ReplenishmentGridCard, ReplenishmentTableView } from "./ReplenishmentCards";

// ─── Types ───────────────────────────────────────────────────────

type ViewMode = "grid" | "list" | "table";
type SortMode = "name" | "price-asc" | "price-desc" | "newest" | "stock";

// ─── Grid Utilities ──────────────────────────────────────────────

function getGridColsClass(cols: ColumnCount): string {
  const map: Record<ColumnCount, string> = {
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    8: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
  };
  return map[cols] ?? map[5];
}

function getGridGapClass(cols: ColumnCount): string {
  if (cols >= 8) return "gap-x-4 gap-y-8";
  if (cols >= 6) return "gap-x-6 gap-y-8";
  return "gap-x-8 gap-y-8";
}

// ─── Loading Progress Hook ───────────────────────────────────────

function useLoadingProgress(isLoading: boolean): number {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return prev;
          }
          return prev + Math.random() * 12 + 3;
        });
      }, 300);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 800);
      return () => clearTimeout(t);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading]);

  return progress;
}

// ─── Main Component ──────────────────────────────────────────────

export function ReplenishmentProductGrid() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);

  const { data: replenishments, isLoading, isFetching, error } = useReplenishmentsWithDetails({ limit: 200 });
  const products = replenishments ?? [];
  const loadingProgress = useLoadingProgress(isLoading);

  // ─── Derived Data ────────────────────────────────────────────

  const { suppliers, categories } = useMemo(() => {
    const supMap = new Map<string, { id: string; name: string; count: number }>();
    const catMap = new Map<string, { id: string; name: string; count: number }>();
    for (const p of products) {
      if (p.supplier_id && p.supplier_name) {
        const e = supMap.get(p.supplier_id);
        if (e) e.count++;
        else supMap.set(p.supplier_id, { id: p.supplier_id, name: p.supplier_name, count: 1 });
      }
      if (p.category_id && p.category_name) {
        const e = catMap.get(p.category_id);
        if (e) e.count++;
        else catMap.set(p.category_id, { id: p.category_id, name: p.category_name, count: 1 });
      }
    }
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
        (p.product_sku?.toLowerCase().includes(q)) ||
        (p.supplier_name?.toLowerCase().includes(q))
      );
    }

    if (selectedSupplier !== "all") filtered = filtered.filter(p => p.supplier_id === selectedSupplier);
    if (selectedCategory !== "all") filtered = filtered.filter(p => p.category_id === selectedCategory);

    filtered.sort((a, b) => {
      switch (sortMode) {
        case "name": return (a.product_name).localeCompare(b.product_name, 'pt-BR');
        case "price-asc": return (a.base_price ?? 0) - (b.base_price ?? 0);
        case "price-desc": return (b.base_price ?? 0) - (a.base_price ?? 0);
        case "stock": return (b.stock_quantity) - (a.stock_quantity);
        case "newest":
        default: return new Date(b.replenished_at).getTime() - new Date(a.replenished_at).getTime();
      }
    });

    return filtered;
  }, [products, selectedSupplier, selectedCategory, sortMode, searchQuery]);

  // ─── Selection ───────────────────────────────────────────────

  const sel = useReplenishmentsSelectionMode({ selectionMode, filteredProducts });
  const hasActiveFilters = selectedSupplier !== "all" || selectedCategory !== "all" || searchQuery.trim() !== "";

  const handleProductClick = useCallback((id: string) => navigate(`/produto/${id}`), [navigate]);

  const clearFilters = useCallback(() => {
    setSelectedSupplier("all");
    setSelectedCategory("all");
    setSearchQuery("");
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) sel.clearSelection();
      return !prev;
    });
  }, [sel]);

  // ─── Favorites & Compare ────────────────────────────────────

  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, addToCompare, removeFromCompare, canAdd: canAddToCompare } = useComparisonStore();

  const onToggleCompare = useCallback((productId: string) => {
    if (isInCompare(productId)) {
      removeFromCompare(productId);
      return { added: false, isFull: false };
    }
    const result = addToCompare(productId);
    return { added: !!result, isFull: !canAddToCompare };
  }, [isInCompare, addToCompare, removeFromCompare, canAddToCompare]);

  const productMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof replenishmentToProduct>>();
    for (const n of filteredProducts) {
      map.set(n.product_id, replenishmentToProduct(n));
    }
    return map;
  }, [filteredProducts]);

  // ─── Render Content ──────────────────────────────────────────

  const renderContent = () => {
    // Loading State
    if (isLoading && products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4" role="status" aria-label="Carregando produtos">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Carregando {Math.round(loadingProgress)}% dos produtos…</span>
          </div>
          <div className="w-64 h-1.5 bg-muted/50 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(loadingProgress)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${loadingProgress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
          </div>
        </div>
      );
    }

    // Error State
    if (error && products.length === 0) {
      return (
        <div className="text-center py-10" role="alert">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mb-3">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <p className="text-destructive font-medium text-sm">Erro ao carregar reposições</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Tente recarregar a página</p>
        </div>
      );
    }

    // Empty State
    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-10" role="status">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/80 mb-3" aria-hidden="true">
            <Package className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium text-sm">
            {hasActiveFilters ? "Nenhuma reposição com esses filtros" : "Nenhuma reposição encontrada"}
          </p>
          {hasActiveFilters ? (
            <Button variant="link" className="mt-1 text-xs" onClick={clearFilters}>Limpar filtros</Button>
          ) : (
            <p className="text-xs text-muted-foreground/70 mt-1">Produtos repostos aparecerão aqui automaticamente</p>
          )}
        </div>
      );
    }

    // Table View
    if (viewMode === "table") {
      return (
        <ReplenishmentTableView
          products={filteredProducts}
          onProductClick={handleProductClick}
          selectionMode={selectionMode}
          selectedIds={sel.selectedIds}
          onToggleSelect={sel.toggleSelect}
        />
      );
    }

    // List View
    if (viewMode === "list") {
      return (
        <div className="space-y-2" role="list" aria-label="Lista de produtos repostos">
          {filteredProducts.map((item, index) => {
            const prod = productMap.get(item.product_id);
            if (!prod) return null;
            const isSelected = sel.selectedIds.has(item.product_id);
            return (
              <div key={item.replenishment_id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }} role="listitem">
                <div className={cn("flex items-center gap-1", isSelected && "ring-2 ring-primary rounded-xl")}>
                  {selectionMode && (
                    <div className="flex-shrink-0 ml-1">
                      <SelectionCheckbox checked={isSelected} onChange={() => sel.toggleSelect(item.product_id)} size="md" aria-label={`Selecionar ${item.product_name}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <ProductListItem
                      product={prod}
                      onClick={() => selectionMode ? sel.toggleSelect(item.product_id) : handleProductClick(item.product_id)}
                      isFavorited={isFavorite(item.product_id)}
                      onToggleFavorite={toggleFavorite}
                      isInCompare={isInCompare(item.product_id)}
                      onToggleCompare={onToggleCompare}
                      canAddToCompare={canAddToCompare}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Grid View
    const effectiveCols = Math.min(gridColumns, filteredProducts.length) as ColumnCount;
    return (
      <div className={`grid ${getGridColsClass(effectiveCols)} ${getGridGapClass(effectiveCols)}`} role="list" aria-label="Grade de produtos repostos">
        {filteredProducts.map((product, index) => (
          <div key={product.replenishment_id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }} role="listitem">
            <ReplenishmentGridCard
              product={product}
              onClick={() => handleProductClick(product.product_id)}
              selectionMode={selectionMode}
              isSelected={sel.selectedIds.has(product.product_id)}
              onToggleSelect={() => sel.toggleSelect(product.product_id)}
            />
          </div>
        ))}
      </div>
    );
  };

  // ─── JSX ─────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header + Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <RefreshCw className="h-4 w-4 text-info shrink-0" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-semibold whitespace-nowrap">Reposição</h2>
            <Badge variant="secondary" className="text-[10px] tabular-nums px-1.5 shrink-0">
              {isLoading && products.length === 0 ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                  carregando…
                </span>
              ) : (
                <>
                  {filteredProducts.length}
                  {hasActiveFilters && <span className="text-muted-foreground">/{products.length}</span>}
                </>
              )}
            </Badge>

            <AnimatePresence>
              {isLoading && loadingProgress > 0 && loadingProgress < 100 && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 48 }} exit={{ opacity: 0, width: 0 }} className="inline-flex items-center gap-1 ml-1">
                  <span className="h-1 w-12 bg-muted/50 rounded-full overflow-hidden inline-block align-middle" aria-hidden="true">
                    <motion.span className="block h-full bg-primary/60 rounded-full" initial={{ width: 0 }} animate={{ width: `${loadingProgress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">{Math.round(loadingProgress)}%</span>
                </motion.span>
              )}
            </AnimatePresence>

            {/* Desktop Search */}
            <div className="hidden sm:block w-80 lg:w-[25rem]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Buscar reposições…  /"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 bg-muted/40 border-border/50 focus:bg-background"
                  aria-label="Buscar reposições por nome, SKU ou fornecedor"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar busca"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5 shrink-0 transition-all",
              selectionMode && "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
            )}
            onClick={toggleSelectionMode}
            aria-pressed={selectionMode}
          >
            <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{selectionMode ? "Cancelar" : "Selecionar"}</span>
          </Button>
          <LayoutPopover viewMode={viewMode} setViewMode={setViewMode} gridColumns={gridColumns} setGridColumns={setGridColumns} />
        </div>

        {/* Mobile Search */}
        <div className="flex items-center gap-2 w-full sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Buscar reposições…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8 bg-muted/40 border-border/50 focus:bg-background"
              aria-label="Buscar reposições"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Filtros de reposição">
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[160px] h-7 text-[11px] gap-1" aria-label="Filtrar por fornecedor">
              <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos fornecedores</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.count})</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[160px] h-7 text-[11px] gap-1" aria-label="Filtrar por categoria">
              <FolderTree className="h-3 w-3 shrink-0" aria-hidden="true" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.count})</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[180px] h-7 text-[11px] gap-1" aria-label="Ordenar produtos">
              <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="price-asc">Preço (Menor → Maior)</SelectItem>
              <SelectItem value="price-desc">Preço (Maior → Menor)</SelectItem>
              <SelectItem value="newest">Mais Recentes</SelectItem>
              <SelectItem value="stock">Maior Estoque</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground" onClick={clearFilters} aria-label="Limpar todos os filtros">
              <X className="h-3 w-3 mr-0.5" aria-hidden="true" />
              Limpar
            </Button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1" role="list" aria-label="Filtros ativos">
            {searchQuery.trim() && (
              <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setSearchQuery("")} aria-label={`Remover filtro: ${searchQuery}`}>
                <Search className="h-2.5 w-2.5" aria-hidden="true" />"{searchQuery}"<X className="h-2.5 w-2.5" aria-hidden="true" />
              </Badge>
            )}
            {selectedSupplier !== "all" && (
              <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setSelectedSupplier("all")} aria-label={`Remover filtro de fornecedor`}>
                <Building2 className="h-2.5 w-2.5" aria-hidden="true" />{suppliers.find(s => s.id === selectedSupplier)?.name}<X className="h-2.5 w-2.5" aria-hidden="true" />
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setSelectedCategory("all")} aria-label={`Remover filtro de categoria`}>
                <FolderTree className="h-2.5 w-2.5" aria-hidden="true" />{categories.find(c => c.id === selectedCategory)?.name}<X className="h-2.5 w-2.5" aria-hidden="true" />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {!isLoading && filteredProducts.length > 0 && hasActiveFilters && (
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          Mostrando <span className="font-medium text-foreground">{filteredProducts.length}</span> de {products.length} reposições
        </p>
      )}

      {/* Content */}
      <div className="relative">
        {renderContent()}
        <AnimatePresence>
          {isFetching && products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              role="status"
              aria-label="Filtrando produtos"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">Filtrando…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Action Overlays */}
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
      <BulkVariantWizard open={sel.variantWizardOpen} onOpenChange={sel.setVariantWizardOpen} products={sel.selectedProducts} mode={sel.wizardMode} onComplete={sel.handleWizardComplete} />
      <BulkAddToCartModal open={sel.cartModalOpen} onOpenChange={sel.setCartModalOpen} products={sel.bulkCartProducts} variantSelections={sel.wizardSelections} onDone={sel.clearSelection} />
      <AddToCollectionModal open={sel.collectionModalOpen} onOpenChange={sel.setCollectionModalOpen} productId={sel.firstSelectedId} productName={sel.firstSelectedProduct?.product_name ?? ""} />
    </div>
  );
}
