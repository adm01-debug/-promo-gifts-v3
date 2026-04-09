/**
 * useCatalogState — all catalog page state & logic extracted from Index.tsx
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useColorEnrichment } from "@/hooks/useColorEnrichment";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, Heart, Users, Layers, Palette, FolderTree } from "lucide-react";
import React from "react";

import { defaultFilters, type FilterState } from "@/components/filters/FilterPanel";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { useProductsCatalog } from "@/hooks/useProductsLightweight";
import type { Product } from "@/hooks/useProducts";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useSearch } from "@/hooks/useSearch";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useProductsByMaterial } from "@/hooks/useProductsByMaterial";
import { useProductFuzzySearch } from "@/hooks/useProductFuzzySearch";
import { useProductsByCategory } from "@/hooks/useProductsByCategory";
import { useDebounce } from "@/hooks/useDebounce";
import { useExternalCategoriesQuery } from "@/hooks/useExternalCategoriesQuery";
import { useCatalogRealStats } from "@/hooks/useCatalogRealStats";
import { useToast } from "@/hooks/use-toast";

export type ViewMode = "grid" | "list" | "table";
export type SortOption = "name" | "price-asc" | "price-desc" | "stock" | "newest" | "color-match";

const VIEW_MODE_KEY = "catalog-view-mode";

function getPersistedViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === "grid" || saved === "list" || saved === "table") return saved;
  } catch {}
  return "grid";
}

const ITEMS_PER_PAGE = 12;

export function useCatalogState() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavoritesStore();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonStore();
  const { registerProducts } = useProductsContext();

  const searchQueryFromUrl = searchParams.get("search") || "";

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [viewMode, setViewModeState] = useState<ViewMode>(getPersistedViewMode);
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch {}
  }, []);
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) setSelectedCount(0);
      return !prev;
    });
  }, []);

  // Responsive clamp: force appropriate columns on small screens
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640 && gridColumns > 1) {
        setGridColumns(1);
      } else if (w >= 640 && w < 768 && gridColumns > 2) {
        setGridColumns(2);
      }
    };
    handleResize(); // run on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gridColumns]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchQueryFromUrl);
  const [isSearching, setIsSearching] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Debounce for server-side search
  const debouncedServerSearch = useDebounce(searchQuery, 400);

  // Fetch products from DB
  const {
    data: catalogData,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useProductsCatalog(debouncedServerSearch ? { search: debouncedServerSearch } : undefined);

  const realProducts = useMemo(() => {
    if (!catalogData?.pages) return [] as Product[];
    return catalogData.pages.flatMap(page => page.products);
  }, [catalogData]);

  const totalEstimate = catalogData?.pages?.[0]?.totalEstimate ?? null;

  // Auto-fetch all server pages in background so full catalog is available
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (realProducts.length > 0) registerProducts(realProducts);
  }, [realProducts, registerProducts]);

  const { suggestions, quickSuggestions, history, addToHistory } = useSearch(realProducts);

  // Material filter hook
  const { productIds: materialFilteredProductIds, hasFilter: hasMaterialFilter, isLoading: isLoadingMaterialFilter } = useProductsByMaterial({
    materialGroupSlugs: filters.materialGroups || [],
    materialTypeSlugs: filters.materialTypes || [],
  });

  // Category filter hook
  const { productIds: categoryFilteredProductIds, hasFilter: hasCategoryFilter, isLoading: isLoadingCategoryFilter } = useProductsByCategory({
    categoryIds: filters.categories?.map(String) || [],
    includeDescendants: true,
  });

  const { data: externalCategories = [] } = useExternalCategoriesQuery();
  const { data: realStats } = useCatalogRealStats();

  const isLoading = isLoadingProducts || isLoadingMaterialFilter || isLoadingCategoryFilter;
  const isInitialCatalogLoad = (isLoadingProducts || isFetchingProducts) && realProducts.length === 0;

  // Sync search with URL
  useEffect(() => {
    setSearchQuery(searchQueryFromUrl);
  }, [searchQueryFromUrl]);

  // Reset pagination on filter change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filters, sortBy, searchQuery]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.colors.length) count += filters.colors.length;
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
    if (filters.materialGroups?.length) count += filters.materialGroups.length;
    if (filters.materialTypes?.length) count += filters.materialTypes.length;
    if (filters.materiais.length) count += filters.materiais.length;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) count += 1;
    if (filters.inStock) count += 1;
    if (filters.isKit) count += 1;
    if (filters.featured) count += 1;
    if (filters.gender?.length) count += filters.gender.length;
    return count;
  }, [filters]);

  // Debounced search for fuzzy
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const { results: fuzzySearchResults, hasSearch: hasFuzzySearch } = useProductFuzzySearch(realProducts, debouncedSearchQuery);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let result = hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts];

    if (hasCategoryFilter && categoryFilteredProductIds.size > 0) {
      result = result.filter((p) => categoryFilteredProductIds.has(p.id));
    } else if (hasCategoryFilter && categoryFilteredProductIds.size === 0 && !isLoadingCategoryFilter) {
      result = [];
    }

    if (filters.colors.length) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => filters.colors.includes(c.name)) || false
      );
    }

    if (filters.colorGroups?.length) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => {
          const colorGroupSlug = c.groupSlug || '';
          const colorGroup = (c.group || '').toLowerCase().trim();
          const colorName = (c.name || '').toLowerCase().trim();
          return filters.colorGroups.some(slug => {
            const slugLower = slug.toLowerCase().trim();
            if (colorGroupSlug === slugLower) return true;
            if (colorGroup === slugLower) return true;
            if (colorGroup.includes(slugLower) || slugLower.includes(colorGroup)) return true;
            if (colorName.includes(slugLower) || slugLower.includes(colorName.split(/[\s-]/)[0])) return true;
            return false;
          });
        }) || false
      );
    }

    if (filters.colorVariations?.length) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => {
          const colorVariationSlug = c.variationSlug || '';
          const colorName = (c.name || '').toLowerCase().trim();
          return filters.colorVariations.some(slug => {
            const slugLower = slug.toLowerCase().trim();
            if (colorVariationSlug === slugLower) return true;
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

    // Gender filter
    if (filters.gender?.length) {
      const genderFilter = filters.gender;
      result = result.filter((p) => {
        const productGender = (p.gender || '').toLowerCase().trim();
        if (!productGender) return false;
        return genderFilter.some(g => productGender === g.toLowerCase());
      });
    }

    if (hasMaterialFilter && materialFilteredProductIds.size > 0) {
      result = result.filter((p) => materialFilteredProductIds.has(p.id));
    } else if (hasMaterialFilter && materialFilteredProductIds.size === 0 && !isLoadingMaterialFilter) {
      result = [];
    }

    if (!hasMaterialFilter && filters.materiais.length) {
      result = result.filter((p) => {
        const materialsStr = Array.isArray(p.materials) ? p.materials.join(' ').toLowerCase() : (p.materials || '').toLowerCase();
        return filters.materiais.some((m) => materialsStr.includes(m.toLowerCase()));
      });
    }

    // ⚠️ REGRA DE NEGÓCIO — NÃO ALTERAR
    // Quando há busca ativa e o sort é "Nome A-Z" (padrão), a reordenação
    // alfabética é PULADA para preservar a ordem de relevância calculada pelo
    // motor rankProductSearchResults (product-search.ts). A hierarquia é:
    //   1. SKU/Referência exata
    //   2. Nome exato
    //   3. Nome começa com o termo
    //   4. Palavra exata no nome (word boundary)
    //   5. Nome contém o termo
    //   6. Código começa com / contém
    //   7. Metadados (marca, categoria, descrição)
    //   8. Fuzzy (Fuse.js, threshold < 0.45)
    // Se o usuário escolher outro sort (preço, estoque, etc.), reordena normalmente.
    const skipSort = hasFuzzySearch && sortBy === 'name';
    if (!skipSort) {
      switch (sortBy) {
        case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
        case "price-asc": result.sort((a, b) => a.price - b.price); break;
        case "price-desc": result.sort((a, b) => b.price - a.price); break;
        case "stock": result.sort((a, b) => (b.stock || 0) - (a.stock || 0)); break;
        case "newest": result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); break;
      }
    }

    return result;
  }, [filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter]);

  // Paginated products
  const paginatedProducts = useMemo(() => filteredProducts.slice(0, displayCount), [filteredProducts, displayCount]);

  const shouldShowCatalogSkeleton = isInitialCatalogLoad || (isLoading && paginatedProducts.length === 0);
  const hasActiveCatalogConstraints = activeFiltersCount > 0 || searchQuery.trim().length > 0;
  const shouldShowEmptyState = !shouldShowCatalogSkeleton && paginatedProducts.length === 0;

  const hasMoreProducts = useMemo(() => {
    return paginatedProducts.length < filteredProducts.length || !!hasNextPage;
  }, [paginatedProducts, filteredProducts, hasNextPage]);

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (isUpdatingRef.current) return;
    if (isLoading || isLoadingMore || isFetchingNextPage) return;
    if (!hasMoreProducts) return;

    isUpdatingRef.current = true;
    setIsLoadingMore(true);

    const nextDisplayCount = displayCount + ITEMS_PER_PAGE;
    const needsServerData = nextDisplayCount >= filteredProducts.length && hasNextPage;

    if (needsServerData) {
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

  useEffect(() => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreProducts && !isLoadingMore && !isUpdatingRef.current) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => { observerRef.current?.disconnect(); };
  }, [isLoading, hasMoreProducts, isLoadingMore, loadMore]);

  // Stats — contextual to filtered products
  const statBadges = useMemo(() => {
    const hasActiveFilters = activeFiltersCount > 0 || searchQuery.trim().length > 0;
    const isFullCatalogLoaded = !hasNextPage;

    // BUG-004/EDGE-004: deduplicate products by ID
    const seen = new Set<string>();
    const deduped = filteredProducts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // "Produtos Únicos" — use totalEstimate (from countMode:exact on first catalog page)
    const productCount = hasActiveFilters
      ? deduped.length
      : (totalEstimate || deduped.length);

    // Variações: use real DB count when unfiltered, fallback to local count
    const localVariants = deduped.reduce((sum, p) => {
      const colorCount = p.colors?.filter((c: Record<string, string>) => c.name?.trim()).length || 0;
      const variationCount = !colorCount && p.variations?.length ? p.variations.length : 0;
      return sum + colorCount + variationCount;
    }, 0);
    const totalVariants = hasActiveFilters
      ? localVariants
      : (realStats?.totalVariants ?? localVariants);

    // Categorias: use real DB count when unfiltered
    const uniqueCategoryIds = new Set(
      deduped
        .map((p) => p.category_id || (p.category?.id ? String(p.category.id) : ""))
        .filter((id) => id && id !== "0")
    );
    const categoriesCount = hasActiveFilters
      ? uniqueCategoryIds.size
      : (realStats?.totalCategories ?? uniqueCategoryIds.size);

    // Fornecedores: use real DB count when unfiltered
    const uniqueSuppliers = new Set(
      deduped
        .map((p) => p.supplier?.name?.trim().toLowerCase())
        .filter((n): n is string => !!n && n !== "sem fornecedor")
    );
    const suppliersCount = hasActiveFilters
      ? uniqueSuppliers.size
      : (realStats?.totalSuppliers ?? uniqueSuppliers.size);

    // BUG-002: contextual favorite count — intersection with filtered products
    const contextualFavoriteCount = isFavorite
      ? deduped.filter((p) => isFavorite(p.id)).length
      : favoriteCount;

    return [
      { id: "products", label: "Produtos Únicos", value: productCount, icon: React.createElement(Package, { className: "h-4 w-4" }) },
      { id: "variants", label: "Variações", value: totalVariants, icon: React.createElement(Palette, { className: "h-4 w-4" }) },
      { id: "categories", label: "Categorias", value: categoriesCount, icon: React.createElement(FolderTree, { className: "h-4 w-4" }) },
      { id: "suppliers", label: "Fornecedores", value: suppliersCount, icon: React.createElement(Users, { className: "h-4 w-4" }) },
      { id: "favorites", label: "Favoritos", value: contextualFavoriteCount, icon: React.createElement(Heart, { className: "h-4 w-4" }) },
    ];
  }, [filteredProducts, favoriteCount, isFavorite, activeFiltersCount, searchQuery, totalEstimate, hasNextPage, realStats]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSortBy("name");
    setSearchQuery("");
    navigate("/", { replace: true });
  }, [navigate]);

  const handleViewProduct = useCallback((product: Product) => {
    navigate(`/produto/${product.id}`);
  }, [navigate]);

  // Share opens the WhatsApp dialog instead of clipboard/native share
  const [shareProduct, setShareProduct] = useState<Product | null>(null);

  const handleShareProduct = useCallback((product: Product) => {
    setShareProduct(product);
  }, []);

  const handleFavoriteProduct = useCallback((product: Product) => {
    toggleFavorite(product.id);
  }, [toggleFavorite]);

  const handleSearch = useCallback((query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    if (query) addToHistory(query);
    setTimeout(() => setIsSearching(false), 300);
  }, [addToHistory]);

  return {
    // State
    filters, setFilters,
    viewMode, setViewMode,
    gridColumns, setGridColumns,
    selectionMode, toggleSelectionMode, selectedCount, setSelectedCount,
    sortBy, setSortBy,
    filterSheetOpen, setFilterSheetOpen,
    searchQuery,

    // Derived
    filteredProducts,
    paginatedProducts,
    activeFiltersCount,
    shouldShowCatalogSkeleton,
    shouldShowEmptyState,
    hasActiveCatalogConstraints,
    hasMoreProducts,
    isLoadingMore,
    totalEstimate,
    hasNextPage,
    statBadges,

    // Refs
    loadMoreRef,

    // Handlers
    loadMore,
    resetFilters,
    handleViewProduct,
    handleShareProduct,
    shareProduct, setShareProduct,
    handleFavoriteProduct,
    handleSearch,

    // Context values
    isFavorite,
    toggleFavorite,
    isInCompare,
    toggleCompare,
    canAddMore,
    navigate,

    ITEMS_PER_PAGE,
  };
}
