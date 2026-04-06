import { useRef, useCallback, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUp } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { ProductListItem } from "./ProductListItem";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { InlineFilterBar } from "@/components/filters/StickyFilterBar";
import type { Product } from "@/hooks/useProducts";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";

interface VirtualizedProductGridProps {
  products: Product[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  columns?: number;
  onProductClick?: (product: Product) => void;
  isFavorited?: (productId: string) => boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: (productId: string) => boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  // Filter controls
  activeFiltersCount?: number;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  onOpenFilters?: () => void;
  onClearFilters?: () => void;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  showFilterBar?: boolean;
  /** Filtros de cor ativos para mostrar imagem específica da cor no card */
  activeColorFilter?: ActiveColorFilter | null;
  /** Column selector React node to render in the filter bar */
  columnSelector?: React.ReactNode;
}

export function VirtualizedProductGrid({
  products,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  columns = 4,
  onProductClick,
  isFavorited,
  onToggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare = true,
  activeFiltersCount = 0,
  sortBy = "name",
  onSortChange,
  onOpenFilters,
  onClearFilters,
  viewMode = "grid",
  onViewModeChange,
  showFilterBar = true,
  activeColorFilter,
  columnSelector,
}: VirtualizedProductGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Column gap varies by density, row gap is always consistent (16px = gap-y-4)
  const getColumnGapPx = () => {
    if (columns >= 8) return 16;  // gap-x-4 (doubled from 8)
    if (columns >= 6) return 24;  // gap-x-6 (doubled from 12)
    return 32; // gap-x-8 (doubled from 16)
  };
  const colGapPx = getColumnGapPx();
  const rowGapPx = 32; // gap-y-8 (doubled from 16), matching ProductGrid

  // Calculate rows based on columns
  const rowCount = Math.ceil(products.length / columns);
  const estimatedRowHeight = columns >= 8 ? 420 : columns >= 6 ? 460 : 520;

  const virtualizer = useVirtualizer({
    count: hasMore ? rowCount + 1 : rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 3,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Infinite scroll: load more when reaching the bottom
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    
    // Show scroll-to-top button after scrolling 300px
    setShowScrollTop(scrollTop > 300);
    
    // Load more when 500px from bottom
    if (!hasMore || loadingMore || isLoading) return;
    const scrollThreshold = 500;

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      setLoadingMore(true);
      onLoadMore?.();
    }
  }, [hasMore, loadingMore, isLoading, onLoadMore]);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Reset loadingMore when products change
  useEffect(() => {
    setLoadingMore(false);
  }, [products.length]);

  const scrollToTop = () => {
    parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] min-h-[600px] overflow-y-auto rounded-xl border border-border/40 
          bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm
          scrollbar-products shadow-inner"
        style={{ contain: "strict" }}
      >
        {/* Barra de filtros sticky DENTRO do container de scroll */}
        {showFilterBar && onSortChange && onOpenFilters && onClearFilters && onViewModeChange && (
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2.5 mb-2">
             <InlineFilterBar
              activeFiltersCount={activeFiltersCount}
              totalProducts={products.length}
              sortBy={sortBy}
              onSortChange={onSortChange}
              onOpenFilters={onOpenFilters}
              onClearFilters={onClearFilters}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              columnSelector={columnSelector}
            />
          </div>
        )}
        
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
            padding: "1rem",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const isLoaderRow = virtualRow.index === rowCount && hasMore;

            if (isLoaderRow) {
              return (
                <div
                  key="loader"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-center justify-center py-8"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Carregando mais produtos...</span>
                  </div>
                </div>
              );
            }

            // Get products for this row
            const startIndex = virtualRow.index * columns;
            const rowProducts = products.slice(startIndex, startIndex + columns);

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
                  columnGap: `${colGapPx}px`,
                  paddingLeft: "0.5rem",
                  paddingRight: "1.5rem",
                  paddingBottom: `${rowGapPx}px`,
                  isolation: "isolate",
                }}
              >
                {rowProducts.map((product, colIndex) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIndex * 0.05 }}
                    className="relative"
                    style={{ zIndex: 1 }} // Base z-index para cada card
                  >
                    <ProductCard
                      product={product}
                      onClick={() => onProductClick?.(product)}
                      isFavorited={isFavorited?.(product.id)}
                      onToggleFavorite={onToggleFavorite}
                      isInCompare={isInCompare?.(product.id)}
                      onToggleCompare={onToggleCompare}
                      canAddToCompare={canAddToCompare}
                      hideCategoryBadges
                      activeColorFilter={activeColorFilter}
                    />
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to top button - posicionado dentro do container */}
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
