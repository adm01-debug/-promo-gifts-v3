import { Loader2 } from "lucide-react";
import { ProductGrid } from "@/components/products/ProductGrid";
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
  // Handlers
  navigate: (path: string) => void;
  handleViewProduct: (p: Product) => void;
  handleShareProduct: (p: Product) => void;
  handleFavoriteProduct: (p: Product) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isInCompare: (id: string) => boolean;
  onToggleCompare: (id: string) => { added: boolean; isFull: boolean };
  canAddToCompare: boolean;
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
}: CatalogContentProps) {
  return (
    <div
      className="h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 
        bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm
        scrollbar-products shadow-inner p-4"
    >
      {shouldShowCatalogSkeleton ? (
        viewMode === "grid" ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <ProductListSkeleton count={6} />
        )
      ) : shouldShowEmptyState ? (
        <EmptyState
          variant={hasActiveCatalogConstraints ? "search" : "products"}
          title={hasActiveCatalogConstraints ? "Nenhum produto encontrado" : "Catálogo indisponível no momento"}
          description={hasActiveCatalogConstraints
            ? "Não encontramos produtos com os filtros ou busca aplicados."
            : "O catálogo ainda não retornou itens para exibição."
          }
          className="min-h-[420px]"
        />
      ) : viewMode === "grid" ? (
        <ProductGrid
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
          columns={gridColumns}
          highlightColors={[]}
        />
      ) : (
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
      )}

      {/* Infinite scroll trigger */}
      {!shouldShowCatalogSkeleton && !shouldShowEmptyState && hasMoreProducts && (
        <div
          ref={loadMoreRef}
          className="flex flex-col items-center gap-3 pt-8 pb-4"
          style={{ minHeight: '60px' }}
        >
          <p className="text-sm text-muted-foreground">
            Mostrando {paginatedProducts.length} de {totalEstimate ? `~${totalEstimate.toLocaleString("pt-BR")}` : filteredProducts.length.toLocaleString("pt-BR")} produtos
          </p>
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando mais produtos...</span>
            </div>
          )}
        </div>
      )}

      {/* All loaded message */}
      {!shouldShowCatalogSkeleton && !shouldShowEmptyState && !hasMoreProducts && filteredProducts.length > itemsPerPage && (
        <div className="flex justify-center pt-8">
          <p className="text-sm text-muted-foreground">
            Todos os {filteredProducts.length} produtos foram carregados ✓
          </p>
        </div>
      )}
    </div>
  );
}
