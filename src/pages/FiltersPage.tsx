import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { FilterPanel, FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { PresetsBar } from "@/components/filters/PresetsBar";
import { VirtualizedProductGrid } from "@/components/products/VirtualizedProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { ColumnSelector } from "@/components/products/ColumnSelector";
import { VoiceSearchOverlay } from "@/components/search/VoiceSearchOverlay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, ArrowUpDown, X } from "lucide-react";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { SmartSearchInput } from "@/components/search";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import type { VoiceAgentAction } from "@/hooks/useVoiceAgent";
import { toast } from "sonner";
import { useFiltersPageState } from "./filters/useFiltersPageState";

export default function FiltersPage() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonStore();

  const state = useFiltersPageState();

  const handleVoiceAction = useCallback((action: VoiceAgentAction) => {
    if (!action.data) return;

    if (action.action === "filter" && action.data.filters) {
      const f = action.data.filters;
      state.setFilters((prev: FilterState) => {
        const next = { ...prev };
        if (f.color) next.colors = [...prev.colors, f.color];
        if (f.category) next.categories = [...prev.categories, f.category];
        if (f.material) next.materiais = [...prev.materiais, f.material];
        if (f.maxPrice) next.priceRange = [prev.priceRange[0], f.maxPrice];
        if (f.minPrice) next.priceRange = [f.minPrice, prev.priceRange[1]];
        if (f.inStock) next.inStock = true;
        if (f.isKit) next.isKit = true;
        return next;
      });
      toast.success(action.response);
    } else if (action.action === "search" && action.data.query) {
      state.setFilters((prev: FilterState) => ({ ...prev, search: action.data!.query! }));
      toast.success(action.response);
    } else if (action.action === "sort" && action.data.sortBy) {
      const sortMap: Record<string, string> = { "price-asc": "price-asc", "price-desc": "price-desc", name: "name", stock: "stock" };
      const sortValue = sortMap[action.data.sortBy] || "name";
      state.setSortBy(sortValue);
      toast.success(action.response);
    } else if (action.action === "clear") {
      state.setFilters(defaultFilters);
      toast.success(action.response);
    } else if (action.action === "navigate" && action.data.route) {
      navigate(action.data.route);
      toast.success(action.response);
    }
  }, [state, navigate]);

  const voiceAgent = useVoiceAgent({ onAction: handleVoiceAction });

  return (
    <MainLayout>
      <PageSEO title="Filtros de Produtos" description="Filtre e encontre brindes por cor, categoria, preço e fornecedor." path="/produtos" />
      <div className="animate-fade-in">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] self-start">
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-2 space-y-4">
              <FilterPanel filters={state.filters} onFilterChange={state.handleFilterChange} onReset={state.handleReset} activeFiltersCount={state.activeFiltersCount} products={state.realProducts} filteredResultsCount={state.filteredProducts.length} />
            </div>
            <div className="border-t border-border/40 bg-gradient-to-t from-card via-card to-card/80 px-3 py-2.5 shrink-0 mt-1">
              <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${state.activeFiltersCount > 0 ? "bg-gradient-to-r from-orange to-orange-hover text-orange-foreground shadow-md shadow-orange/20" : "bg-muted/60 text-muted-foreground"}`}>
                <Filter className="h-4 w-4" />
                <span>{state.isLoadingProducts && state.realProducts.length === 0 ? 'Carregando catálogo...' : state.activeFiltersCount > 0 ? `Ver ${state.filteredProducts.length.toLocaleString('pt-BR')} resultado${state.filteredProducts.length !== 1 ? 's' : ''}` : `${state.filteredProducts.length.toLocaleString('pt-BR')}${!state.isFullyLoaded ? '+' : ''} produtos disponíveis`}</span>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-shrink-0">
                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
                  Super Filtro
                  <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">· {state.isLoadingProducts && state.realProducts.length === 0 ? 'carregando...' : `${state.filteredProducts.length.toLocaleString("pt-BR")}${!state.isFullyLoaded ? '+' : ''} itens`}</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <SmartSearchInput placeholder="Buscar produtos..." onSelect={(result) => result.type === "product" ? navigate(`/produto/${result.id}`) : state.handleFilterChange({ ...state.filters, search: result.label })} onSearch={(q) => state.handleFilterChange({ ...state.filters, search: q })} className="flex-1" />
                {(state.filters.search || state.searchParams.get('search')) && (
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap">{state.isLoadingProducts && state.realProducts.length === 0 ? 'Carregando...' : `${state.filteredProducts.length.toLocaleString("pt-BR")} encontrado${state.filteredProducts.length !== 1 ? "s" : ""}`}</Badge>
                )}
                <Sheet open={state.mobileFiltersOpen} onOpenChange={state.setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden shrink-0"><Filter className="h-4 w-4 mr-2" />Filtros{state.activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2">{state.activeFiltersCount}</Badge>}</Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 flex flex-col p-0">
                    <SheetHeader className="px-6 pt-6 pb-2"><SheetTitle>Filtros</SheetTitle></SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 pb-4">
                      <FilterPanel filters={state.filters} onFilterChange={state.handleFilterChange} onReset={state.handleReset} activeFiltersCount={state.activeFiltersCount} products={state.realProducts} filteredResultsCount={state.filteredProducts.length} />
                    </div>
                    <div className="sticky bottom-0 border-t bg-background px-6 py-3 flex gap-2">
                      {state.activeFiltersCount > 0 && <Button variant="outline" size="sm" onClick={state.handleReset} className="text-xs">Limpar ({state.activeFiltersCount})</Button>}
                      <Button size="sm" className="flex-1" onClick={() => state.setMobileFiltersOpen(false)}>{`Ver ${state.filteredProducts.length} resultado${state.filteredProducts.length !== 1 ? 's' : ''}`}</Button>
                    </div>
                  </SheetContent>
                </Sheet>
                <Select value={state.sortBy} onValueChange={state.setSortBy}>
                  <SelectTrigger className="w-32 sm:w-44 shrink-0"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue placeholder="Ordenar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="price_asc">Menor Preço</SelectItem>
                    <SelectItem value="price_desc">Maior Preço</SelectItem>
                    <SelectItem value="stock">Maior Estoque</SelectItem>
                    <SelectItem value="newest">Novidades</SelectItem>
                  </SelectContent>
                </Select>
                <PresetsBar currentFilters={state.filters} onApplyPreset={(f, id) => state.handleApplyPreset(f, id)} activePresetId={state.activePresetId} />
                <div className="hidden sm:block shrink-0">
                  <LayoutPopover viewMode={state.viewMode} setViewMode={state.setViewMode} gridColumns={state.gridColumns} setGridColumns={state.setGridColumns} />
                </div>
              </div>
              {state.activeFiltersSummary.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 flex-wrap w-full">
                  {state.activeFiltersSummary.slice(0, 3).map((filter) => (
                    <Badge key={filter.key} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/20 text-xs py-0.5 px-2" onClick={() => state.clearSingleFilter(filter.key)}>
                      {filter.label}: {filter.value} <X className="h-3 w-3" />
                    </Badge>
                  ))}
                  {state.activeFiltersSummary.length > 3 && <Badge variant="outline" className="text-xs py-0.5 px-2">+{state.activeFiltersSummary.length - 3}</Badge>}
                  <Button variant="ghost" size="sm" onClick={state.handleReset} className="text-muted-foreground h-6 px-2 text-xs">Limpar</Button>
                </div>
              )}
            </div>

            {/* Products */}
            <div className="min-h-[calc(100vh-10rem)] relative">
              {state.isFiltering && (
                <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-start justify-center pt-32 transition-opacity duration-200 pointer-events-none rounded-xl">
                  <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Filtrando...</span>
                  </div>
                </div>
              )}
              {(state.isLoadingProducts || state.isLoadingMaterialFilter || state.isLoadingCategoryFilter) && state.realProducts.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 p-4 sm:p-6 shadow-inner">
                  <div className={`${state.viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6" : "space-y-3"} animate-pulse`}>
                    {Array.from({ length: state.viewMode === "grid" ? 6 : 8 }).map((_, index) => (
                      state.viewMode === "grid" ? (
                        <div key={index} className="overflow-hidden rounded-2xl border border-border/50 bg-card"><div className="aspect-[4/5] bg-muted/50" /><div className="space-y-3 p-4"><div className="h-3 w-24 rounded bg-muted" /><div className="h-5 w-full rounded bg-muted" /><div className="h-5 w-2/3 rounded bg-muted" /></div></div>
                      ) : (
                        <div key={index} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4"><div className="h-20 w-20 rounded-lg bg-muted shrink-0" /><div className="flex-1 space-y-3"><div className="h-4 w-1/3 rounded bg-muted" /><div className="h-5 w-2/3 rounded bg-muted" /></div></div>
                      )
                    ))}
                  </div>
                </div>
              ) : state.filteredProducts.length > 0 ? (
                state.viewMode === "grid" ? (
                  <VirtualizedProductGrid products={state.filteredProducts} onProductClick={(product) => navigate(`/produto/${product.id}`)} isFavorited={isFavorite} onToggleFavorite={toggleFavorite} isInCompare={isInCompare} onToggleCompare={toggleCompare} canAddToCompare={canAddMore} columns={state.gridColumns} columnSelector={<ColumnSelector value={state.gridColumns} onChange={state.setGridColumns} />} activeFiltersCount={state.activeFiltersCount} sortBy={state.sortBy} onSortChange={state.setSortBy} onOpenFilters={() => state.setMobileFiltersOpen(true)} onClearFilters={state.handleReset} viewMode={state.viewMode} onViewModeChange={state.setViewMode} showFilterBar={false} activeColorFilter={(state.filters.colorGroups.length > 0 || state.filters.colorVariations.length > 0) ? { groups: state.filters.colorGroups, variations: state.filters.colorVariations } : null} />
                ) : (
                  <div className="h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm scrollbar-products shadow-inner p-4">
                    <ProductList products={state.filteredProducts} onProductClick={(productId) => navigate(`/produto/${productId}`)} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} isInCompare={isInCompare} onToggleCompare={toggleCompare} canAddToCompare={canAddMore} activeColorFilter={(state.filters.colorGroups.length > 0 || state.filters.colorVariations.length > 0) ? { groups: state.filters.colorGroups, variations: state.filters.colorVariations } : null} />
                  </div>
                )
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground mt-1 mb-4">Tente ajustar os filtros para ver mais resultados</p>
                  <Button variant="outline" onClick={state.handleReset}>Limpar filtros</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <VoiceSearchOverlay isOpen={state.voiceOverlayOpen} isListening={isListening} transcript={transcript} error={error} onClose={() => { state.setVoiceOverlayOpen(false); stopListening(); state.setAppliedFilters([]); }} onToggleListening={handleToggleListening} commandAction={state.commandAction} appliedFilters={state.appliedFilters} />
    </MainLayout>
  );
}
