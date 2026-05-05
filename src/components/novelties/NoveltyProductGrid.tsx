import { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { useNoveltyFilters, type SortMode, type ViewMode } from "@/hooks/useNoveltyFilters";

const log = createClientLogger("novelties.grid");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ArrowUpDown, Building2, FolderTree, X, Sparkles, Search, CheckSquare, Loader2, SlidersHorizontal, Download, Share2 } from "lucide-react";
import { useNoveltiesWithDetails } from "@/hooks/useNovelties";
import { useNoveltiesSelectionMode } from "@/hooks/useNoveltiesSelectionMode";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { BulkActionBar } from "@/components/products/BulkActionBar";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import { BulkAddToCartModal } from "@/components/catalog/BulkAddToCartModal";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductListItem } from "@/components/products/ProductListItem";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { NoveltyGridCard, NoveltyTableView } from "./NoveltyCards";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { NOVELTY_STATUS_CONFIG } from "@/hooks/useNovelties";
import { exportNoveltiesToCsv, shareNoveltiesOnWhatsApp } from "@/utils/noveltiesExport";

type ViewMode = "grid" | "list" | "table";
type SortMode = "name" | "price-asc" | "price-desc" | "newest" | "stock" | "best-seller-supplier" | "best-seller-promo";

function getGridColsClass(cols: ColumnCount): string {
  switch (cols) {
    case 3: return "grid-cols-2 sm:grid-cols-3";
    case 4: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    case 5: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
    case 6: return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
    case 8: return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
    default: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }
}

function getGridGapClass(cols: ColumnCount): string {
  if (cols >= 8) return "gap-x-4 gap-y-8";
  if (cols >= 6) return "gap-x-6 gap-y-8";
  return "gap-x-8 gap-y-8";
}

export const NoveltyProductGrid = memo(function NoveltyProductGrid({ 
  onFilteredChange 
}: { 
  onFilteredChange?: (products: any[], isLoading: boolean) => void 
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [gridColumns, setGridColumns] = useState<ColumnCount>(Number(searchParams.get("cols")) as ColumnCount || getDefaultColumns);
  const [selectionMode, setSelectionMode] = useState(false);

  const { data: novelties, isLoading, isFetching, error } = useNoveltiesWithDetails({ 
    limit: 200,
    status: searchParams.get("status") !== "all" ? (searchParams.get("status") as any) : undefined,
    maxDays: searchParams.get("expires") !== "all" ? Number(searchParams.get("expires")) : undefined
  });
  
  const isGlobalLoading = isLoading || isFetching;
  const products = novelties || [];

  const { 
    state, 
    actions, 
    filteredProducts, 
    paginatedProducts, 
    totalPages, 
    hasActiveFilters,
    itemsPerPage
  } = useNoveltyFilters(products);

  const {
    viewMode, sortMode, selectedSupplier, selectedCategory, selectedStatus, maxDays, searchQuery, currentPage
  } = state;

  const {
    setViewMode, setSortMode, setSelectedSupplier, setSelectedCategory, setSelectedStatus, setMaxDays, setSearchQuery, setCurrentPage, clearFilters
  } = actions;

  const [loadingProgress, setLoadingProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      progressRef.current = setInterval(() => {
        setLoadingProgress(prev => { if (prev >= 90) { clearInterval(progressRef.current!); return prev; } return prev + Math.random() * 12 + 3; });
      }, 300);
    } else {
      if (progressRef.current) clearInterval(progressRef.current);
      setLoadingProgress(100);
      const t = setTimeout(() => setLoadingProgress(0), 800);
      return () => clearTimeout(t);
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [isLoading]);

  const { suppliers, categories } = useMemo(() => {
    const supMap = new Map<string, { id: string; name: string; count: number }>();
    const catMap = new Map<string, { id: string; name: string; count: number }>();
    products.forEach(p => {
      if (p.supplier_id && p.supplier_name) { const e = supMap.get(p.supplier_id); if (e) e.count++; else supMap.set(p.supplier_id, { id: p.supplier_id, name: p.supplier_name, count: 1 }); }
      if (p.category_id && p.category_name) { const e = catMap.get(p.category_id); if (e) e.count++; else catMap.set(p.category_id, { id: p.category_id, name: p.category_name, count: 1 }); }
    });
    return { suppliers: [...supMap.values()].sort((a, b) => b.count - a.count), categories: [...catMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => p.product_name.toLowerCase().includes(q) || (p.product_sku && p.product_sku.toLowerCase().includes(q)) || (p.supplier_name && p.supplier_name.toLowerCase().includes(q)));
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
        case "best-seller-supplier": 
          return (b.stock_quantity || 0) - (a.stock_quantity || 0);
        case "best-seller-promo":
          return (a.stock_quantity || 0) - (b.stock_quantity || 0);
        default: return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
    });
    return filtered;
  }, [products, selectedSupplier, selectedCategory, sortMode, searchQuery, selectedStatus, maxDays]);

  // Notifica o pai sobre mudanças nos filtros/produtos
  useEffect(() => {
    onFilteredChange?.(filteredProducts, isGlobalLoading);
  }, [filteredProducts, isGlobalLoading, onFilteredChange]);

  // Reset pagination when filters change
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [selectedSupplier, selectedCategory, selectedStatus, searchQuery, sortMode, maxDays]);

  // Sync state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (viewMode !== "grid") params.view = viewMode;
    if (gridColumns !== getDefaultColumns) params.cols = String(gridColumns);
    if (sortMode !== "newest") params.sort = sortMode;
    if (selectedSupplier !== "all") params.supplier = selectedSupplier;
    if (selectedCategory !== "all") params.category = selectedCategory;
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (maxDays !== "all") params.expires = maxDays;
    if (searchQuery.trim()) params.q = searchQuery;
    if (currentPage !== 1) params.page = String(currentPage);

    setSearchParams(params, { replace: true });
  }, [viewMode, gridColumns, sortMode, selectedSupplier, selectedCategory, selectedStatus, searchQuery, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  // Normalizar página se ela for maior que o total (página inexistente)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0 && !isLoading) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, isLoading]);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const sel = useNoveltiesSelectionMode({ selectionMode, filteredProducts: paginatedProducts });
  const hasActiveFilters = selectedSupplier !== "all" || selectedCategory !== "all" || selectedStatus !== "all" || maxDays !== "all" || searchQuery.trim() !== "";
  const handleProductClick = (id: string) => {
    log.info("product_click", { id });
    navigate(`/produto/${id}`);
  };
  const clearFilters = () => { 
    log.info("filters_clear");
    setSelectedSupplier("all"); 
    setSelectedCategory("all"); 
    setSelectedStatus("all");
    setMaxDays("all");
    setSearchQuery(""); 
  };
  if (error) console.error('Erro ao carregar novidades:', error);

  // Favorites & Compare stores for ProductListItem integration
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, addToCompare, removeFromCompare, canAdd: canAddToCompare } = useComparisonStore();
  const onToggleCompare = useCallback((productId: string) => {
    if (isInCompare(productId)) { removeFromCompare(productId); return { added: false, isFull: false }; }
    const result = addToCompare(productId);
    return { added: !!result, isFull: !canAddToCompare };
  }, [isInCompare, addToCompare, removeFromCompare, canAddToCompare]);

  // Convert novelties to Product for list view
  const productMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof sel.noveltyToProduct>>();
    filteredProducts.forEach(n => map.set(n.product_id, sel.noveltyToProduct(n)));
    return map;
  }, [filteredProducts, sel]);

  const renderContent = () => {
    if (isLoading && products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-sm text-muted-foreground">Carregando {Math.round(loadingProgress)}% dos produtos...</span></div>
          <div className="w-64 h-1.5 bg-muted/50 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${loadingProgress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} /></div>
        </div>
      );
    }
    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-muted/80 mb-3"><Package className="h-7 w-7 text-muted-foreground/40" /></div>
          <p className="text-muted-foreground font-medium text-sm">{hasActiveFilters ? "Nenhuma novidade com esses filtros" : "Nenhuma novidade encontrada"}</p>
          {hasActiveFilters ? <Button variant="link-primary" className="mt-1 text-xs" onClick={clearFilters}>Limpar filtros</Button> : <p className="text-xs text-muted-foreground/70 mt-1">Produtos novos aparecerão aqui automaticamente</p>}
        </div>
      );
    }
    if (viewMode === "table") return <NoveltyTableView products={paginatedProducts} onProductClick={handleProductClick} selectionMode={selectionMode} selectedIds={sel.selectedIds} onToggleSelect={sel.toggleSelect} />;
    const effectiveCols = Math.min(gridColumns, paginatedProducts.length) as ColumnCount;

    if (viewMode === "list") {
      return (
        <div className="space-y-2">
          {paginatedProducts.map((novelty, index) => {
            const prod = productMap.get(novelty.product_id);
            if (!prod) return null;
            const isSelected = sel.selectedIds.has(novelty.product_id);
            return (
              <div key={novelty.novelty_id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}>
                <div className={cn("flex items-center gap-1", isSelected && "ring-2 ring-primary rounded-xl")}>
                  {selectionMode && (
                    <div className="flex-shrink-0 ml-1">
                      <SelectionCheckbox checked={isSelected} onChange={() => sel.toggleSelect(novelty.product_id)} size="md" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <ProductListItem
                      product={prod}
                      onClick={() => selectionMode ? sel.toggleSelect(novelty.product_id) : handleProductClick(novelty.product_id)}
                      isFavorited={isFavorite(novelty.product_id)}
                      onToggleFavorite={toggleFavorite}
                      isInCompare={isInCompare(novelty.product_id)}
                      onToggleCompare={onToggleCompare}
                      canAddToCompare={canAddToCompare}
                      isNovelty={true}
                      noveltyDaysRemaining={novelty.days_remaining}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={`grid ${getGridColsClass(effectiveCols)} ${getGridGapClass(effectiveCols)}`}>
        {paginatedProducts.map((product, index) => (
          <div key={product.novelty_id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}>
            <NoveltyGridCard product={product} onClick={() => handleProductClick(product.product_id)} selectionMode={selectionMode} isSelected={sel.selectedIds.has(product.product_id)} onToggleSelect={() => sel.toggleSelect(product.product_id)} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3" data-testid="novelty-module">
      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="h-4 w-4 text-success shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold whitespace-nowrap" data-testid="page-title-novidades">Novidades</h1>
            <Badge variant="secondary" className="text-[10px] tabular-nums px-1.5 shrink-0">
              {isLoading && products.length === 0 ? <span className="flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />carregando...</span> : <>{filteredProducts.length}{hasActiveFilters && <span className="text-muted-foreground">/{products.length}</span>}</>}
            </Badge>
            <AnimatePresence>
              {isLoading && loadingProgress > 0 && loadingProgress < 100 && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 48 }} exit={{ opacity: 0, width: 0 }} className="inline-flex items-center gap-1 ml-1">
                  <span className="h-1 w-12 bg-muted/50 rounded-full overflow-hidden inline-block align-middle"><motion.span className="block h-full bg-primary/60 rounded-full" initial={{ width: 0 }} animate={{ width: `${loadingProgress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} /></span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">{Math.round(loadingProgress)}%</span>
                </motion.span>
              )}
            </AnimatePresence>

            {/* Search inline — mesmo padrão do CatalogHeader */}
            <div className="hidden sm:block w-80 lg:w-[25rem]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar novidades…  /" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 text-xs pl-8 bg-muted/40 border-border/50 focus:bg-background" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
              </div>
            </div>
          </div>
          <Button variant={selectionMode ? "default" : "outline"} size="sm" className={cn("h-8 text-xs gap-1.5 shrink-0 transition-all", selectionMode && "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]")} onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) sel.clearSelection(); }}>
            <CheckSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline">{selectionMode ? "Cancelar" : "Selecionar"}</span>
          </Button>
          <LayoutPopover viewMode={viewMode} setViewMode={setViewMode} gridColumns={gridColumns} setGridColumns={setGridColumns} />
        </div>

        {/* Search full-width on mobile */}
        <div className="flex items-center gap-2 w-full sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar novidades..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 text-xs pl-8 bg-muted/40 border-border/50 focus:bg-background" />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[11px] gap-1.5 border-border/60"
              onClick={() => exportNoveltiesToCsv(filteredProducts)}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[11px] gap-1.5 border-border/60"
              onClick={() => shareNoveltiesOnWhatsApp({
                q: searchQuery,
                status: selectedStatus,
                expires: maxDays,
                count: filteredProducts.length
              })}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
          </div>
          
          <div className="h-4 w-px bg-border/40 mx-0.5 hidden sm:block" />

          {/* Desktop Filters — Hidden on small mobile */}
          <div className="hidden md:flex flex-wrap items-center gap-1.5">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[120px] h-7 text-[11px] gap-1" aria-label="Filtrar por status"><Sparkles className="h-3 w-3 shrink-0" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="expiring_soon">Expirando</SelectItem>
              </SelectContent>
            </Select>
            <Select value={maxDays} onValueChange={setMaxDays}>
              <SelectTrigger className="w-[130px] h-7 text-[11px] gap-1" aria-label="Filtrar por prazo de expiração"><Package className="h-3 w-3 shrink-0" /><SelectValue placeholder="Expira em" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer prazo</SelectItem>
                <SelectItem value="1">Expira hoje</SelectItem>
                <SelectItem value="3">Até 3 dias</SelectItem>
                <SelectItem value="7">Esta semana</SelectItem>
                <SelectItem value="15">Próximos 15 dias</SelectItem>
                <SelectItem value="30">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[150px] h-7 text-[11px] gap-1" aria-label="Filtrar por fornecedor"><Building2 className="h-3 w-3 shrink-0" /><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos fornecedores</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.count})</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px] h-7 text-[11px] gap-1" aria-label="Filtrar por categoria"><FolderTree className="h-3 w-3 shrink-0" /><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.count})</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Mobile Filter Trigger */}
          <div className="md:hidden w-full sm:w-auto">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-full sm:w-auto text-[11px] gap-1.5 border-border/60">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {hasActiveFilters && <Badge className="ml-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground">!</Badge>}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader className="text-left px-6">
                  <DrawerTitle className="text-lg font-display">Filtros de Novidades</DrawerTitle>
                  <DrawerDescription className="text-xs">Refine a busca por produtos recém-chegados.</DrawerDescription>
                </DrawerHeader>
                <div className="px-6 py-4 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "active", "expiring_soon"].map((s) => (
                        <Button 
                          key={s} 
                          variant={selectedStatus === s ? "default" : "outline"} 
                          size="sm" 
                          className="h-8 text-xs rounded-lg"
                          onClick={() => setSelectedStatus(s)}
                        >
                          {s === "all" ? "Todos" : s === "active" ? "Ativos" : "Expirando"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Expira em</label>
                    <Select value={maxDays} onValueChange={setMaxDays}>
                      <SelectTrigger className="w-full h-10 text-sm"><SelectValue placeholder="Prazo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer prazo</SelectItem>
                        <SelectItem value="1">Expira hoje</SelectItem>
                        <SelectItem value="3">Até 3 dias</SelectItem>
                        <SelectItem value="7">Esta semana</SelectItem>
                        <SelectItem value="15">Próximos 15 dias</SelectItem>
                        <SelectItem value="30">Este mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Fornecedor</label>
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                      <SelectTrigger className="w-full h-10 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todos fornecedores</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.count})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Categoria</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full h-10 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.count})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DrawerFooter className="px-6 pb-8 pt-2">
                  <div className="flex items-center gap-2">
                    <DrawerClose asChild>
                      <Button className="flex-1 rounded-xl h-11 text-sm font-semibold">Ver {filteredProducts.length} Resultados</Button>
                    </DrawerClose>
                    <Button variant="ghost" className="rounded-xl h-11 text-muted-foreground" onClick={clearFilters}>Limpar</Button>
                  </div>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-full sm:w-[180px] h-7 text-[11px] gap-1"><ArrowUpDown className="h-3 w-3" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A-Z)</SelectItem><SelectItem value="price-asc">Preço (Menor → Maior)</SelectItem>
              <SelectItem value="price-desc">Preço (Maior → Menor)</SelectItem><SelectItem value="newest">Mais Recentes</SelectItem>
              <SelectItem value="stock">Maior Estoque</SelectItem><SelectItem value="best-seller-supplier">+ Vendidos Fornecedores</SelectItem>
              <SelectItem value="best-seller-promo">+ Vendidos Promo Brindes</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && <Button variant="ghost" size="sm" className="hidden sm:flex h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground" onClick={clearFilters}><X className="h-3 w-3 mr-0.5" />Limpar</Button>}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1" role="list" aria-label="Filtros ativos">
            {searchQuery.trim() && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setSearchQuery("")}><Search className="h-2.5 w-2.5" />"{searchQuery}"<X className="h-2.5 w-2.5" /></Badge>}
            {selectedSupplier !== "all" && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setSelectedSupplier("all")}><Building2 className="h-2.5 w-2.5" />{suppliers.find(s => s.id === selectedSupplier)?.name}<X className="h-2.5 w-2.5" /></Badge>}
            {selectedCategory !== "all" && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setSelectedCategory("all")}><FolderTree className="h-2.5 w-2.5" />{categories.find(c => c.id === selectedCategory)?.name}<X className="h-2.5 w-2.5" /></Badge>}
            {selectedStatus !== "all" && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setSelectedStatus("all")}><Sparkles className="h-2.5 w-2.5" />{selectedStatus === "active" ? "Ativo" : "Expirando"}<X className="h-2.5 w-2.5" /></Badge>}
            {maxDays !== "all" && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => setMaxDays("all")}><Package className="h-2.5 w-2.5" />Expira em {maxDays}d<X className="h-2.5 w-2.5" /></Badge>}
          </div>
        )}
      </div>

      {!isLoading && filteredProducts.length > itemsPerPage && (
        <div className="flex items-center justify-between py-2 border-t border-border/10">
          <p className="text-[10px] text-muted-foreground">Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> de {filteredProducts.length}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <span className="sr-only">Anterior</span>
              <X className="h-3 w-3 rotate-90" />
            </Button>
            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <Button key={pageNum} variant={currentPage === pageNum ? "default" : "ghost"} size="sm" className="h-7 w-7 text-[10px] p-0" onClick={() => setCurrentPage(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <span className="sr-only">Próxima</span>
              <X className="h-3 w-3 -rotate-90" />
            </Button>
          </div>
        </div>
      )}

      {!isLoading && filteredProducts.length > 0 && hasActiveFilters && filteredProducts.length <= itemsPerPage && (
        <p className="text-[11px] text-muted-foreground">Mostrando <span className="font-medium text-foreground">{filteredProducts.length}</span> de {products.length} novidades</p>
      )}

      <div className="relative">
        {renderContent()}
        <AnimatePresence>
          {isFetching && products.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-sm text-muted-foreground">Filtrando...</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectionMode && <BulkActionBar selectedCount={sel.selectedCount} totalCount={filteredProducts.length} onSelectAll={sel.selectAll} onClearSelection={sel.clearSelection} onBulkFavorite={sel.handleBulkFavorite} onBulkCompare={sel.handleBulkCompare} onBulkCollection={sel.handleBulkCollection} onBulkCart={sel.handleBulkCart} onBulkQuote={sel.handleBulkQuote} />}
      <BulkVariantWizard open={sel.variantWizardOpen} onOpenChange={sel.setVariantWizardOpen} products={sel.selectedProducts} mode={sel.wizardMode} onComplete={sel.handleWizardComplete} initialSelections={sel.wizardSelections} initialIndex={sel.wizardSelections.length > 0 ? Math.max(0, sel.wizardSelections.length - 1) : 0} />
      <BulkAddToCartModal open={sel.cartModalOpen} onOpenChange={sel.setCartModalOpen} products={sel.bulkCartProducts} variantSelections={sel.wizardSelections} onDone={sel.clearSelection} onBack={sel.handleBackToWizard} />
      <AddToCollectionModal open={sel.collectionModalOpen} onOpenChange={sel.setCollectionModalOpen} productId={sel.firstSelectedId} productName={sel.firstSelectedProduct?.product_name || ""} />
    </div>
  );
});
