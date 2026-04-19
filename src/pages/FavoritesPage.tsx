import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useFavoritesStore, type FavoriteVariantInfo } from "@/stores/useFavoritesStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductListItem } from "@/components/products/ProductListItem";
import { ProductTableView } from "@/components/products/ProductTableView";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { getGridColsClass, getGridGapClass } from "@/components/replenishments/VirtualizedReplenishmentGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, Trash2, Search, Package, Layers, TrendingDown, TrendingUp, CheckSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { useCatalogSelection } from "@/components/catalog/useCatalogSelection";
import { CatalogBulkModals } from "@/components/catalog/CatalogBulkModals";

type ViewMode = "grid" | "list" | "table";
const VIEW_MODE_KEY = "favorites-view-mode";
const GRID_COLS_KEY = "favorites-grid-cols";

function loadViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    if (v === "grid" || v === "list" || v === "table") return v;
  } catch {}
  return "grid";
}

function loadGridColumns(): ColumnCount {
  try {
    const v = localStorage.getItem(GRID_COLS_KEY);
    if (v) {
      const n = Number(v) as ColumnCount;
      if ([3, 4, 5, 6, 8].includes(n)) return n;
    }
  } catch {}
  return getDefaultColumns();
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, clearFavorites, favoriteCount, toggleFavorite, isFavorite } =
    useFavoritesStore();
  const { getProductsByIds, products: _cacheSignal } = useProductsContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [gridColumns, setGridColumns] = useState<ColumnCount>(() => loadGridColumns());
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch {}
  }, [viewMode]);

  useEffect(() => {
    try { localStorage.setItem(GRID_COLS_KEY, String(gridColumns)); } catch {}
  }, [gridColumns]);

  const favoriteProducts = useMemo(
    () => getProductsByIds(favorites.map((f) => f.productId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getProductsByIds, favorites, _cacheSignal]
  );

  const variantMap = useMemo(() => {
    const map = new Map<string, FavoriteVariantInfo>();
    favorites.forEach((f) => {
      if (f.variant) map.set(f.productId, f.variant);
    });
    return map;
  }, [favorites]);

  const productsWithVariant = useMemo(() => {
    return favoriteProducts.map((product) => {
      const variant = variantMap.get(product.id);
      if (variant?.thumbnail) {
        return {
          ...product,
          images: [variant.thumbnail, ...(product.images || [])],
        };
      }
      return product;
    });
  }, [favoriteProducts, variantMap]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return productsWithVariant;
    const q = searchQuery.toLowerCase();
    return productsWithVariant.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
    );
  }, [productsWithVariant, searchQuery]);

  // Bulk selection (shared with catalog: favoritar/comparar/coleção/carrinho/orçamento)
  const sel = useCatalogSelection(filteredProducts, selectionMode);
  const selectedIds = sel.selectedIds;

  // Stats
  const stats = useMemo(() => {
    if (favoriteProducts.length === 0) return null;
    const prices = favoriteProducts.map(p => p.price);
    return {
      total: favoriteProducts.length,
      categories: new Set(favoriteProducts.map(p => p.category.id)).size,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }, [favoriteProducts]);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleClearAll = () => {
    clearFavorites();
    toast.success("Todos os favoritos foram removidos");
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) sel.clearSelection();
      return !prev;
    });
  };

  const handleRemoveSelected = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => toggleFavorite(id));
    toast.success(`${ids.length} ${ids.length === 1 ? "produto removido" : "produtos removidos"} dos favoritos`);
    sel.clearSelection();
    setSelectionMode(false);
  };

  const handleRemoveFavorite = (productId: string, productName: string) => {
    toggleFavorite(productId);
    toast.success(`"${productName}" removido dos favoritos`);
  };

  // Adapter for ProductListItem / ProductTableView (signature: (productId) => void)
  const handleToggleFavorite = (productId: string) => {
    const product = favoriteProducts.find((p) => p.id === productId);
    toggleFavorite(productId);
    if (product) {
      toast.success(`"${product.name}" removido dos favoritos`);
    }
  };

  return (
    <MainLayout>
      <PageSEO title="Favoritos" description="Seus produtos favoritos salvos para referência rápida." path="/favoritos" />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-destructive fill-destructive" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                Meus Favoritos
              </h1>
              <p className="text-muted-foreground">
                {favoriteCount} {favoriteCount === 1 ? "produto salvo" : "produtos salvos"}
              </p>
            </div>
          </div>

          {favoriteProducts.length > 0 && (
            <div className="flex gap-2 items-center">
              <DeleteConfirmDialog
                trigger={
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Tudo
                  </Button>
                }
                title="Limpar todos os favoritos?"
                description={`Esta ação irá remover todos os ${favoriteCount} produtos da sua lista de favoritos. Esta ação não pode ser desfeita.`}
                onConfirm={handleClearAll}
                itemName="favoritos"
              />
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1.5 h-8 transition-all relative",
                  selectionMode
                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                    : "hover:border-primary/50"
                )}
                onClick={toggleSelectionMode}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">{selectionMode ? "Cancelar" : "Selecionar"}</span>
                <AnimatePresence>
                  {selectionMode && selectedIds.size > 0 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="absolute -top-2 -right-2"
                    >
                      <Badge className="bg-destructive text-destructive-foreground h-5 min-w-5 text-[10px] font-bold px-1.5 py-0 flex items-center justify-center tabular-nums shadow-lg">
                        {selectedIds.size}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
              <div className="hidden sm:block">
                <LayoutPopover
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  gridColumns={gridColumns}
                  setGridColumns={setGridColumns}
                />
              </div>
            </div>
          )}
        </div>

        {/* KPI Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Produtos</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{stats.categories}</p>
                <p className="text-xs text-muted-foreground">Categorias</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{fmt(stats.minPrice)}</p>
                <p className="text-xs text-muted-foreground">Menor preço</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{fmt(stats.maxPrice)}</p>
                <p className="text-xs text-muted-foreground">Maior preço</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {favoriteProducts.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nos favoritos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Selection action bar — Favoritos-specific (Remover). Bulk shared actions (Orçamento/Carrinho/etc) ficam na BulkActionBar flutuante */}
        {selectionMode && favoriteProducts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 animate-fade-in">
            <div className="flex items-center gap-2 text-sm">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? "selecionado" : "selecionados"}
              </span>
              <span className="text-muted-foreground">de {filteredProducts.length}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="ghost" size="sm" onClick={sel.selectAll} disabled={selectedIds.size === filteredProducts.length}>
                Selecionar tudo
              </Button>
              <Button variant="ghost" size="sm" onClick={sel.clearSelection} disabled={selectedIds.size === 0}>
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
              <DeleteConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm" disabled={selectedIds.size === 0}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remover ({selectedIds.size})
                  </Button>
                }
                title="Remover selecionados?"
                description={`Esta ação irá remover ${selectedIds.size} ${selectedIds.size === 1 ? "produto" : "produtos"} dos favoritos.`}
                onConfirm={handleRemoveSelected}
                itemName="favoritos selecionados"
              />
            </div>
          </div>
        )}

        {/* Products view */}
        {filteredProducts.length > 0 ? (
          viewMode === "table" ? (
            <ProductTableView
              products={filteredProducts}
              onProductClick={(productId) => navigate(`/produto/${productId}`)}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={sel.toggleSelect}
            />
          ) : viewMode === "list" ? (
            <div className="space-y-1.5">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "relative rounded-lg transition-all",
                      selectionMode && "cursor-pointer",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    onClick={selectionMode ? () => sel.toggleSelect(product.id) : undefined}
                  >
                    <div className={cn(selectionMode && "pointer-events-none")}>
                      <ProductListItem
                        product={product}
                        onClick={() => navigate(`/produto/${product.id}`)}
                        isFavorited={isFavorite(product.id)}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    </div>
                    {selectionMode && (
                      <div className="absolute top-2 left-2 z-20">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all backdrop-blur-sm",
                            isSelected ? "bg-primary border-primary" : "bg-card/90 border-border"
                          )}
                        >
                          {isSelected && <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`grid ${getGridColsClass(gridColumns)} ${getGridGapClass(gridColumns)}`}>
              {filteredProducts.map((product, index) => {
                const variant = variantMap.get(product.id);
                const isSelected = selectedIds.has(product.id);
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "animate-fade-in relative rounded-xl transition-all",
                      selectionMode && "cursor-pointer",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                    onClick={selectionMode ? () => sel.toggleSelect(product.id) : undefined}
                  >
                    <div className={cn(selectionMode && "pointer-events-none")}>
                      <ProductCard
                        product={product}
                        onClick={() => navigate(`/produto/${product.id}`)}
                        onFavorite={() => handleRemoveFavorite(product.id, product.name)}
                      />
                    </div>
                    {/* Selection checkbox overlay */}
                    {selectionMode && (
                      <div className="absolute top-3 left-3 z-20">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all backdrop-blur-sm",
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-card/90 border-border"
                          )}
                        >
                          {isSelected && <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                      </div>
                    )}
                    {/* Overlay: heart + saved color badge */}
                    {!selectionMode && (
                      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="icon"
                          aria-label="Remover favorito"
                          className="h-8 w-8 bg-card/90 backdrop-blur-sm hover:bg-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(product.id, product.name);
                          }}
                        >
                          <Heart className="h-4 w-4 fill-destructive text-destructive" />
                        </Button>
                        {variant?.color_name && (
                          <Badge
                            variant="secondary"
                            className="bg-card/90 backdrop-blur-sm text-[10px] gap-1 px-1.5 py-0.5"
                          >
                            {variant.color_hex && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full border border-border/50 shrink-0"
                                style={{ backgroundColor: variant.color_hex }}
                              />
                            )}
                            <span className="truncate max-w-[80px]">{variant.color_name}</span>
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : favoriteProducts.length > 0 && searchQuery ? (
          <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              Nenhum favorito encontrado
            </h3>
            <p className="text-muted-foreground text-sm">
              Nenhum produto corresponde a "{searchQuery}"
            </p>
          </div>
        ) : (
          <EmptyState
            variant="favorites"
            title="Nenhum favorito ainda"
            description="Navegue pelos produtos e clique no ícone de coração para adicionar produtos à sua lista de favoritos."
            action={{
              label: "Explorar Produtos",
              onClick: () => navigate("/"),
            }}
          />
        )}
      </div>

      {/* Bulk actions: BulkActionBar flutuante + wizard (Orçamento/Carrinho/Coleção/Comparar/Favoritar) */}
      <CatalogBulkModals sel={sel} selectionMode={selectionMode} totalCount={filteredProducts.length} />
    </MainLayout>
  );
}
