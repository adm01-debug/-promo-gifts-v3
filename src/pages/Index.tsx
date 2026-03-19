// Catálogo de Produtos - Index Page (v2)
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Package,
  TrendingUp,
  Users,
  Layers,
  Filter,
  ArrowUpDown,
  User,
  X,
  Palette,
  Loader2,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { ProductGrid } from "@/components/products/ProductGrid";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { StatsPopover } from "@/components/products/StatsPopover";
import { ProductList } from "@/components/products/ProductList";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductListSkeleton } from "@/components/products/ProductListItemSkeleton";
import { FilterPanel, FilterState, defaultFilters } from "@/components/filters/FilterPanel";



import { SmartSearchInput } from "@/components/search";
import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORIES, SUPPLIERS } from "@/data/mockData";

import { useProductsCatalog } from "@/hooks/useProductsLightweight";
import type { Product } from "@/hooks/useProducts";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useToast } from "@/hooks/use-toast";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import { useComparisonContext } from "@/contexts/ComparisonContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { EmptyState } from "@/components/common/EmptyState";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { RecentlyViewedPopover } from "@/components/products/RecentlyViewedPopover";
import { InfoTooltip } from "@/components/common/ContextualTooltips";
import { useProductsByMaterial } from "@/hooks/useProductsByMaterial";
import { useProductFuzzySearch } from "@/hooks/useProductFuzzySearch";
import { useProductsByCategory } from "@/hooks/useProductsByCategory";
import { useDebounce } from "@/hooks/useDebounce";
import { useExternalCategoriesQuery } from "@/hooks/useExternalCategoriesQuery";

type ViewMode = "grid" | "list";
type SortOption = "name" | "price-asc" | "price-desc" | "stock" | "newest" | "color-match";

export default function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavoritesContext();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonContext();
  const { registerProducts } = useProductsContext();

  // Ler query de busca da URL
  const searchQueryFromUrl = searchParams.get("search") || "";

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchQueryFromUrl);

  // Debounce da busca para server-side search
  const debouncedServerSearch = useDebounce(searchQuery, 400);

  // Buscar produtos reais do banco de dados — versão LIGHTWEIGHT com paginação infinita server-side
  const {
    data: catalogData,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useProductsCatalog(debouncedServerSearch ? { search: debouncedServerSearch } : undefined);

  // Flatten infinite query pages into a single array
  const realProducts = useMemo(() => {
    if (!catalogData?.pages) return [] as Product[];
    return catalogData.pages.flatMap(page => page.products);
  }, [catalogData]);

  const totalEstimate = catalogData?.pages?.[0]?.totalEstimate ?? null;

  // Register fetched products into the lazy cache for other contexts (favorites, etc.)
  useEffect(() => {
    if (realProducts.length > 0) registerProducts(realProducts);
  }, [realProducts, registerProducts]);

  const { suggestions, quickSuggestions, history, addToHistory } = useSearch(realProducts);
  
  const [isSearching, setIsSearching] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const ITEMS_PER_PAGE = 12;
  
  // Hook para buscar produtos por materiais (usa tabela product_materials)
  const { productIds: materialFilteredProductIds, hasFilter: hasMaterialFilter, isLoading: isLoadingMaterialFilter } = useProductsByMaterial({
    materialGroupSlugs: filters.materialGroups || [],
    materialTypeSlugs: filters.materialTypes || [],
  });

  // Hook para buscar produtos por categorias (usa tabela product_category_assignments)
  const { productIds: categoryFilteredProductIds, hasFilter: hasCategoryFilter, isLoading: isLoadingCategoryFilter } = useProductsByCategory({
    categoryIds: filters.categories?.map(String) || [],
    includeDescendants: true,
  });

  // Total de categorias da mesma fonte do Super Filtro
  const { data: externalCategories = [] } = useExternalCategoriesQuery();
  
  // Estado de loading combinado
  const isLoading = isLoadingProducts || isLoadingMaterialFilter || isLoadingCategoryFilter;
  const isInitialCatalogLoad = (isLoadingProducts || isFetchingProducts) && realProducts.length === 0;

  // Sincronizar searchQuery com URL
  useEffect(() => {
    setSearchQuery(searchQueryFromUrl);
  }, [searchQueryFromUrl]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filters, sortBy, searchQuery]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.colors.length) count += filters.colors.length;
    // Contar filtros do sistema hierárquico de cores
    if (filters.colorGroups?.length) count += filters.colorGroups.length;
    if (filters.colorVariations?.length) count += filters.colorVariations.length;
    if (filters.colorNuances?.length) count += filters.colorNuances.length;
    if (filters.categories.length) count += filters.categories.length;
    if (filters.suppliers.length) count += filters.suppliers.length;
    if (filters.publicoAlvo.length) count += filters.publicoAlvo.length;
    if (filters.datasComemorativas.length) count += filters.datasComemorativas.length;
    if (filters.endomarketing.length) count += filters.endomarketing.length;
    if (filters.ramosAtividade?.length) count += filters.ramosAtividade.length;
    if (filters.segmentosAtividade?.length) count += filters.segmentosAtividade.length;
    // Sistema hierárquico de materiais
    if (filters.materialGroups?.length) count += filters.materialGroups.length;
    if (filters.materialTypes?.length) count += filters.materialTypes.length;
    if (filters.materiais.length) count += filters.materiais.length;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) count += 1;
    if (filters.inStock) count += 1;
    if (filters.isKit) count += 1;
    if (filters.featured) count += 1;
    return count;
  }, [filters]);


  // Debounce da busca para evitar buscas a cada tecla digitada
  const debouncedSearchQuery = useDebounce(searchQuery, 350);

  // Busca fuzzy de produtos - tolerante a erros de digitação
  const { results: fuzzySearchResults, hasSearch: hasFuzzySearch } = useProductFuzzySearch(realProducts, debouncedSearchQuery);

  // Filtrar e ordenar produtos - USANDO PRODUTOS REAIS
  const filteredProducts = useMemo(() => {
    // Se há busca, usar resultados do fuzzy search
    let result = hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts];

    // Filtro por categoria do sidebar usando tabela product_category_assignments
    if (hasCategoryFilter && categoryFilteredProductIds.size > 0) {
      result = result.filter((p) => categoryFilteredProductIds.has(p.id));
    } else if (hasCategoryFilter && categoryFilteredProductIds.size === 0 && !isLoadingCategoryFilter) {
      // Filtro ativo mas sem resultados = nenhum produto corresponde
      result = [];
    }

    // Aplicar filtros
    // Filtro de cores legado
    if (filters.colors.length) {
      result = result.filter((p) => 
        p.colors?.some((c: any) => filters.colors.includes(c.name)) || false
      );
    }

    // Filtro de cores hierárquico - por grupo (Azul, Verde, etc.)
    // colorGroups contém slugs (ex: "azul", "verde") e p.colors[].group contém nomes (ex: "Azul")
    if (filters.colorGroups?.length) {
      result = result.filter((p) => 
        p.colors?.some((c: any) => {
          const colorGroupSlug = c.groupSlug || '';
          const colorGroup = (c.group || '').toLowerCase().trim();
          const colorName = (c.name || '').toLowerCase().trim();
          
          return filters.colorGroups.some(slug => {
            const slugLower = slug.toLowerCase().trim();
            // Match direto pelo groupSlug do banco
            if (colorGroupSlug === slugLower) return true;
            // Fallback keyword
            if (colorGroup === slugLower) return true;
            if (colorGroup.includes(slugLower) || slugLower.includes(colorGroup)) return true;
            if (colorName.includes(slugLower) || slugLower.includes(colorName.split(/[\s-]/)[0])) return true;
            return false;
          });
        }) || false
      );
    }

    // Filtro de cores hierárquico - por variação específica (Azul Royal, Verde Limão, etc.)
    if (filters.colorVariations?.length) {
      result = result.filter((p) => 
        p.colors?.some((c: any) => {
          const colorVariationSlug = c.variationSlug || '';
          const colorName = (c.name || '').toLowerCase().trim();
          return filters.colorVariations.some(slug => {
            const slugLower = slug.toLowerCase().trim();
            // Match direto pelo variationSlug do banco
            if (colorVariationSlug === slugLower) return true;
            // Fallback keyword
            const slugWords = slugLower.split('-');
            return slugWords.every(word => colorName.includes(word));
          });
        }) || false
      );
    }

    if (filters.categories.length) {
      result = result.filter((p) => 
        filters.categories.includes(parseInt(p.category_id || '0')) ||
        filters.categories.map(String).includes(p.category_id || '')
      );
    }

    if (filters.suppliers.length) {
      result = result.filter((p) => 
        filters.suppliers.includes(p.brand || '') ||
        filters.suppliers.includes(p.supplier_reference || '')
      );
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) {
      result = result.filter((p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]);
    }

    if (filters.inStock) {
      result = result.filter((p) => (p.stock || 0) > 0);
    }

    // isKit e featured não existem no banco externo, ignorar por enquanto

    // Filtro por materiais usando tabela product_materials (hierárquico)
    if (hasMaterialFilter && materialFilteredProductIds.size > 0) {
      result = result.filter((p) => materialFilteredProductIds.has(p.id));
    } else if (hasMaterialFilter && materialFilteredProductIds.size === 0 && !isLoadingMaterialFilter) {
      // Filtro ativo mas sem resultados = nenhum produto corresponde
      result = [];
    }

    // Fallback: Filtro por materiais legado (campo texto)
    if (!hasMaterialFilter && filters.materiais.length) {
      result = result.filter((p) => {
        const materialsStr = Array.isArray(p.materials) ? p.materials.join(' ').toLowerCase() : (p.materials || '').toLowerCase();
        return filters.materiais.some((m) => materialsStr.includes(m.toLowerCase()));
      });
    }

    // Ordenar — pular ordenação por nome quando há busca ativa (preservar relevância)
    const skipSort = hasFuzzySearch && sortBy === 'name';
    if (!skipSort) {
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
        case "newest":
          result.sort((a, b) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
          break;
      }
    }

    return result;
  }, [filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter]);

  // Paginated products
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);

  const shouldShowCatalogSkeleton = isInitialCatalogLoad || (isLoading && paginatedProducts.length === 0);
  const hasActiveCatalogConstraints = activeFiltersCount > 0 || searchQuery.trim().length > 0;
  const shouldShowEmptyState = !shouldShowCatalogSkeleton && paginatedProducts.length === 0;

  // Has more products to load (client-side pagination OR server-side pages)
  const hasMoreProducts = useMemo(() => {
    const hasMoreClientSide = paginatedProducts.length < filteredProducts.length;
    const hasMoreServerSide = !!hasNextPage;
    return hasMoreClientSide || hasMoreServerSide;
  }, [paginatedProducts, filteredProducts, hasNextPage]);

  // INFINITE SCROLL com IntersectionObserver SEGURO
  // Usa refs para evitar loops de re-renderização
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Função loadMore estável com proteção contra múltiplos disparos
  const loadMore = useCallback(() => {
    // Proteção tripla contra loops
    if (isUpdatingRef.current) return;
    if (isLoading || isLoadingMore || isFetchingNextPage) return;
    if (!hasMoreProducts) return;
    
    isUpdatingRef.current = true;
    setIsLoadingMore(true);
    
    // Check if we need more server-side data
    const nextDisplayCount = displayCount + ITEMS_PER_PAGE;
    const needsServerData = nextDisplayCount >= filteredProducts.length && hasNextPage;

    if (needsServerData) {
      // Fetch next server page, then increase display count
      fetchNextPage().finally(() => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
        setTimeout(() => { isUpdatingRef.current = false; }, 100);
      });
    } else {
      setTimeout(() => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
        setTimeout(() => { isUpdatingRef.current = false; }, 100);
      }, 150);
    }
  }, [isLoading, isLoadingMore, isFetchingNextPage, hasMoreProducts, displayCount, filteredProducts.length, hasNextPage, fetchNextPage]);

  // Observer com proteções - reconecta apenas quando necessário
  useEffect(() => {
    // Não inicializa se ainda está carregando dados iniciais
    if (isLoading) return;

    // Desconecta observer anterior se existir
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Cria novo observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Só dispara se está visível E não está em processo de atualização
        if (entry.isIntersecting && hasMoreProducts && !isLoadingMore && !isUpdatingRef.current) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    // Observa o elemento trigger
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMoreProducts, isLoadingMore, loadMore]);

  // Stats for popover
  const statBadges = useMemo(
    () => {
      const totalVariants = filteredProducts.reduce((sum, p) => sum + (p.colors?.length || 0), 0);
      const uniqueCategoryIds = new Set(
        filteredProducts
          .map((p) => p.category_id || (p.category?.id ? String(p.category.id) : ""))
          .filter((id) => id && id !== "0")
      );
      const uniqueSuppliers = new Set(filteredProducts.map(p => p.supplier?.name).filter(Boolean).filter(n => n !== "Sem fornecedor"));
      const categoriesCount = externalCategories.length || uniqueCategoryIds.size;

      return [
        { id: "products", label: "Produtos Únicos", value: filteredProducts.length, icon: <Package className="h-4 w-4" /> },
        { id: "variants", label: "Variações", value: totalVariants, icon: <Layers className="h-4 w-4" /> },
        { id: "categories", label: "Categorias", value: categoriesCount, icon: <Layers className="h-4 w-4" /> },
        { id: "suppliers", label: "Fornecedores", value: uniqueSuppliers.size, icon: <Users className="h-4 w-4" /> },
        { id: "favorites", label: "Favoritos", value: favoriteCount, icon: <TrendingUp className="h-4 w-4" /> },
      ];
    },
    [filteredProducts, favoriteCount, externalCategories.length],
  );

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSortBy("name");
  };

  const handleViewProduct = (product: Product) => {
    navigate(`/produto/${product.id}`);
  };

  const handleShareProduct = (product: Product) => {
    const shareUrl = `${window.location.origin}/produto/${product.id}`;
    const shareText = `Confira ${product.name} por R$ ${product.price.toFixed(2)}`;

    if (navigator.share) {
      navigator
        .share({
          title: product.name,
          text: shareText,
          url: shareUrl,
        })
        .then(() => {
          toast({
            title: "Compartilhado!",
            description: "Produto compartilhado com sucesso",
          });
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copiado!",
        description: "O link do produto foi copiado para a área de transferência",
      });
    }
  };

  const handleFavoriteProduct = (product: Product) => {
    toggleFavorite(product.id);
  };

  // Stable search handler to prevent re-render loops
  const handleSearch = useCallback((query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    if (query) addToHistory(query);
    setTimeout(() => setIsSearching(false), 300);
  }, [addToHistory]);


  return (
    <MainLayout>
      <div>
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-3 p-4 sm:p-6">
            {/* Line 1: Title + Search + Recently Viewed */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-shrink-0">
                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
                  Catálogo de Produtos
                  <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">
                    · {shouldShowCatalogSkeleton ? "Carregando catálogo..." : `${filteredProducts.length.toLocaleString("pt-BR")} itens`}
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0 sm:max-w-xl">
                <SmartSearchInput
                  placeholder="Buscar produtos..."
                  onSelect={(result) => {
                    if (result.type === "product") {
                      navigate(`/produto/${result.id}`);
                    } else if (result.type === "category") {
                      setFilters(prev => ({ ...prev, categories: [parseInt(result.id)] }));
                    } else if (result.type === "supplier") {
                      setFilters(prev => ({ ...prev, suppliers: [result.id] }));
                    } else {
                      handleSearch(result.label);
                    }
                  }}
                  className="flex-1"
                />
                <div className="hidden sm:block">
                  <RecentlyViewedPopover maxVisible={10} />
                </div>
              </div>
            </div>


            {/* Line 2: Filters + Sort + Stats + Layout */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <FilterPanel
                      filters={filters}
                      onFilterChange={setFilters}
                      onReset={resetFilters}
                      activeFiltersCount={activeFiltersCount}
                    />
                  </SheetContent>
                </Sheet>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-32 sm:w-44">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="price-asc">Menor Preço</SelectItem>
                    <SelectItem value="price-desc">Maior Preço</SelectItem>
                    <SelectItem value="stock">Maior Estoque</SelectItem>
                    <SelectItem value="newest">Novidades</SelectItem>
                  </SelectContent>
                </Select>
                <div className="hidden sm:block">
                  <StatsPopover stats={statBadges} />
                </div>
              </div>

              {/* Right - Layout popover */}
              <div className="hidden sm:block">
                <LayoutPopover
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  gridColumns={gridColumns}
                  setGridColumns={setGridColumns}
                />
              </div>
            </div>

            {/* Active filters display */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.colors.map((color) => (
                  <Badge
                    key={color}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/10"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        colors: filters.colors.filter((c) => c !== color),
                      })
                    }
                  >
                    🎨 {color}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
                {filters.categories.map((catId) => {
                  const cat = CATEGORIES.find((c) => c.id === catId);
                  return cat ? (
                    <Badge
                      key={catId}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10"
                      onClick={() =>
                        setFilters({
                          ...filters,
                          categories: filters.categories.filter((c) => c !== catId),
                        })
                      }
                    >
                      {cat.icon} {cat.name}
                      <span className="ml-1">×</span>
                    </Badge>
                  ) : null;
                })}
                {filters.featured && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/10"
                    onClick={() => setFilters({ ...filters, featured: false })}
                  >
                    ⭐ Destaques
                    <span className="ml-1">×</span>
                  </Badge>
                )}
                {filters.isKit && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/10"
                    onClick={() => setFilters({ ...filters, isKit: false })}
                  >
                    📦 KITs
                    <span className="ml-1">×</span>
                  </Badge>
                )}
              </div>
            )}

            {/* Product grid or list with scroll container */}
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
                  onToggleCompare={toggleCompare}
                  canAddToCompare={canAddMore}
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
                  onToggleCompare={toggleCompare}
                  canAddToCompare={canAddMore}
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
                    Mostrando {paginatedProducts.length} de {filteredProducts.length} produtos
                  </p>
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Carregando mais produtos...</span>
                    </div>
                  )}
                </div>
              )}

              {/* All products loaded message */}
              {!shouldShowCatalogSkeleton && !shouldShowEmptyState && !hasMoreProducts && filteredProducts.length > ITEMS_PER_PAGE && (
                <div className="flex justify-center pt-8">
                  <p className="text-sm text-muted-foreground">
                    Todos os {filteredProducts.length} produtos foram carregados ✓
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Floating Compare Bar */}
      <FloatingCompareBar />
    </MainLayout>
  );
}


