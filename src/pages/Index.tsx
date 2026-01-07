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
import { ExpertChatButton } from "@/components/expert/ExpertChatButton";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductListSkeleton } from "@/components/products/ProductListItemSkeleton";
import { FilterPanel, FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { QuickFiltersBar, QuickFilter } from "@/components/filters/QuickFiltersBar";
import { ClientFilterModal } from "@/components/clients/ClientFilterModal";
import { SearchWithSuggestions } from "@/components/search";
import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRODUCTS, CATEGORIES, SUPPLIERS, type Product, type Client } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import { useComparisonContext } from "@/contexts/ComparisonContext";

type ViewMode = "grid" | "list";
type SortOption = "name" | "price-asc" | "price-desc" | "stock" | "newest" | "color-match";

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavoritesContext();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonContext();
  const { suggestions, quickSuggestions, history, addToHistory } = useSearch();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuickFilterId, setActiveQuickFilterId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const ITEMS_PER_PAGE = 12;

  // Simular carregamento inicial
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

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
    if (filters.nichos.length) count += filters.nichos.length;
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

  // Calculate color match score for a product
  const getColorMatchScore = (product: Product): number => {
    if (!selectedClient) return 0;
    const clientColors = [selectedClient.primaryColor.group, ...selectedClient.secondaryColors.map((c) => c.group)];
    const matchCount = product.colors.filter((c) => clientColors.includes(c.group)).length;
    return matchCount;
  };

  // Filtrar e ordenar produtos
  const filteredProducts = useMemo(() => {
    let result = [...PRODUCTS];

    // Text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.name.toLowerCase().includes(query) ||
          p.materials.some((m) => m.toLowerCase().includes(query)) ||
          p.tags.datasComemorativas.some((d) => d.toLowerCase().includes(query)) ||
          p.tags.publicoAlvo.some((pa) => pa.toLowerCase().includes(query)),
      );
    }

    // Aplicar filtros
    if (filters.colors.length) {
      result = result.filter((p) => p.colors.some((c) => filters.colors.includes(c.name)));
    }

    if (filters.categories.length) {
      result = result.filter((p) => filters.categories.includes(p.category.id));
    }

    if (filters.suppliers.length) {
      result = result.filter((p) => filters.suppliers.includes(p.supplier.id));
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) {
      result = result.filter((p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]);
    }

    if (filters.inStock) {
      result = result.filter((p) => p.stockStatus !== "out-of-stock");
    }

    if (filters.isKit) {
      result = result.filter((p) => p.isKit);
    }

    if (filters.featured) {
      result = result.filter((p) => p.featured);
    }

    if (filters.materiais.length) {
      result = result.filter((p) => p.materials.some((m) => filters.materiais.includes(m)));
    }

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
        result.sort((a, b) => b.stock - a.stock);
        break;
      case "newest":
        result.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
        break;
      case "color-match":
        result.sort((a, b) => getColorMatchScore(b) - getColorMatchScore(a));
        break;
    }

    return result;
  }, [filters, sortBy, selectedClient, searchQuery]);

  // Paginated products
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);

  // Has more products to load
  const hasMoreProducts = useMemo(() => {
    return paginatedProducts.length < filteredProducts.length;
  }, [paginatedProducts, filteredProducts]);

  // Infinite scroll with Intersection Observer - using refs to avoid dependency cycles
  // Infinite scroll with Intersection Observer - using refs to avoid dependency cycles
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false); // Single ref to track loading state
  const hasMoreRef = useRef(hasMoreProducts); // Ref for hasMoreProducts
  const lastLoadTimeRef = useRef(0); // Debounce ref to prevent rapid firing

  // Keep refs in sync with state
  useEffect(() => {
    loadingRef.current = isLoading || isLoadingMore;
  }, [isLoading, isLoadingMore]);

  useEffect(() => {
    hasMoreRef.current = hasMoreProducts;
  }, [hasMoreProducts]);

  const loadMore = useCallback(() => {
    // Debounce: prevent loading more than once per 500ms
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 500) {
      return;
    }
    
    // Additional check using refs
    if (loadingRef.current || !hasMoreRef.current) {
      return;
    }
    
    lastLoadTimeRef.current = now;
    setIsLoadingMore(true);
    
    // Use requestAnimationFrame for smoother UI updates
    requestAnimationFrame(() => {
      setTimeout(() => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
      }, 300);
    });
  }, []); // Empty array: function never changes

  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Use refs to check state without triggering re-renders
        if (entry.isIntersecting && !loadingRef.current && hasMoreRef.current) {
          loadMore();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: "200px" 
      },
    );

    observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [loadMore]); // Only loadMore as dependency - it's stable

  // Quick filters
  const quickFilters: QuickFilter[] = useMemo(
    () => [
      {
        id: "all",
        label: "Todos",
        icon: <Layers className="h-4 w-4" />,
        filter: {},
      },
      {
        id: "featured",
        label: "Destaques",
        icon: <Sparkles className="h-4 w-4" />,
        filter: { featured: true },
      },
      {
        id: "new",
        label: "Novidades",
        icon: <TrendingUp className="h-4 w-4" />,
        filter: { newArrival: true },
      },
      {
        id: "kits",
        label: "Kits",
        icon: <Package className="h-4 w-4" />,
        filter: { isKit: true },
      },
    ],
    [],
  );

  // Stats
  const stats = useMemo(
    () => [
      {
        label: "Total de Produtos",
        value: filteredProducts.length,
        icon: <Package className="h-4 w-4" />,
      },
      {
        label: "Categorias",
        value: CATEGORIES.length,
        icon: <Layers className="h-4 w-4" />,
      },
      {
        label: "Fornecedores",
        value: SUPPLIERS.length,
        icon: <Users className="h-4 w-4" />,
      },
      {
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

  const handleViewProduct = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  const handleShareProduct = (productId: string) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const shareUrl = `${window.location.origin}/produto/${productId}`;
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

  const handleFavoriteProduct = (productId: string) => {
    toggleFavorite(productId);
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
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Search */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">Catálogo de Produtos</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Explore nossa coleção completa de brindes corporativos
              </p>
            </div>

            {/* Search with Suggestions */}
            <SearchWithSuggestions
              placeholder="Buscar produtos, categorias..."
              onSearch={handleSearch}
              suggestions={suggestions.map((s) => s.label)}
              recentSearches={history}
              isLoading={isSearching}
              enableVoice
              className="w-full lg:w-80"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="card-interactive">
                <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary">{stat.icon}</div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold truncate">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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

        {/* Quick Filters and Client Selector */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <QuickFiltersBar
              filters={quickFilters}
              activeFilterId={activeQuickFilterId}
              onFilterClick={handleQuickFilter}
            />
          </div>
          <Button variant="outline" onClick={() => setClientModalOpen(true)} className="lg:w-auto">
            <User className="h-4 w-4 mr-2" />
            {selectedClient ? "Trocar Cliente" : "Filtrar por Cliente"}
          </Button>
        </div>

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

            {/* Product grid or list */}
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

            {/* Infinite scroll trigger */}
            {!isLoading && hasMoreProducts && (
              <div ref={loadMoreRef} className="flex flex-col items-center gap-3 pt-8 pb-4">
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

      {/* Client Filter Modal */}
      <ClientFilterModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        onSelectClient={setSelectedClient}
        selectedClientId={selectedClient?.id}
      />

      {/* Expert Chat Button */}
      <ExpertChatButton clientId={selectedClient?.id} clientName={selectedClient?.name} />
    </MainLayout>
  );
}

