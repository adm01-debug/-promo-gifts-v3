import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { FilterPanel, FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { PresetsBar } from "@/components/filters/PresetsBar";
import { VirtualizedProductGrid } from "@/components/products/VirtualizedProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { VoiceSearchOverlay } from "@/components/search/VoiceSearchOverlay";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Filter, 
  SlidersHorizontal, 
  X,
  Mic
} from "lucide-react";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import { useComparisonContext } from "@/contexts/ComparisonContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { toast } from "sonner";

export default function FiltersPage() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonContext();
  
  // Buscar produtos reais do banco de dados
  const { data: realProducts = [], isLoading: isLoadingProducts } = useProducts();
  
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [activePresetId, setActivePresetId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<string>("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [commandAction, setCommandAction] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Array<{ type: "category" | "color" | "price" | "material" | "stock" | "featured" | "kit"; label: string }>>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { parseCommand } = useVoiceCommands();

  const handleVoiceResult = useCallback((transcript: string) => {
    const command = parseCommand(transcript);
    setAppliedFilters([]); // Reset applied filters
    
    switch (command.type) {
      case "compound":
        // Apply multiple filters at once
        if (command.filters && command.filters.length > 0) {
          const newAppliedFilters: typeof appliedFilters = [];
          
          setFilters(prev => {
            const newFilters = { ...prev };
            command.filters!.forEach(filter => {
              if (filter.filterKey === "colors" && Array.isArray(filter.value)) {
                newFilters.colors = [...prev.colors, ...(filter.value as string[])];
                (filter.value as string[]).forEach(c => {
                  newAppliedFilters.push({ type: "color", label: c });
                });
              } else if (filter.filterKey === "categories" && Array.isArray(filter.value)) {
                newFilters.categories = [...prev.categories, ...(filter.value as number[])];
                newAppliedFilters.push({ type: "category", label: "Categoria" });
              } else if (filter.filterKey === "materiais" && Array.isArray(filter.value)) {
                newFilters.materiais = [...prev.materiais, ...(filter.value as string[])];
                (filter.value as string[]).forEach(m => {
                  newAppliedFilters.push({ type: "material", label: m });
                });
              } else if (filter.filterKey === "priceRange" && Array.isArray(filter.value)) {
                const [min, max] = filter.value as string[];
                newFilters.priceRange = [parseInt(min) || 0, parseInt(max) || 500];
                newAppliedFilters.push({ type: "price", label: `Até R$${max}` });
              } else if (filter.filterKey === "isKit") {
                newFilters.isKit = true;
                newAppliedFilters.push({ type: "kit", label: "Kits" });
              } else if (filter.filterKey === "inStock") {
                newFilters.inStock = true;
                newAppliedFilters.push({ type: "stock", label: "Em estoque" });
              } else if (filter.filterKey === "featured") {
                newFilters.featured = true;
                newAppliedFilters.push({ type: "featured", label: "Destaques" });
              }
            });
            return newFilters;
          });
          
          setAppliedFilters(newAppliedFilters);
          setCommandAction(command.action || "Filtros aplicados");
          toast.success(`${newAppliedFilters.length} filtros aplicados`);
        }
        setActivePresetId(undefined);
        break;

      case "filter":
        if (command.filterKey === "colors" && command.value) {
          setFilters(prev => ({ ...prev, colors: [...prev.colors, ...(command.value as string[])] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "categories" && command.value) {
          const categoryIds = (command.value as string[]).map(v => parseInt(v)).filter(n => !isNaN(n));
          setFilters(prev => ({ ...prev, categories: [...prev.categories, ...categoryIds] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "materiais" && command.value) {
          setFilters(prev => ({ ...prev, materiais: [...prev.materiais, ...(command.value as string[])] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "priceRange" && command.value) {
          const [min, max] = command.value as string[];
          setFilters(prev => ({ ...prev, priceRange: [parseInt(min) || 0, parseInt(max) || 500] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "isKit") {
          setFilters(prev => ({ ...prev, isKit: true }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Mostrando kits");
        } else if (command.filterKey === "inStock") {
          setFilters(prev => ({ ...prev, inStock: true }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Mostrando em estoque");
        } else if (command.filterKey === "featured") {
          setFilters(prev => ({ ...prev, featured: true }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Mostrando destaques");
        }
        setActivePresetId(undefined);
        break;
        
      case "sort":
        if (command.sortValue) {
          setSortBy(command.sortValue);
          setCommandAction(command.action || null);
          toast.success(command.action || "Ordenação aplicada");
        }
        break;
        
      case "clear":
        setFilters(defaultFilters);
        setActivePresetId(undefined);
        setCommandAction("Filtros limpos");
        toast.success("Filtros limpos");
        break;
        
      case "search":
        setCommandAction(`Buscar "${command.value}"`);
        toast.info(`Busca: "${command.value}"`);
        break;
        
      default:
        setCommandAction("Comando não reconhecido");
        toast.warning("Comando não reconhecido");
    }

    // Clear action after 3 seconds
    setTimeout(() => {
      setCommandAction(null);
      setAppliedFilters([]);
    }, 3000);
    
    // Close overlay after processing
    setTimeout(() => setVoiceOverlayOpen(false), 2000);
  }, [parseCommand]);

  const { 
    isListening, 
    isSupported, 
    transcript, 
    startListening, 
    stopListening, 
    error 
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    language: "pt-BR",
  });

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleApplyPreset = (presetFilters: FilterState, presetId?: string) => {
    setFilters(presetFilters);
    setActivePresetId(presetId);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setActivePresetId(undefined);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setActivePresetId(undefined);
  };

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.colors.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.suppliers.length > 0) count++;
    if (filters.publicoAlvo.length > 0) count++;
    if (filters.datasComemorativas.length > 0) count++;
    if (filters.endomarketing.length > 0) count++;
    if (filters.ramosAtividade?.length > 0) count++;
    if (filters.segmentosAtividade?.length > 0) count++;
    if (filters.materiais.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) count++;
    if (filters.inStock) count++;
    if (filters.isKit) count++;
    if (filters.featured) count++;
    return count;
  }, [filters]);

  // Aplicar filtros nos produtos - USANDO PRODUTOS REAIS
  const filteredProducts = useMemo(() => {
    let result = [...realProducts];

    // Filtro por cores
    if (filters.colors.length > 0) {
      result = result.filter((product) =>
        product.colors?.some((color: any) => filters.colors.includes(color.name)) || false
      );
    }

    // Filtro por categorias
    if (filters.categories.length > 0) {
      result = result.filter((product) =>
        filters.categories.includes(parseInt(product.category_id || '0')) ||
        filters.categories.map(String).includes(product.category_id || '')
      );
    }

    // Filtro por fornecedores
    if (filters.suppliers.length > 0) {
      result = result.filter((product) =>
        filters.suppliers.includes(product.brand || '') ||
        filters.suppliers.includes(product.supplier_reference || '')
      );
    }

    // Filtros de tags não existem no banco externo, ignorar por enquanto
    // (publicoAlvo, datasComemorativas, endomarketing)

    // Filtro por ramos de atividade (nichos/segmentos)
    // TODO: Integrar com dados reais de produto_ramo_atividade quando estiver implementado
    // Por enquanto, o filtro é aplicado apenas no banco de dados externo

    // Filtro por materiais
    if (filters.materiais.length > 0) {
      result = result.filter((product) =>
        filters.materiais.some((m) => 
          (product.materials || '').toLowerCase().includes(m.toLowerCase())
        )
      );
    }

    // Filtro por faixa de preço
    result = result.filter(
      (product) =>
        product.price >= filters.priceRange[0] &&
        product.price <= filters.priceRange[1]
    );

    // Filtro por estoque
    if (filters.inStock) {
      result = result.filter((product) => (product.stock || 0) > 0);
    }

    // isKit e featured não existem no banco externo, ignorar por enquanto

    // Ordenação
    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "stock":
        result.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        break;
    }

    return result;
  }, [filters, sortBy, realProducts]);

  // Resumo dos filtros ativos para exibição
  const activeFiltersSummary = useMemo(() => {
    const summary: { label: string; value: string; key: keyof FilterState }[] = [];

    if (filters.colors.length > 0) {
      summary.push({
        label: "Cores",
        value: filters.colors.slice(0, 2).join(", ") + (filters.colors.length > 2 ? ` +${filters.colors.length - 2}` : ""),
        key: "colors",
      });
    }
    if (filters.categories.length > 0) {
      summary.push({
        label: "Categorias",
        value: `${filters.categories.length} selecionadas`,
        key: "categories",
      });
    }
    if (filters.datasComemorativas.length > 0) {
      summary.push({
        label: "Datas",
        value: filters.datasComemorativas[0],
        key: "datasComemorativas",
      });
    }
    if (filters.endomarketing.length > 0) {
      summary.push({
        label: "Endomarketing",
        value: filters.endomarketing[0],
        key: "endomarketing",
      });
    }

    return summary;
  }, [filters]);

  const clearSingleFilter = (key: keyof FilterState) => {
    if (Array.isArray(filters[key])) {
      setFilters({ ...filters, [key]: [] });
    } else if (typeof filters[key] === "boolean") {
      setFilters({ ...filters, [key]: false });
    }
    setActivePresetId(undefined);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                Super Filtro
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredProducts.length} produtos encontrados
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice search button */}
              {isSupported && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    setVoiceOverlayOpen(true);
                    startListening();
                  }}
                  title="Busca por voz"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}

              {/* Mobile filter button - abre sheet */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterPanel
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onReset={handleReset}
                      activeFiltersCount={activeFiltersCount}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active filters summary */}
          {activeFiltersSummary.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {activeFiltersSummary.map((filter) => (
                <Badge
                  key={filter.key}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => clearSingleFilter(filter.key)}
                >
                  {filter.label}: {filter.value}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground"
              >
                Limpar todos
              </Button>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin pr-2">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                activeFiltersCount={activeFiltersCount}
              />
            </div>
          </aside>

          {/* Products area */}
          <div className="flex-1 min-h-[600px] space-y-4">
            {/* Presets Bar - Above products */}
            <PresetsBar
              currentFilters={filters}
              onApplyPreset={(f) => handleApplyPreset(f)}
              activePresetId={activePresetId}
            />
            {filteredProducts.length > 0 ? (
              viewMode === "grid" ? (
                <VirtualizedProductGrid
                  products={filteredProducts}
                  onProductClick={(product) => navigate(`/produto/${product.id}`)}
                  isFavorited={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  isInCompare={isInCompare}
                  onToggleCompare={toggleCompare}
                  canAddToCompare={canAddMore}
                  // Props para barra de filtros interna
                  activeFiltersCount={activeFiltersCount}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onOpenFilters={() => setMobileFiltersOpen(true)}
                  onClearFilters={handleReset}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  showFilterBar={true}
                />
              ) : (
                <div className="h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 
                  bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm
                  scrollbar-products shadow-inner p-4">
                  {/* Barra de filtros inline para modo lista */}
                  <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2.5 mb-4 -mt-4 -mx-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMobileFiltersOpen(true)}
                          className="gap-2 h-8"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Filtros</span>
                          {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                        {activeFiltersCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
                          >
                            <X className="h-3 w-3" />
                            <span className="hidden sm:inline text-xs">Limpar</span>
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          <strong className="text-foreground">{filteredProducts.length}</strong> produtos
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={sortBy} 
                          onChange={(e) => setSortBy(e.target.value)}
                          className="h-8 text-xs border border-border rounded-md px-2 bg-background"
                        >
                          <option value="name">Nome A-Z</option>
                          <option value="price-asc">Menor preço</option>
                          <option value="price-desc">Maior preço</option>
                          <option value="stock">Maior estoque</option>
                        </select>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewMode("grid")}
                          className="h-8 px-3 text-xs"
                        >
                          Grade
                        </Button>
                      </div>
                    </div>
                  </div>
                  <ProductList
                    products={filteredProducts}
                    onProductClick={(productId) => navigate(`/produto/${productId}`)}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    isInCompare={isInCompare}
                    onToggleCompare={toggleCompare}
                    canAddToCompare={canAddMore}
                  />
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  Nenhum produto encontrado
                </h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Tente ajustar os filtros para ver mais resultados
                </p>
                <Button variant="outline" onClick={handleReset}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Search Overlay */}
      <VoiceSearchOverlay
        isOpen={voiceOverlayOpen}
        isListening={isListening}
        transcript={transcript}
        error={error}
        onClose={() => {
          setVoiceOverlayOpen(false);
          stopListening();
          setAppliedFilters([]);
        }}
        onToggleListening={handleToggleListening}
        commandAction={commandAction}
        appliedFilters={appliedFilters}
      />
    </MainLayout>
  );
}