import { useRef, useCallback, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductList } from "@/components/products/ProductList";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductListSkeleton } from "@/components/products/ProductListItemSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { Product } from "@/hooks/useProducts";
import type { ViewMode } from "@/hooks/useCatalogState";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import type { RefObject } from "react";

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
}

/** Virtualized grid that only renders visible rows */
function VirtualGrid({
  products,
  columns,
  navigate,
  isFavorite,
  toggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare,
  hasMore,
  isLoadingMore,
  totalEstimate,
  filteredCount,
  loadMoreRef,
  itemsPerPage,
  onLoadMore,
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
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const rowCount = Math.ceil(products.length / columns);
  // Extra row for loader / "all loaded" message
  const totalRows = rowCount + 1;

  const estimateRowHeight = useCallback(() => {
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

  // Scroll listener: show/hide scroll-to-top + trigger loadMore near bottom
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    setShowScrollTop(scrollTop > 400);

    // Trigger load more when within 500px of bottom
    if (hasMore && !isLoadingMore && onLoadMore) {
      if (scrollHeight - scrollTop - clientHeight < 500) {
        onLoadMore();
      }
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
            padding: "1rem",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const isFooterRow = virtualRow.index === rowCount;

            if (isFooterRow) {
              return (
                <div
                  key="footer"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex flex-col items-center gap-3 pt-8 pb-4 px-4"
                >
                  {hasMore ? (
                    <>
                      <div ref={loadMoreRef} style={{ minHeight: "1px" }} />
                      <p className="text-sm text-muted-foreground">
                        Mostrando {products.length} de{" "}
                        {totalEstimate
                          ? `~${totalEstimate.toLocaleString("pt-BR")}`
                          : filteredCount.toLocaleString("pt-BR")}{" "}
                        produtos
                      </p>
                      {isLoadingMore && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full mt-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                              <Skeleton className="aspect-square w-full rounded-xl" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : products.length > itemsPerPage ? (
                    <p className="text-sm text-muted-foreground">
                      Todos os {filteredCount} produtos foram carregados ✓
                    </p>
                  ) : null}
                </div>
              );
            }

            const startIdx = virtualRow.index * columns;
            const rowProducts = products.slice(startIdx, startIdx + columns);

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
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  columnGap: `${gap}px`,
                  paddingBottom: `${gap}px`,
                }}
              >
                {rowProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => navigate(`/produto/${product.id}`)}
                    isFavorited={isFavorite(product.id)}
                    onToggleFavorite={toggleFavorite}
                    isInCompare={isInCompare(product.id)}
                    onToggleCompare={onToggleCompare}
                    canAddToCompare={canAddToCompare}
                    hideCategoryBadges
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-30"
            onClick={scrollToTop}
            title="Voltar ao topo"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

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
}: CatalogContentProps) {
  if (shouldShowCatalogSkeleton) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner p-4">
        {viewMode === "grid" ? <ProductGridSkeleton count={8} /> : <ProductListSkeleton count={6} />}
      </div>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner p-4">
        <EmptyState
          variant={hasActiveCatalogConstraints ? "search" : "products"}
          title={hasActiveCatalogConstraints ? "Nenhum produto encontrado" : "Catálogo indisponível no momento"}
          description={hasActiveCatalogConstraints
            ? "Não encontramos produtos com os filtros ou busca aplicados."
            : "O catálogo ainda não retornou itens para exibição."
          }
          className="min-h-[420px]"
        />
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner p-4">
        <ProductList
          products={paginatedProducts}
          onProductClick={(productId) => navigate(`/produto/${productId}`)}
          onViewProduct={handleViewProduct}
          onShareProduct={handleShareProduct}
          onFavoriteProduct={handleFavoriteProduct}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
          canAddToCompare={canAddToCompare}
          highlightColors={[]}
        />
        {hasMoreProducts && (
          <div ref={loadMoreRef} className="flex flex-col items-center gap-3 pt-8 pb-4" style={{ minHeight: "60px" }}>
            <p className="text-sm text-muted-foreground">
              Mostrando {paginatedProducts.length} de {totalEstimate ? `~${totalEstimate.toLocaleString("pt-BR")}` : filteredProducts.length.toLocaleString("pt-BR")} produtos
            </p>
            {isLoadingMore && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full mt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid mode → virtualized
  return (
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
  );
}
