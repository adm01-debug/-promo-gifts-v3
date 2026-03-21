// Catálogo de Produtos - Index Page (v3 - refactored)
import { MainLayout } from "@/components/layout/MainLayout";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogActiveFilters } from "@/components/catalog/CatalogActiveFilters";
import { CatalogContent } from "@/components/catalog/CatalogContent";
import { useCatalogState } from "@/hooks/useCatalogState";

export default function Index() {
  const catalog = useCatalogState();

  return (
    <MainLayout>
      <div>
        <div className="flex-1 min-w-0">
          <div className="space-y-3 p-4 sm:p-6">
            {/* Header: Title + Search */}
            <CatalogHeader
              shouldShowCatalogSkeleton={catalog.shouldShowCatalogSkeleton}
              totalEstimate={catalog.totalEstimate}
              filteredCount={catalog.filteredProducts.length}
              hasNextPage={catalog.hasNextPage}
              onSelect={(result) => {
                if (result.type === "product") {
                  catalog.navigate(`/produto/${result.id}`);
                } else if (result.type === "category") {
                  catalog.setFilters({ ...catalog.filters, categories: [parseInt(result.id)] });
                } else if (result.type === "supplier") {
                  catalog.setFilters({ ...catalog.filters, suppliers: [result.id] });
                } else {
                  catalog.handleSearch(result.label);
                }
              }}
            />

            {/* Toolbar: Filters + Sort + Stats + Layout */}
            <CatalogToolbar
              filters={catalog.filters}
              setFilters={catalog.setFilters}
              activeFiltersCount={catalog.activeFiltersCount}
              filterSheetOpen={catalog.filterSheetOpen}
              setFilterSheetOpen={catalog.setFilterSheetOpen}
              resetFilters={catalog.resetFilters}
              sortBy={catalog.sortBy}
              setSortBy={catalog.setSortBy}
              statBadges={catalog.statBadges}
              viewMode={catalog.viewMode}
              setViewMode={catalog.setViewMode}
              gridColumns={catalog.gridColumns}
              setGridColumns={catalog.setGridColumns}
            />

            {/* Active filter badges */}
            <CatalogActiveFilters
              filters={catalog.filters}
              setFilters={catalog.setFilters}
              activeFiltersCount={catalog.activeFiltersCount}
            />

            {/* Product grid/list content */}
            <CatalogContent
              viewMode={catalog.viewMode}
              shouldShowCatalogSkeleton={catalog.shouldShowCatalogSkeleton}
              shouldShowEmptyState={catalog.shouldShowEmptyState}
              hasActiveCatalogConstraints={catalog.hasActiveCatalogConstraints}
              paginatedProducts={catalog.paginatedProducts}
              filteredProducts={catalog.filteredProducts}
              gridColumns={catalog.gridColumns}
              hasMoreProducts={catalog.hasMoreProducts}
              isLoadingMore={catalog.isLoadingMore}
              totalEstimate={catalog.totalEstimate}
              loadMoreRef={catalog.loadMoreRef}
              itemsPerPage={catalog.ITEMS_PER_PAGE}
              navigate={(path) => catalog.navigate(path)}
              handleViewProduct={catalog.handleViewProduct}
              handleShareProduct={catalog.handleShareProduct}
              handleFavoriteProduct={catalog.handleFavoriteProduct}
              isFavorite={catalog.isFavorite}
              toggleFavorite={catalog.toggleFavorite}
              isInCompare={catalog.isInCompare}
              onToggleCompare={catalog.toggleCompare}
              canAddToCompare={catalog.canAddMore}
              onLoadMore={catalog.loadMore}
            />
          </div>
        </div>
      </div>

      <FloatingCompareBar />
    </MainLayout>
  );
}
