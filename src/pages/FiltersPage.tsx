import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useProductsByMaterial } from "@/hooks/useProductsByMaterial";
import { useProductsByCategory } from "@/hooks/useProductsByCategory";
import { useProductFuzzySearch } from "@/hooks/useProductFuzzySearch";
import { toast } from "sonner";

export default function FiltersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonContext();
  
  // Buscar produtos reais do banco de dados
  const { data: realProducts = [], isLoading: isLoadingProducts } = useProducts();
  
  const [filters, setFilters] = useState<FilterState>(() => {
    // Verificar se há filtro de fornecedor na URL
    const supplierParam = searchParams.get('supplier');
    if (supplierParam) {
      return { ...defaultFilters, suppliers: [supplierParam] };
    }
    return defaultFilters;
  });

  // Atualizar filtros quando a URL mudar
  useEffect(() => {
    const supplierParam = searchParams.get('supplier');
    if (supplierParam && !filters.suppliers.includes(supplierParam)) {
      setFilters(prev => ({ ...prev, suppliers: [supplierParam] }));
    }
  }, [searchParams]);
  
  // Hook para buscar produtos por materiais (usa tabela product_materials)
  const { productIds: materialFilteredProductIds, hasFilter: hasMaterialFilter, isLoading: isLoadingMaterialFilter } = useProductsByMaterial({
    materialGroupSlugs: filters.materialGroups || [],
    materialTypeSlugs: filters.materialTypes || [],
  });

  // Hook para buscar produtos por categorias (usa tabela product_category_assignments)
  const { productIds: categoryFilteredProductIds, hasFilter: hasCategoryFilter, isLoading: isLoadingCategoryFilter } = useProductsByCategory({
    categoryIds: filters.categories, // Já são UUIDs (strings)
    includeDescendants: true,
  });
  const [activePresetId, setActivePresetId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [commandAction, setCommandAction] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Array<{ type: "category" | "color" | "price" | "material" | "stock" | "featured" | "kit"; label: string }>>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Loading transition when filters change (#5)
  const filtersJson = JSON.stringify(filters);
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 350);
    return () => clearTimeout(timer);
  }, [filtersJson]);

  // Use sortBy from FilterState
  const sortBy = filters.sortBy || 'name';
  const setSortBy = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, sortBy: value }));
  }, []);

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
          // Categories são agora UUIDs (strings)
          const categoryIds = command.value as string[];
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
    // Cores hierárquicas
    if ((filters.colorGroups?.length || 0) + (filters.colorVariations?.length || 0) + (filters.colorNuances?.length || 0) + filters.colors.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.suppliers.length > 0) count++;
    if (filters.publicoAlvo.length > 0) count++;
    if (filters.datasComemorativas.length > 0) count++;
    if (filters.endomarketing.length > 0) count++;
    if (filters.ramosAtividade?.length > 0) count++;
    if (filters.segmentosAtividade?.length > 0) count++;
    if ((filters.materialGroups?.length || 0) + (filters.materialTypes?.length || 0) + filters.materiais.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 9999) count++;
    if (filters.inStock) count++;
    if (filters.isKit) count++;
    if (filters.featured) count++;
    if (filters.isNew) count++;
    if (filters.hasPersonalization) count++;
    if (filters.hasCommercialPackaging) count++;
    if ((filters.techniques?.length || 0) > 0) count++;
    if ((filters.tags?.length || 0) > 0) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  // Pegar search da URL
  const searchQuery = searchParams.get('search') || '';

  // Busca fuzzy de produtos - tolerante a erros de digitação
  const { results: fuzzySearchResults, hasSearch: hasFuzzySearch } = useProductFuzzySearch(realProducts, searchQuery);

  // Aplicar filtros nos produtos - USANDO PRODUTOS REAIS
  const filteredProducts = useMemo(() => {
    // Se há busca da URL, usar resultados do fuzzy search
    let result = hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts];

    // Busca textual inline do FilterPanel (#2)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por cores - sistema hierárquico (colorGroups / colorVariations / colorNuances)
    // Lógica: variações são mais específicas que grupos; nuances se aplicam sobre qualquer cor
    const hasGroupFilter = filters.colorGroups.length > 0;
    const hasVariationFilter = filters.colorVariations.length > 0;
    const hasNuanceFilter = filters.colorNuances.length > 0;
    const hasLegacyColors = filters.colors.length > 0;
    const hasColorFilter = hasGroupFilter || hasVariationFilter || hasNuanceFilter || hasLegacyColors;

    if (hasColorFilter) {
      result = result.filter((product) => {
        if (!product.colors?.length) return false;
        return product.colors.some((color: any) => {
          const colorName = (color.name || '').toLowerCase();
          const colorGroup = (color.group || '').toLowerCase();
          const colorNuance = (color.nuance || color.finish || '').toLowerCase();

          // Se há variações selecionadas, elas têm prioridade sobre grupos
          // (narrowing: "Amarelo Banana" é mais específico que "Amarelo")
          if (hasVariationFilter) {
            const matchesVariation = filters.colorVariations.some(slug =>
              colorName.includes(slug.toLowerCase().replace(/-/g, ' '))
            );
            if (matchesVariation) {
              // Se há também nuance selecionada, exige que ambos coincidam
              if (hasNuanceFilter) {
                return filters.colorNuances.some(n => colorNuance.includes(n.toLowerCase()));
              }
              return true;
            }
            // Se há grupos selecionados mas não é a variação certa, não passa
            if (hasGroupFilter) return false;
          }

          // Filtro por grupo (sem variações específicas selecionadas)
          if (hasGroupFilter) {
            const matchesGroup = filters.colorGroups.some(slug =>
              colorGroup.includes(slug.toLowerCase()) ||
              colorName.includes(slug.toLowerCase())
            );
            if (matchesGroup) {
              if (hasNuanceFilter) {
                return filters.colorNuances.some(n => colorNuance.includes(n.toLowerCase()));
              }
              return true;
            }
          }

          // Apenas nuance selecionada (sem grupo nem variação)
          if (hasNuanceFilter && !hasGroupFilter && !hasVariationFilter) {
            return filters.colorNuances.some(n => colorNuance.includes(n.toLowerCase()));
          }

          // Fallback legado
          if (hasLegacyColors) {
            return filters.colors.includes(color.name);
          }
          return false;
        });
      });
    }

    // Filtro por categorias usando tabela product_category_assignments
    if (hasCategoryFilter && categoryFilteredProductIds.size > 0) {
      result = result.filter((p) => categoryFilteredProductIds.has(p.id));
    } else if (hasCategoryFilter && categoryFilteredProductIds.size === 0 && !isLoadingCategoryFilter) {
      // Filtro ativo mas sem resultados = nenhum produto corresponde
      result = [];
    }

    // Filtro por fornecedores (por ID ou nome)
    if (filters.suppliers.length > 0) {
      result = result.filter((product) => {
        const supplierId = product.supplier?.id || '';
        const supplierName = (product.supplier?.name || product.brand || '').toLowerCase();
        return (
          filters.suppliers.includes(supplierId) ||
          filters.suppliers.some(s => supplierName.includes(s.toLowerCase())) ||
          filters.suppliers.includes(product.supplier_reference || '')
        );
      });
    }

    // Filtro por Público-Alvo
    if (filters.publicoAlvo.length > 0) {
      result = result.filter((product) => {
        const tags = product.tags?.publicoAlvo || [];
        return filters.publicoAlvo.some(p =>
          tags.some((t: string) => t.toLowerCase() === p.toLowerCase())
        );
      });
    }

    // Filtro por Datas Comemorativas
    if (filters.datasComemorativas.length > 0) {
      result = result.filter((product) => {
        const tags = product.tags?.datasComemorativas || [];
        return filters.datasComemorativas.some(d =>
          tags.some((t: string) => t.toLowerCase().includes(d.toLowerCase()))
        );
      });
    }

    // Filtro por Endomarketing
    if (filters.endomarketing.length > 0) {
      result = result.filter((product) => {
        const tags = product.tags?.endomarketing || [];
        return filters.endomarketing.some(e =>
          tags.some((t: string) => t.toLowerCase() === e.toLowerCase())
        );
      });
    }

    // Filtro por ramos de atividade (nichos/segmentos)
    if (filters.ramosAtividade?.length > 0 || filters.segmentosAtividade?.length > 0) {
      result = result.filter((product) => {
        const ramos = product.tags?.ramo || [];
        const nichos = product.tags?.nicho || [];
        const matchesRamo = filters.ramosAtividade?.length
          ? filters.ramosAtividade.some(r =>
              ramos.some((t: string) => t.toLowerCase().includes(r.toLowerCase()))
            )
          : true;
        const matchesSegmento = filters.segmentosAtividade?.length
          ? filters.segmentosAtividade.some(s =>
              nichos.some((t: string) => t.toLowerCase().includes(s.toLowerCase()))
            )
          : true;
        return matchesRamo || matchesSegmento;
      });
    }

    // Filtro por materiais usando tabela product_materials (hierárquico)
    if (hasMaterialFilter && materialFilteredProductIds.size > 0) {
      result = result.filter((p) => materialFilteredProductIds.has(p.id));
    } else if (hasMaterialFilter && materialFilteredProductIds.size === 0 && !isLoadingMaterialFilter) {
      // Filtro ativo mas sem resultados = nenhum produto corresponde
      result = [];
    }

    // Fallback: Filtro por materiais legado (campo texto)
    if (!hasMaterialFilter && filters.materiais.length > 0) {
      result = result.filter((product) => {
        const materialsStr = Array.isArray(product.materials) ? product.materials.join(' ').toLowerCase() : (product.materials || '').toLowerCase();
        return filters.materiais.some((m) => materialsStr.includes(m.toLowerCase()));
      });
    }

    // Filtro por faixa de preço (só aplica se o usuário realmente ajustou o slider)
    const priceFilterActive = filters.priceRange[0] > 0 || filters.priceRange[1] < 9999;
    if (priceFilterActive) {
      result = result.filter(
        (product) =>
          product.price >= filters.priceRange[0] &&
          product.price <= filters.priceRange[1]
      );
    }

    // Filtro por estoque
    if (filters.inStock) {
      result = result.filter((product) => (product.stock || 0) > 0);
    }

    // Filtro por embalagem especial nativa
    if (filters.hasCommercialPackaging) {
      result = result.filter((product) => product.hasCommercialPackaging === true);
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
  }, [filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter]);

  // Resumo dos filtros ativos para exibição
  const activeFiltersSummary = useMemo(() => {
    const summary: { label: string; value: string; key: keyof FilterState }[] = [];

    // Cores (grupos + variações + nuances + legado)
    const totalCores = (filters.colorGroups?.length || 0) + (filters.colorVariations?.length || 0) + (filters.colorNuances?.length || 0) + filters.colors.length;
    if (totalCores > 0) {
      summary.push({
        label: "Cores",
        value: `${totalCores} selecionada${totalCores > 1 ? 's' : ''}`,
        key: "colors",
      });
    }
    if (filters.categories.length > 0) {
      summary.push({
        label: "Categorias",
        value: `${filters.categories.length} selecionada${filters.categories.length > 1 ? 's' : ''}`,
        key: "categories",
      });
    }
    if (filters.suppliers.length > 0) {
      summary.push({
        label: "Fornecedores",
        value: `${filters.suppliers.length} selecionado${filters.suppliers.length > 1 ? 's' : ''}`,
        key: "suppliers",
      });
    }
    if (filters.publicoAlvo.length > 0) {
      summary.push({
        label: "Público-Alvo",
        value: filters.publicoAlvo.slice(0, 2).join(", ") + (filters.publicoAlvo.length > 2 ? ` +${filters.publicoAlvo.length - 2}` : ""),
        key: "publicoAlvo",
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
        value: filters.endomarketing.slice(0, 2).join(", "),
        key: "endomarketing",
      });
    }
    const totalMateriais = (filters.materialGroups?.length || 0) + (filters.materialTypes?.length || 0) + filters.materiais.length;
    if (totalMateriais > 0) {
      summary.push({
        label: "Materiais",
        value: `${totalMateriais} selecionado${totalMateriais > 1 ? 's' : ''}`,
        key: "materiais",
      });
    }
    const totalRamos = (filters.ramosAtividade?.length || 0) + (filters.segmentosAtividade?.length || 0);
    if (totalRamos > 0) {
      summary.push({
        label: "Nichos",
        value: `${totalRamos} selecionado${totalRamos > 1 ? 's' : ''}`,
        key: "ramosAtividade",
      });
    }

    return summary;
  }, [filters]);

  const clearSingleFilter = (key: keyof FilterState) => {
    // Grupos hierárquicos: limpar todos os níveis juntos
    if (key === "colors") {
      setFilters({ ...filters, colors: [], colorGroups: [], colorVariations: [], colorNuances: [] });
    } else if (key === "materiais") {
      setFilters({ ...filters, materiais: [], materialGroups: [], materialTypes: [] });
    } else if (key === "ramosAtividade") {
      setFilters({ ...filters, ramosAtividade: [], segmentosAtividade: [] });
    } else if (Array.isArray(filters[key])) {
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
            <div className="sticky top-20 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-thin pr-2">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                activeFiltersCount={activeFiltersCount}
              />
            </div>
          </aside>

          {/* Products area - alinhado com a sidebar */}
          <div className="flex-1 min-h-[calc(100vh-10rem)] space-y-3 relative">
            {/* Loading transition overlay (#5) */}
            {isFiltering && (
              <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-start justify-center pt-32 transition-opacity duration-200 pointer-events-none rounded-xl">
                <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Filtrando...</span>
                </div>
              </div>
            )}
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