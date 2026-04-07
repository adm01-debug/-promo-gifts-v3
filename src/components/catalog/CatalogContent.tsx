import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductListItem } from "@/components/products/ProductListItem";
import { BulkActionBar } from "@/components/products/BulkActionBar";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductTableView } from "@/components/products/ProductTableView";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductListSkeleton } from "@/components/products/ProductListItemSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Product } from "@/hooks/useProducts";
import type { ViewMode } from "@/hooks/useCatalogState";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import type { RefObject } from "react";
import { SparklineSalesProvider } from "@/hooks/useSparklineSales";

interface CatalogContentProps {
  viewMode: ViewMode;
  shouldShowCatalogSkeleton: boolean;
  shouldShowEmptyState: boolean;
  hasActiveCatalogConstraints: boolean;
  paginatedProducts: Product[];
  filteredProducts: Product[];
  gridColumns: ColumnCount;
  hasMoreProducts: boolean;
  isLoadingMore: boolean;
  totalEstimate: number | null;
  loadMoreRef: RefObject<HTMLDivElement>;
  itemsPerPage: number;
  navigate: (path: string) => void;
  handleViewProduct: (p: Product) => void;
  handleShareProduct: (p: Product) => void;
  handleFavoriteProduct: (p: Product) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isInCompare: (id: string) => boolean;
  onToggleCompare: (id: string) => { added: boolean; isFull: boolean };
  canAddToCompare: boolean;
  onLoadMore?: () => void;
  onResetFilters?: () => void;
  selectionMode?: boolean;
}

// ──────────────────────────────────────────────────────
// Virtualized Grid (for grid mode)
// ──────────────────────────────────────────────────────
function VirtualGrid({
  products, columns, navigate, isFavorite, toggleFavorite,
  isInCompare, onToggleCompare, canAddToCompare,
  hasMore, isLoadingMore, totalEstimate, filteredCount,
  loadMoreRef, itemsPerPage, onLoadMore,
  selectionMode, selectedIds, onToggleSelect,
}: {
  products: Product[];
  columns: ColumnCount;
  navigate: (path: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isInCompare: (id: string) => boolean;
  onToggleCompare: (id: string) => { added: boolean; isFull: boolean };
  canAddToCompare: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  totalEstimate: number | null;
  filteredCount: number;
  loadMoreRef: RefObject<HTMLDivElement>;
  itemsPerPage: number;
  onLoadMore?: () => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const rowCount = Math.ceil(products.length / columns);
  const totalRows = rowCount + 1;

  const estimateRowHeight = useCallback(() => {
    if (columns <= 1) return 520;
    if (columns <= 2) return 500;
    if (columns >= 8) return 380;
    if (columns >= 6) return 420;
    if (columns >= 5) return 460;
    return 500;
  }, [columns]);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateRowHeight,
    overscan: 3,
  });

  const getGap = () => {
    if (columns >= 8) return 16;
    if (columns >= 6) return 24;
    return 32;
  };

  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    setShowScrollTop(scrollTop > 400);
    if (hasMore && !isLoadingMore && onLoadMore) {
      if (scrollHeight - scrollTop - clientHeight < 500) onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const gap = getGap();

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 
          bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm
          scrollbar-products shadow-inner"
        style={{ contain: "strict" }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative", padding: "1rem" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const isFooterRow = virtualRow.index === rowCount;
            if (isFooterRow) {
              return (
                <div key="footer" style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }} className="flex flex-col items-center gap-3 pt-8 pb-4 px-4">
                  {hasMore ? (
                    <>
                      <div ref={loadMoreRef} style={{ minHeight: "1px" }} />
                      <p className="text-sm text-muted-foreground">
                        Mostrando {products.length} de {(totalEstimate ?? filteredCount).toLocaleString("pt-BR")} produtos
                      </p>
                      {isLoadingMore && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full mt-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="space-y-3"><Skeleton className="aspect-square w-full rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : products.length > itemsPerPage ? (
                    <p className="text-sm text-muted-foreground">Todos os {(totalEstimate ?? filteredCount).toLocaleString("pt-BR")} produtos foram carregados ✓</p>
                  ) : null}
                </div>
              );
            }
            const startIdx = virtualRow.index * columns;
            const rowProducts = products.slice(startIdx, startIdx + columns);
            return (
              <div key={virtualRow.key} data-index={virtualRow.index} ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)`, display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: `${gap}px`, paddingBottom: `${gap}px` }}>
                {rowProducts.map((product) => {
                  const isSelected = selectionMode && selectedIds?.has(product.id);
                  return (
                    <div key={product.id} className="relative">
                      {selectionMode && (
                        <button
                          className={cn(
                            "absolute top-2 left-2 z-20 flex items-center justify-center",
                            "w-7 h-7 rounded-lg border-2 transition-all duration-200 shadow-sm",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground scale-100"
                              : "border-muted-foreground/40 bg-card/90 backdrop-blur-sm hover:border-primary/50 hover:bg-card"
                          )}
                          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(product.id); }}
                          aria-label={isSelected ? "Desselecionar" : "Selecionar"}
                        >
                          {isSelected && (
                            <svg className="h-4 w-4" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      )}
                      <div className={cn(
                        "transition-all duration-200",
                        isSelected && "ring-2 ring-primary/50 rounded-xl"
                      )}>
                        <ProductCard
                          product={product}
                          onClick={() => selectionMode ? onToggleSelect?.(product.id) : navigate(`/produto/${product.id}`)}
                          isFavorited={isFavorite(product.id)}
                          onToggleFavorite={toggleFavorite}
                          isInCompare={isInCompare(product.id)}
                          onToggleCompare={onToggleCompare}
                          canAddToCompare={canAddToCompare}
                          hideCategoryBadges
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-30" onClick={scrollToTop} title="Voltar ao topo">
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Virtualized List with Bulk Actions
// ──────────────────────────────────────────────────────
function VirtualList({
  products, navigate, handleViewProduct, handleShareProduct,
  isFavorite, toggleFavorite, isInCompare, onToggleCompare, canAddToCompare,
  hasMore, isLoadingMore, totalEstimate, filteredCount,
  loadMoreRef, itemsPerPage, onLoadMore,
}: {
  products: Product[];
  navigate: (path: string) => void;
  handleViewProduct: (p: Product) => void;
  handleShareProduct: (p: Product) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isInCompare: (id: string) => boolean;
  onToggleCompare: (id: string) => { added: boolean; isFull: boolean };
  canAddToCompare: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  totalEstimate: number | null;
  filteredCount: number;
  loadMoreRef: RefObject<HTMLDivElement>;
  itemsPerPage: number;
  onLoadMore?: () => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  // Clear selection when products change significantly
  useEffect(() => { setSelectedIds(new Set()); }, [products.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedIds(new Set(products.map((p) => p.id))), [products]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkFavorite = useCallback(() => {
    let added = 0;
    selectedIds.forEach((id) => { if (!isFavorite(id)) { toggleFavorite(id); added++; } });
    toast.success(`${added} produto${added > 1 ? "s" : ""} adicionado${added > 1 ? "s" : ""} aos favoritos`);
    clearSelection();
  }, [selectedIds, toggleFavorite, isFavorite, clearSelection]);

  const handleBulkCompare = useCallback(() => {
    const ids = Array.from(selectedIds).slice(0, 4);
    ids.forEach((id) => { if (!isInCompare(id)) onToggleCompare(id); });
    toast.success(`${ids.length} produto${ids.length > 1 ? "s" : ""} adicionado${ids.length > 1 ? "s" : ""} à comparação`);
    clearSelection();
  }, [selectedIds, onToggleCompare, isInCompare, clearSelection]);

  const handleBulkCollection = useCallback(() => setCollectionModalOpen(true), []);

  const rowCount = products.length;
  const totalRows = rowCount + 1;

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 8,
  });

  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    setShowScrollTop(scrollTop > 400);
    if (hasMore && !isLoadingMore && onLoadMore) {
      if (scrollHeight - scrollTop - clientHeight < 500) onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : "";
  const firstSelectedProduct = products.find((p) => p.id === firstSelectedId);

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 
          bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm
          scrollbar-products shadow-inner"
        style={{ contain: "strict" }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative", padding: "1rem" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            // Footer row
            if (virtualRow.index === rowCount) {
              return (
                <div key="footer" style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }} className="flex flex-col items-center gap-3 pt-8 pb-4 px-4">
                  {hasMore ? (
                    <>
                      <div ref={loadMoreRef} style={{ minHeight: "1px" }} />
                      <p className="text-sm text-muted-foreground">
                        Mostrando {products.length} de {(totalEstimate ?? filteredCount).toLocaleString("pt-BR")} produtos
                      </p>
                      {isLoadingMore && <ProductListSkeleton count={3} />}
                    </>
                  ) : products.length > itemsPerPage ? (
                    <p className="text-sm text-muted-foreground">Todos os {(totalEstimate ?? filteredCount).toLocaleString("pt-BR")} produtos foram carregados ✓</p>
                  ) : null}
                </div>
              );
            }

            const product = products[virtualRow.index];
            if (!product) return null;
            const isSelected = selectedIds.has(product.id);

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: "8px",
                }}
              >
                <div className={cn("relative group/row", isSelected && "ring-2 ring-primary/40 rounded-xl")}>
                  {/* Checkbox — hover or selected */}
                  <button
                    className={cn(
                      "absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center",
                      "w-6 h-6 rounded-md border-2 transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground scale-100 opacity-100"
                        : "border-muted-foreground/30 bg-card opacity-0 group-hover/row:opacity-100 hover:border-primary/50"
                    )}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                    aria-label={isSelected ? "Desselecionar" : "Selecionar"}
                  >
                    {isSelected && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <div className={cn(isSelected ? "ml-4" : "ml-0 group-hover/row:ml-4", "transition-all duration-200")}>
                    <ProductListItem
                      product={product}
                      onClick={() => navigate(`/produto/${product.id}`)}
                      onView={handleViewProduct}
                      onShare={handleShareProduct}
                      isFavorited={isFavorite(product.id)}
                      onToggleFavorite={toggleFavorite}
                      isInCompare={isInCompare(product.id)}
                      onToggleCompare={onToggleCompare}
                      canAddToCompare={canAddToCompare}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-30" onClick={scrollToTop} title="Voltar ao topo">
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={products.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkFavorite={handleBulkFavorite}
        onBulkCompare={handleBulkCompare}
        onBulkCollection={handleBulkCollection}
      />

      {/* Collection modal for bulk add */}
      {firstSelectedProduct && (
        <AddToCollectionModal
          open={collectionModalOpen}
          onOpenChange={(open) => { setCollectionModalOpen(open); if (!open) clearSelection(); }}
          productId={firstSelectedId}
          productName={`${selectedIds.size} produtos selecionados`}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// CatalogContent — Orchestrator
// ──────────────────────────────────────────────────────
export function CatalogContent({
  viewMode,
  shouldShowCatalogSkeleton,
  shouldShowEmptyState,
  hasActiveCatalogConstraints,
  paginatedProducts,
  filteredProducts,
  gridColumns,
  hasMoreProducts,
  isLoadingMore,
  totalEstimate,
  loadMoreRef,
  itemsPerPage,
  navigate,
  handleViewProduct,
  handleShareProduct,
  handleFavoriteProduct,
  isFavorite,
  toggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare,
  onLoadMore,
  onResetFilters,
  selectionMode,
}: CatalogContentProps) {
  const sparklineProductIds = useMemo(() => paginatedProducts.map(p => p.id), [paginatedProducts]);

  // Shared selection state for grid/table modes (list has its own)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  // Clear selection when leaving selection mode or products change
  useEffect(() => { if (!selectionMode) setSelectedIds(new Set()); }, [selectionMode]);
  useEffect(() => { setSelectedIds(new Set()); }, [paginatedProducts.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedIds(new Set(paginatedProducts.map((p) => p.id))), [paginatedProducts]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkFavorite = useCallback(() => {
    let added = 0;
    selectedIds.forEach((id) => { if (!isFavorite(id)) { toggleFavorite(id); added++; } });
    toast.success(`${added} produto${added > 1 ? "s" : ""} adicionado${added > 1 ? "s" : ""} aos favoritos`);
    clearSelection();
  }, [selectedIds, toggleFavorite, isFavorite, clearSelection]);

  const handleBulkCompare = useCallback(() => {
    const ids = Array.from(selectedIds).slice(0, 4);
    ids.forEach((id) => { if (!isInCompare(id)) onToggleCompare(id); });
    toast.success(`${ids.length} produto${ids.length > 1 ? "s" : ""} adicionado${ids.length > 1 ? "s" : ""} à comparação`);
    clearSelection();
  }, [selectedIds, onToggleCompare, isInCompare, clearSelection]);

  const handleBulkCollection = useCallback(() => setCollectionModalOpen(true), []);

  const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : "";
  const firstSelectedProduct = paginatedProducts.find((p) => p.id === firstSelectedId);

  if (shouldShowCatalogSkeleton) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner p-4">
        {viewMode === "grid" ? <ProductGridSkeleton count={8} /> : <ProductListSkeleton count={viewMode === "table" ? 12 : 8} />}
      </div>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner p-4">
        <EmptyState
          variant={hasActiveCatalogConstraints ? "search" : "products"}
          title={hasActiveCatalogConstraints ? "Nenhum produto encontrado" : "Catálogo indisponível no momento"}
          description={hasActiveCatalogConstraints ? "Tente ajustar os filtros, remover termos da busca ou buscar em todas as categorias." : "O catálogo ainda não retornou itens para exibição."}
          action={hasActiveCatalogConstraints && onResetFilters ? { label: "Limpar tudo e ver catálogo completo", onClick: onResetFilters } : undefined}
          className="min-h-[420px]"
        />
      </div>
    );
  }

  // List mode — virtualized with bulk actions
  if (viewMode === "list") {
    return (
      <SparklineSalesProvider productIds={sparklineProductIds}>
        <VirtualList
          products={paginatedProducts}
          navigate={(path) => navigate(path)}
          handleViewProduct={handleViewProduct}
          handleShareProduct={handleShareProduct}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
          canAddToCompare={canAddToCompare}
          hasMore={hasMoreProducts}
          isLoadingMore={isLoadingMore}
          totalEstimate={totalEstimate}
          filteredCount={filteredProducts.length}
          loadMoreRef={loadMoreRef}
          itemsPerPage={itemsPerPage}
          onLoadMore={onLoadMore}
        />
      </SparklineSalesProvider>
    );
  }

  // Table mode
  if (viewMode === "table") {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner">
        <ProductTableView
          products={paginatedProducts}
          onProductClick={(productId) => navigate(`/produto/${productId}`)}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
        />
        {hasMoreProducts && (
          <div ref={loadMoreRef} className="flex flex-col items-center gap-3 pt-8 pb-4 px-4" style={{ minHeight: "60px" }}>
            <p className="text-sm text-muted-foreground">
              Mostrando {paginatedProducts.length} de {(totalEstimate ?? filteredProducts.length).toLocaleString("pt-BR")} produtos
            </p>
          </div>
        )}
      </div>
    );
  }

  // Grid mode — virtualized
  return (
    <SparklineSalesProvider productIds={sparklineProductIds}>
      <VirtualGrid
        products={paginatedProducts}
        columns={gridColumns}
        navigate={navigate}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        isInCompare={isInCompare}
        onToggleCompare={onToggleCompare}
        canAddToCompare={canAddToCompare}
        hasMore={hasMoreProducts}
        isLoadingMore={isLoadingMore}
        totalEstimate={totalEstimate}
        filteredCount={filteredProducts.length}
        loadMoreRef={loadMoreRef}
        itemsPerPage={itemsPerPage}
        onLoadMore={onLoadMore}
      />
    </SparklineSalesProvider>
  );
}
