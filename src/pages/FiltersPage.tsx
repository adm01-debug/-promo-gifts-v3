import { useNavigate } from "react-router-dom";
import { useCallback, useState, useEffect, useMemo, lazy, Suspense } from "react";
import { SharePreviewDialog } from "@/components/products/share/SharePreviewDialog";
import type { Product } from "@/hooks/useProducts";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { FilterPanel, FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { PresetsBar } from "@/components/filters/PresetsBar";
import { VirtualizedProductGrid } from "@/components/products/VirtualizedProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { ProductTableView } from "@/components/products/ProductTableView";
import { ColumnSelector } from "@/components/products/ColumnSelector";
import { BulkActionBar } from "@/components/products/BulkActionBar";
import { BulkAddToCartModal } from "@/components/catalog/BulkAddToCartModal";
import { BulkVariantWizard, type BulkVariantSelection, type BulkWizardMode } from "@/components/catalog/BulkVariantWizard";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, ArrowUpDown, X, CheckSquare } from "lucide-react";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { SmartSearchInput } from "@/components/search";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { VoiceAgentAction } from "@/hooks/voice/types";
import { toast } from "sonner";
import { useFiltersPageState } from "./filters/useFiltersPageState";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const LazyVoiceOverlay = lazy(() => import("@/components/search/VoiceSearchOverlayConnected"));

export default function FiltersPage() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonStore();

  const state = useFiltersPageState();

  // ========== SHARE STATE ==========
  const [shareProduct, setShareProduct] = useState<Product | null>(null);

  // ========== SELECTION MODE ==========
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // Clear selection when leaving selection mode
  useEffect(() => { if (!state.selectionMode) setSelectedIds(new Set()); }, [state.selectionMode]);

  // Remove stale IDs when products change
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const validIds = new Set(state.filteredProducts.map(p => p.id));
      const filtered = new Set([...prev].filter(id => validIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [state.filteredProducts]);

  useEffect(() => { setSelectedCount(selectedIds.size); }, [selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedIds(new Set(state.filteredProducts.map(p => p.id))), [state.filteredProducts]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkFavorite = useCallback(() => {
    setWizardMode('favorite');
    setVariantWizardOpen(true);
  }, []);

  const handleBulkCompare = useCallback(() => {
    setWizardMode('compare');
    setVariantWizardOpen(true);
  }, []);

  const handleBulkCollection = useCallback(() => {
    setWizardMode('collection');
    setVariantWizardOpen(true);
  }, []);
  
  const [variantWizardOpen, setVariantWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<BulkWizardMode>('cart');
  const [wizardSelections, setWizardSelections] = useState<BulkVariantSelection[]>([]);

  const handleBulkCart = useCallback(() => {
    setWizardMode('cart');
    setVariantWizardOpen(true);
  }, []);

  const handleBulkQuote = useCallback(() => {
    setWizardMode('quote');
    setVariantWizardOpen(true);
  }, []);

  const handleWizardComplete = useCallback((selections: BulkVariantSelection[]) => {
    if (wizardMode === 'cart') {
      setWizardSelections(selections);
      setCartModalOpen(true);
    } else if (wizardMode === 'quote') {
      if (selections.length === 0) return;
      const params = selections.map(s =>
        `items[]=${encodeURIComponent(JSON.stringify({
          product_id: s.product.id,
          product_name: s.product.name,
          product_sku: s.product.sku || '',
          product_price: s.product.price,
          product_image: s.variant?.selected_thumbnail || s.product.images?.[0] || '',
          quantity: 1,
          color_name: s.variant?.color_name || null,
          color_hex: s.variant?.color_hex || null,
          size_code: s.variant?.size_code || null,
        }))}`
      ).join('&');
      navigate(`/orcamentos/novo?${params}`);
      toast.success(`${selections.length} produto${selections.length > 1 ? 's' : ''} enviado${selections.length > 1 ? 's' : ''} para orçamento`);
      clearSelection();
    } else if (wizardMode === 'favorite') {
      const { addFavorite, isFavorite: isFav } = useFavoritesStore.getState();
      let added = 0;
      selections.forEach(s => {
        if (!isFav(s.product.id)) {
          addFavorite(s.product.id, s.variant ? {
            color_name: s.variant.color_name,
            color_hex: s.variant.color_hex,
            size_code: s.variant.size_code,
            variant_id: s.variant.id,
            thumbnail: s.variant.selected_thumbnail,
          } : undefined);
          added++;
        }
      });
      toast.success(`${added} produto${added > 1 ? 's' : ''} favoritado${added > 1 ? 's' : ''} com cor selecionada`);
      clearSelection();
    } else if (wizardMode === 'compare') {
      const { addToCompare, isInCompare: isComp } = useComparisonStore.getState();
      let added = 0;
      selections.slice(0, 4).forEach(s => {
        if (!isComp(s.product.id)) {
          addToCompare(s.product.id, s.variant ? {
            color_name: s.variant.color_name,
            color_hex: s.variant.color_hex,
            size_code: s.variant.size_code,
            variant_id: s.variant.id,
            thumbnail: s.variant.selected_thumbnail,
          } : undefined);
          added++;
        }
      });
      toast.success(`${added} produto${added > 1 ? 's' : ''} adicionado${added > 1 ? 's' : ''} à comparação`);
      clearSelection();
    } else if (wizardMode === 'collection') {
      setWizardSelections(selections);
      setCollectionModalOpen(true);
    }
  }, [wizardMode, navigate, clearSelection]);

  const bulkCartProducts = useMemo(() => {
    const ids = Array.from(selectedIds);
    return state.filteredProducts.filter(p => ids.includes(p.id));
  }, [selectedIds, state.filteredProducts]);

  const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : "";
  const firstSelectedProduct = state.filteredProducts.find(p => p.id === firstSelectedId);

  // ========== VOICE ==========
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

  const toggleSelectionMode = useCallback(() => {
    state.setSelectionMode((prev: boolean) => !prev);
  }, [state]);

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

                {/* Selection toggle */}
                <Button
                  variant={state.selectionMode ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "gap-1.5 h-8 transition-all relative",
                    state.selectionMode
                      ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                      : "hover:border-primary/50"
                  )}
                  onClick={toggleSelectionMode}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">{state.selectionMode ? "Cancelar" : "Selecionar"}</span>
                  <AnimatePresence>
                    {state.selectionMode && selectedCount > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="absolute -top-2 -right-2"
                      >
                        <Badge className="bg-destructive text-destructive-foreground h-5 min-w-5 text-[10px] font-bold px-1.5 py-0 flex items-center justify-center tabular-nums shadow-lg">
                          {selectedCount}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>

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
                <>
                  {state.viewMode === "grid" ? (
                    <VirtualizedProductGrid products={state.filteredProducts} onProductClick={(product) => state.selectionMode ? toggleSelect(product.id) : navigate(`/produto/${product.id}`)} isFavorited={isFavorite} onToggleFavorite={toggleFavorite} isInCompare={isInCompare} onToggleCompare={toggleCompare} canAddToCompare={canAddMore} onShare={(product) => setShareProduct(product)} columns={state.gridColumns} columnSelector={<ColumnSelector value={state.gridColumns} onChange={state.setGridColumns} />} activeFiltersCount={state.activeFiltersCount} sortBy={state.sortBy} onSortChange={state.setSortBy} onOpenFilters={() => state.setMobileFiltersOpen(true)} onClearFilters={state.handleReset} viewMode={state.viewMode} onViewModeChange={state.setViewMode} showFilterBar={false} activeColorFilter={(state.filters.colorGroups.length > 0 || state.filters.colorVariations.length > 0) ? { groups: state.filters.colorGroups, variations: state.filters.colorVariations } : null} selectionMode={state.selectionMode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
                  ) : state.viewMode === "list" ? (
                    <div className="h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm scrollbar-products shadow-inner p-4">
                      <ProductList products={state.filteredProducts} onProductClick={(productId) => state.selectionMode ? toggleSelect(productId) : navigate(`/produto/${productId}`)} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} isInCompare={isInCompare} onToggleCompare={toggleCompare} canAddToCompare={canAddMore} activeColorFilter={(state.filters.colorGroups.length > 0 || state.filters.colorVariations.length > 0) ? { groups: state.filters.colorGroups, variations: state.filters.colorVariations } : null} selectionMode={state.selectionMode} externalSelectedIds={selectedIds} onToggleSelect={toggleSelect} />
                    </div>
                  ) : (
                    <div className="h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner">
                      <ProductTableView
                        products={state.filteredProducts}
                        onProductClick={(productId) => state.selectionMode ? toggleSelect(productId) : navigate(`/produto/${productId}`)}
                        isFavorite={isFavorite}
                        onToggleFavorite={toggleFavorite}
                        isInCompare={isInCompare}
                        onToggleCompare={toggleCompare}
                        selectionMode={state.selectionMode}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                      />
                    </div>
                  )}

                  {/* Bulk Action Bar */}
                  {state.selectionMode && (
                    <BulkActionBar
                      selectedCount={selectedIds.size}
                      totalCount={state.filteredProducts.length}
                      onSelectAll={selectAll}
                      onClearSelection={clearSelection}
                      onBulkFavorite={handleBulkFavorite}
                      onBulkCompare={handleBulkCompare}
                      onBulkCollection={handleBulkCollection}
                      onBulkQuote={handleBulkQuote}
                      onBulkCart={handleBulkCart}
                    />
                  )}

                  {firstSelectedProduct && (
                    <AddToCollectionModal
                      open={collectionModalOpen}
                      onOpenChange={(open) => { setCollectionModalOpen(open); if (!open) clearSelection(); }}
                      productId={firstSelectedId}
                      productName={`${selectedIds.size} produtos selecionados`}
                    />
                  )}
                  <BulkAddToCartModal
                    open={cartModalOpen}
                    onOpenChange={setCartModalOpen}
                    products={bulkCartProducts}
                    variantSelections={wizardSelections}
                    onDone={clearSelection}
                  />
                  <BulkVariantWizard
                    open={variantWizardOpen}
                    onOpenChange={setVariantWizardOpen}
                    products={bulkCartProducts}
                    mode={wizardMode}
                    onComplete={handleWizardComplete}
                  />
                </>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium font-display text-foreground">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground mt-1 mb-4">Tente ajustar os filtros para ver mais resultados</p>
                  <Button variant="outline" onClick={state.handleReset}>Limpar filtros</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {state.voiceOverlayOpen && (
        <Suspense fallback={null}>
          <LazyVoiceOverlay
            isOpen={state.voiceOverlayOpen}
            onClose={() => state.setVoiceOverlayOpen(false)}
            onAction={handleVoiceAction}
          />
        </Suspense>
      )}

      {shareProduct && (
        <SharePreviewDialog
          open={!!shareProduct}
          onOpenChange={(open) => { if (!open) setShareProduct(null); }}
          product={shareProduct}
        />
      )}
    </MainLayout>
  );
}