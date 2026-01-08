import { useRef, useCallback, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUp } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import type { Product } from "@/data/mockData";

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
}: VirtualizedProductGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Calculate rows based on columns
  const rowCount = Math.ceil(products.length / columns);
  const estimatedRowHeight = 420; // Approximate height of product card + gap

  const virtualizer = useVirtualizer({
    count: hasMore ? rowCount + 1 : rowCount, // Add 1 for loading row
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 3, // Render 3 extra rows above/below viewport
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Infinite scroll: load more when reaching the bottom
  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasMore || loadingMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const scrollThreshold = 500; // Load more when 500px from bottom

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
    <div className="relative">
      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] overflow-auto scrollbar-thin"
        style={{ contain: "strict" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
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
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: "1rem",
                  paddingLeft: "0.25rem",
                  paddingRight: "0.25rem",
                  paddingBottom: "1rem",
                }}
              >
                {rowProducts.map((product, colIndex) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIndex * 0.05 }}
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
                    />
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to top button */}
      <AnimatePresence>
        {virtualizer.scrollOffset > 1000 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-20 right-6 p-3 rounded-full bg-orange text-white shadow-lg hover:bg-orange-hover transition-colors z-40"
            onClick={scrollToTop}
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
