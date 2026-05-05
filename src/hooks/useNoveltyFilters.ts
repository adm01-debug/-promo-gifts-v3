import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { NoveltyWithDetails } from "./useNovelties";
import { getDefaultColumns } from "@/components/products/ColumnSelector";

export type ViewMode = "grid" | "list" | "table";
export type SortMode = "name" | "price-asc" | "price-desc" | "newest" | "stock" | "best-seller-supplier" | "best-seller-promo";

export interface NoveltyFiltersState {
  viewMode: ViewMode;
  sortMode: SortMode;
  selectedSupplier: string;
  selectedCategory: string;
  selectedStatus: string;
  maxDays: string;
  searchQuery: string;
  currentPage: number;
  gridColumns: number;
}

export function useNoveltyFilters(allProducts: NoveltyWithDetails[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get("view") as ViewMode) || "grid");
  const [gridColumns, setGridColumns] = useState<number>(Number(searchParams.get("cols")) || getDefaultColumns());
  const [sortMode, setSortMode] = useState<SortMode>((searchParams.get("sort") as SortMode) || "newest");
  const [selectedSupplier, setSelectedSupplier] = useState<string>(searchParams.get("supplier") || "all");
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get("status") || "all");
  const [maxDays, setMaxDays] = useState<string>(searchParams.get("expires") || "all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const itemsPerPage = 20;

  // Sync state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (viewMode !== "grid") params.view = viewMode;
    if (gridColumns !== getDefaultColumns()) params.cols = String(gridColumns);
    if (sortMode !== "newest") params.sort = sortMode;
    if (selectedSupplier !== "all") params.supplier = selectedSupplier;
    if (selectedCategory !== "all") params.category = selectedCategory;
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (maxDays !== "all") params.expires = maxDays;
    if (searchQuery.trim()) params.q = searchQuery;
    if (currentPage !== 1) params.page = String(currentPage);

    setSearchParams(params, { replace: true });
  }, [viewMode, gridColumns, sortMode, selectedSupplier, selectedCategory, selectedStatus, searchQuery, currentPage, setSearchParams]);

  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.product_name.toLowerCase().includes(q) || 
        (p.product_sku && p.product_sku.toLowerCase().includes(q)) || 
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
      );
    }

    if (selectedSupplier !== "all") filtered = filtered.filter(p => p.supplier_id === selectedSupplier);
    if (selectedCategory !== "all") filtered = filtered.filter(p => p.category_id === selectedCategory);

    filtered.sort((a, b) => {
      switch (sortMode) {
        case "name": return (a.product_name || "").localeCompare(b.product_name || "", 'pt-BR');
        case "price-asc": return (a.base_price || 0) - (b.base_price || 0);
        case "price-desc": return (b.base_price || 0) - (a.base_price || 0);
        case "newest": return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
        case "stock": return (b.stock_quantity || 0) - (a.stock_quantity || 0);
        case "best-seller-supplier": return (b.stock_quantity || 0) - (a.stock_quantity || 0);
        case "best-seller-promo": return (a.stock_quantity || 0) - (b.stock_quantity || 0);
        default: return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
    });

    return filtered;
  }, [allProducts, selectedSupplier, selectedCategory, sortMode, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  // Reset pagination when filters change
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [selectedSupplier, selectedCategory, selectedStatus, searchQuery, sortMode, maxDays]);

  // Normalizar página se ela for maior que o total
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const clearFilters = useCallback(() => {
    setSelectedSupplier("all");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setMaxDays("all");
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = 
    selectedSupplier !== "all" || 
    selectedCategory !== "all" || 
    selectedStatus !== "all" || 
    maxDays !== "all" || 
    searchQuery.trim() !== "";

  return {
    state: {
      viewMode,
      sortMode,
      selectedSupplier,
      selectedCategory,
      selectedStatus,
      maxDays,
      searchQuery,
      currentPage,
      gridColumns,
    },
    actions: {
      setViewMode,
      setSortMode,
      setSelectedSupplier,
      setSelectedCategory,
      setSelectedStatus,
      setMaxDays,
      setSearchQuery,
      setCurrentPage,
      setGridColumns,
      clearFilters,
    },
    filteredProducts,
    paginatedProducts,
    totalPages,
    hasActiveFilters,
    itemsPerPage,
  };
}
