// Catálogo de Produtos - Index Page
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  TrendingUp,
  Users,
  Layers,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  User,
  X,
  Palette,
  Sparkles,
  Loader2,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductListSkeleton } from "@/components/products/ProductListItemSkeleton";
import { FilterPanel, FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { QuickFilter } from "@/components/filters/QuickFiltersBar";
import { ClientFilterModal } from "@/components/clients/ClientFilterModal";
import { CategorySidebarPanel } from "@/components/categories";
import { SmartSearchInput } from "@/components/search";
import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORIES, SUPPLIERS } from "@/data/mockData";
import { ClientWithColors } from "@/components/clients/ClientFilterModal";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useToast } from "@/hooks/use-toast";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import { useComparisonContext } from "@/contexts/ComparisonContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { EmptyState } from "@/components/common/EmptyState";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { RecentlyViewedBar } from "@/components/products/RecentlyViewedBar";
import { InfoTooltip } from "@/components/common/ContextualTooltips";

type ViewMode = "grid" | "list";
type SortOption = "name" | "price-asc" | "price-desc" | "stock" | "newest" | "color-match";

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavoritesContext();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonContext();
  const { getProductById } = useProductsContext();

  // Buscar produtos reais do banco de dados
  const { data: realProducts = [], isLoading: isLoadingProducts } = useProducts();

  const { suggestions, quickSuggestions, history, addToHistory } = useSearch(realProducts);
  

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithColors | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuickFilterId, setActiveQuickFilterId] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const [selectedExternalCategory, setSelectedExternalCategory] = useState<{ id: string; name: string } | null>(null);
  const [categorySidebarOpen, setCategorySidebarOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const ITEMS_PER_PAGE = 12;
  
  // Estado de loading combinado
  const isLoading = isLoadingProducts;

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filters, sortBy, searchQuery, selectedClient]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.colors.length) count += filters.colors.length;
    if (filters.categories.length) count += filters.categories.length;
    if (filters.suppliers.length) count += filters.suppliers.length;
    if (filters.publicoAlvo.length) count += filters.publicoAlvo.length;
    if (filters.datasComemorativas.length) count += filters.datasComemorativas.length;
    if (filters.endomarketing.length) count += filters.endomarketing.length;
    if (filters.ramosAtividade?.length) count += filters.ramosAtividade.length;
    if (filters.segmentosAtividade?.length) count += filters.segmentosAtividade.length;
    if (filters.materiais.length) count += filters.materiais.length;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) count += 1;
    if (filters.inStock) count += 1;
    if (filters.isKit) count += 1;
    if (filters.featured) count += 1;
    return count;
  }, [filters]);

  // Get client colors for highlighting
  const clientColorGroups = useMemo(() => {
    if (!selectedClient) return [];
    const colors = [selectedClient.primaryColor, ...selectedClient.secondaryColors];
    return colors.map((c) => c.group);
  }, [selectedClient]);

  // Calculate color match score for a product (adaptado para novo formato)
  const getColorMatchScore = (product: Product): number => {
    if (!selectedClient) return 0;
    const clientColors = [selectedClient.primaryColor.group, ...selectedClient.secondaryColors.map((c) => c.group)];
    const productColors = product.colors?.map((c: any) => c.group || c.name) || [];
    const matchCount = productColors.filter((c: string) => clientColors.includes(c)).length;
    return matchCount;
  };

  // Filtrar e ordenar produtos - USANDO PRODUTOS REAIS
  const filteredProducts = useMemo(() => {
    let result = [...realProducts];

    // Text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.category_name || '').toLowerCase().includes(query) ||
          (p.materials || '').toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query),
      );
    }

    // Aplicar filtros
    if (filters.colors.length) {
      result = result.filter((p) => 
        p.colors?.some((c: any) => filters.colors.includes(c.name)) || false
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

    if (filters.materiais.length) {
      result = result.filter((p) => 
        filters.materiais.some((m) => (p.materials || '').toLowerCase().includes(m.toLowerCase()))
      );
    }

    // Filtro por materiais já aplicado acima

    // Ordenar
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
        // Ordenar por data de criação se disponível
        result.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        break;
      case "color-match":
        result.sort((a, b) => getColorMatchScore(b) - getColorMatchScore(a));
        break;
    }

    return result;
  }, [filters, sortBy, selectedClient, searchQuery, realProducts, getColorMatchScore]);

  // Paginated products
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);

  // Has more products to load
  const hasMoreProducts = useMemo(() => {
    return paginatedProducts.length < filteredProducts.length;
  }, [paginatedProducts, filteredProducts]);

  // INFINITE SCROLL com IntersectionObserver SEGURO
  // Usa refs para evitar loops de re-renderização
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Função loadMore estável com proteção contra múltiplos disparos
  const loadMore = useCallback(() => {
    // Proteção tripla contra loops
    if (isUpdatingRef.current) return;
    if (isLoading || isLoadingMore) return;
    if (!hasMoreProducts) return;
    
    isUpdatingRef.current = true;
    setIsLoadingMore(true);
    
    setTimeout(() => {
      setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
      // Libera para próximo load após um delay extra
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }, 300);
  }, [isLoading, isLoadingMore, hasMoreProducts]);

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

  // Quick filters
  const quickFilters: QuickFilter[] = useMemo(
    () => [
      {
        id: "all",
        label: "Todos",
        icon: <Layers className="h-4 w-4 text-orange" />,
        filter: {},
      },
      {
        id: "featured",
        label: "Destaques",
        icon: <Sparkles className="h-4 w-4 text-orange" />,
        filter: { featured: true },
      },
      {
        id: "new",
        label: "Novidades",
        icon: <TrendingUp className="h-4 w-4 text-orange" />,
        filter: { newArrival: true },
      },
      {
        id: "kits",
        label: "Kits",
        icon: <Package className="h-4 w-4 text-orange" />,
        filter: { isKit: true },
      },
    ],
    [],
  );

  // Stats as compact badges
  const statBadges = useMemo(
    () => [
      {
        id: "products",
        label: "Produtos",
        value: filteredProducts.length,
        icon: <Package className="h-4 w-4" />,
      },
      {
        id: "categories",
        label: "Categorias",
        value: CATEGORIES.length,
        icon: <Layers className="h-4 w-4" />,
      },
      {
        id: "suppliers",
        label: "Fornecedores",
        value: SUPPLIERS.length,
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: "favorites",
        label: "Favoritos",
        value: favoriteCount,
        icon: <TrendingUp className="h-4 w-4" />,
      },
    ],
    [filteredProducts, favoriteCount],
  );

  // Handlers
  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveQuickFilterId(filter.id);

    if (filter.id === "all") {
      setFilters(defaultFilters);
      setSortBy("name");
      return;
    }

    const newFilters = { ...defaultFilters };
    if ("featured" in filter.filter) newFilters.featured = true;
    if ("isKit" in filter.filter) newFilters.isKit = true;

    setFilters(newFilters);

    if ("newArrival" in filter.filter) {
      setSortBy("newest");
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setActiveQuickFilterId(undefined);
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

  // Handle external category selection
  const handleExternalCategorySelect = useCallback((categoryId: string | null, categoryName?: string) => {
    if (categoryId && categoryName) {
      setSelectedExternalCategory({ id: categoryId, name: categoryName });
    } else {
      setSelectedExternalCategory(null);
    }
  }, []);

  return (
    <MainLayout>
      <div className="flex">
        {/* Category Sidebar - Desktop only */}
        {isDesktop && (
          <CategorySidebarPanel
            selectedCategoryId={selectedExternalCategory?.id}
            onSelectCategory={handleExternalCategorySelect}
            isCollapsed={!categorySidebarOpen}
            onToggleCollapse={() => setCategorySidebarOpen(!categorySidebarOpen)}
            className="sticky top-0 h-[calc(100vh-4rem)] hidden xl:flex"
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Header with Search */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">Catálogo de Produtos</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Explore nossa coleção completa de brindes corporativos
              </p>
            </div>

            {/* Smart Search with Autocomplete & History */}
            <SmartSearchInput
              placeholder="Buscar produtos, categorias, fornecedores..."
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
              className="w-full lg:w-96"
            />
              </div>
            </div>

          {/* Recently Viewed Bar */}
          <RecentlyViewedBar maxVisible={6} className="mb-2" />

          {/* Quick Filters + Stats - All in one line */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Filters */}
            {quickFilters.map((filter) => (
              <Button
                key={filter.id}
                variant={activeQuickFilterId === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickFilter(filter)}
                className={cn(
                  "h-8 gap-1.5 text-xs font-semibold tracking-wide",
                  activeQuickFilterId === filter.id && "bg-primary text-primary-foreground"
                )}
              >
                {filter.icon}
                {filter.label}
              </Button>
            ))}

            {/* Separator */}
            <div className="h-6 w-px bg-border/50 mx-1" />

            {/* Stat Badges */}
            {statBadges.map((stat) => (
              <div
                key={stat.id}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/50 bg-card text-xs font-semibold tracking-wide"
              >
                <span className="text-orange">{stat.icon}</span>
                <span className="font-bold text-foreground">{stat.value}</span>
                <span className="text-foreground/70">{stat.label}</span>
              </div>
            ))}

            {/* Separator */}
            <div className="h-6 w-px bg-border/50 mx-1" />

            {/* Client Filter Button */}
            <div
              onClick={() => setClientModalOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/50 bg-card text-xs font-semibold tracking-wide cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <span className="text-orange"><User className="h-4 w-4" /></span>
              <span className="text-foreground/70">Filtrar por Cliente</span>
            </div>

            {/* Mobile category toggle */}
            {!isDesktop && (
              <Sheet>
                <SheetTrigger asChild>
                  <div className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/50 bg-card text-xs font-semibold tracking-wide cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-orange"><Layers className="h-4 w-4" /></span>
                    <span className="text-foreground/70">Categorias</span>
                  </div>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <CategorySidebarPanel
                    selectedCategoryId={selectedExternalCategory?.id}
                    onSelectCategory={handleExternalCategorySelect}
                    className="h-full border-none"
                  />
                </SheetContent>
              </Sheet>
            )}
          </div>

        {/* Client Filter Section */}
        {selectedClient && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Filtrando para:</p>
                    <p className="text-sm text-muted-foreground">{selectedClient.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <div className="flex gap-1">
                      {[selectedClient.primaryColor, ...selectedClient.secondaryColors].map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* External Category Filter Badge */}
        {selectedExternalCategory && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">
                    Categoria: <strong>{selectedExternalCategory.name}</strong>
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedExternalCategory(null)}
                  className="h-7 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Main Content */}
        <div className="space-y-6">
          <div className="space-y-4">
            {/* Filters and controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter button */}
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

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-44">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="price-asc">Menor Preço</SelectItem>
                    <SelectItem value="price-desc">Maior Preço</SelectItem>
                    <SelectItem value="stock">Maior Estoque</SelectItem>
                    <SelectItem value="newest">Novidades</SelectItem>
                    {selectedClient && <SelectItem value="color-match">Cores Compatíveis</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", viewMode === "grid" && "bg-card shadow-sm")}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", viewMode === "list" && "bg-card shadow-sm")}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
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
              {isLoading ? (
                viewMode === "grid" ? (
                  <ProductGridSkeleton count={8} />
                ) : (
                  <ProductListSkeleton count={6} />
                )
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
                  highlightColors={clientColorGroups}
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
                  highlightColors={clientColorGroups}
                />
              )}

              {/* Infinite scroll trigger - elemento observado */}
              {!isLoading && hasMoreProducts && (
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
              {!isLoading && !hasMoreProducts && filteredProducts.length > ITEMS_PER_PAGE && (
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
        </div>
      </div>

      {/* Client Filter Modal */}
      <ClientFilterModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        onSelectClient={setSelectedClient}
        selectedClientId={selectedClient?.id}
      />

      {/* Floating Compare Bar */}
      <FloatingCompareBar />
    </MainLayout>
  );
}


