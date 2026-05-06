// Catálogo de Produtos - Index Page (v4 - refactored)
import { PageSEO } from '@/components/seo/PageSEO';
import { FloatingCompareBar } from '@/components/compare/FloatingCompareBar';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogToolbar } from '@/components/catalog/CatalogToolbar';
import { CatalogActiveFilters } from '@/components/catalog/CatalogActiveFilters';
import { CatalogContent } from '@/components/catalog/CatalogContent';
import { CatalogShareFlow } from '@/components/catalog/CatalogShareFlow';
import { useCatalogState } from '@/hooks/useCatalogState';
import { useCatalogSEO } from '@/hooks/useCatalogSEO';

export default function Index() {
  const catalog = useCatalogState();
  const seo = useCatalogSEO(
    catalog.searchQuery,
    catalog.filteredProducts,
    catalog.totalEstimate,
    catalog.paginatedProducts
  );

  return (
    <>
      <PageSEO
        title={seo.title}
        description={seo.description}
        path="/"
        jsonLd={seo.structuredData}
      />
      <div>
        <div className="min-w-0 flex-1">
          <div className="animate-fade-in space-y-3 p-4 sm:p-6">
            <CatalogHeader
              shouldShowCatalogSkeleton={catalog.shouldShowCatalogSkeleton}
              totalEstimate={catalog.totalEstimate}
              filteredCount={catalog.filteredProducts.length}
              hasNextPage={catalog.hasNextPage}
              searchQuery={catalog.searchQuery}
              activeFiltersCount={catalog.activeFiltersCount}
              onReset={catalog.resetFilters}
              searchHistory={catalog.searchHistory}
              onClearHistory={catalog.clearHistory}
              filters={catalog.filters}
              onSelect={(result) => {
                if (result.type === 'product') catalog.navigate(`/produto/${result.id}`);
                else if (result.type === 'category') catalog.setFilters({ ...catalog.filters, categories: [parseInt(result.id)] });
                else if (result.type === 'supplier') catalog.setFilters({ ...catalog.filters, suppliers: [result.id] });
                else catalog.handleSearch(result.label);
              }}
              onApplyPreset={catalog.setFiltersWithPreset}
              activePresetId={catalog.activePresetId}
            />

            <div className="sticky top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))] z-20 -mx-4 border-b border-transparent bg-background/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 [&:not(:first-child)]:border-border/30">
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
                selectionMode={catalog.selectionMode}
                onToggleSelectionMode={catalog.toggleSelectionMode}
                selectedCount={catalog.selectedCount}
              />
            </div>

            <CatalogActiveFilters
              filters={catalog.filters}
              setFilters={catalog.setFilters}
              activeFiltersCount={catalog.activeFiltersCount}
            />

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
              navigate={catalog.navigate}
              handleViewProduct={catalog.handleViewProduct}
              handleShareProduct={catalog.handleShareProduct}
              handleFavoriteProduct={catalog.handleFavoriteProduct}
              isFavorite={catalog.isFavorite}
              toggleFavorite={catalog.toggleFavorite}
              isInCompare={catalog.isInCompare}
              onToggleCompare={catalog.toggleCompare}
              canAddToCompare={catalog.canAddMore}
              onLoadMore={catalog.loadMore}
              onResetFilters={catalog.resetFilters}
              selectionMode={catalog.selectionMode}
              onSelectedCountChange={catalog.setSelectedCount}
              activeColorFilter={
                catalog.filters.colorGroups?.length > 0 || catalog.filters.colorVariations?.length > 0
                  ? { groups: catalog.filters.colorGroups || [], variations: catalog.filters.colorVariations || [] }
                  : null
              }
            />
          </div>
        </div>
      </div>

      <FloatingCompareBar />
      <CatalogShareFlow shareProduct={catalog.shareProduct} setShareProduct={catalog.setShareProduct} />
    </>
  );
}

