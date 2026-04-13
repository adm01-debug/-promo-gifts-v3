import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Package, Trash2, Search,
  FileText, ArrowUpDown, ArrowRight, CheckSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductTableView } from "@/components/products/ProductTableView";
import { ProductListItem } from "@/components/products/ProductListItem";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkSelectionBar } from "@/components/common/BulkSelectionBar";
import { CollectionDetailHeader } from "@/components/collections/CollectionDetailHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { useProductsContext } from "@/contexts/ProductsContext";
import {
  useExternalCollections,
  useExternalCollectionProducts,
} from "@/hooks/useExternalCollections";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { toast } from "sonner";
import { exportCollectionPDF } from "@/lib/export-collection-pdf";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortOption = "name" | "sku" | "added";
type ViewMode = "grid" | "list" | "table";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    collections,
    getCollectionProducts,
    getCollectionProductItems,
    removeProductFromCollection,
    reorderProducts,
    updateProductNotes,
  } = useCollectionsContext();
  const { getProductsByIds, products: _cacheSignal } = useProductsContext();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonStore();
  const [showPresentation, setShowPresentation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("added");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);

  // --- Local collection lookup ---
  const localCollection = useMemo(() => collections.find((c) => c.id === id), [collections, id]);

  // --- External collection lookup ---
  const { data: externalCollections = [] } = useExternalCollections();
  const externalCollection = useMemo(() => {
    if (localCollection) return null;
    return externalCollections.find((c) => c.id === id) || null;
  }, [localCollection, externalCollections, id]);

  const isExternal = !!externalCollection;

  const { data: externalProductLinks = [], isLoading: isLoadingExternalProducts } =
    useExternalCollectionProducts(isExternal ? id! : null);

  const externalProductIds = useMemo(
    () => externalProductLinks.map((link) => link.product_id),
    [externalProductLinks]
  );
  const externalProducts = useMemo(
    () => (isExternal ? getProductsByIds(externalProductIds) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isExternal, externalProductIds, getProductsByIds, _cacheSignal]
  );

  // --- Unified collection data ---
  const collection = useMemo(() => {
    if (localCollection) {
      return {
        id: localCollection.id,
        name: localCollection.name,
        description: localCollection.description,
        color: localCollection.color,
        icon: localCollection.icon,
        isFeatured: localCollection.isFeatured,
        updatedAt: localCollection.updatedAt,
        isExternal: false as const,
      };
    }
    if (externalCollection) {
      return {
        id: externalCollection.id,
        name: externalCollection.name,
        description: externalCollection.description || undefined,
        color: externalCollection.color || "#3B82F6",
        icon: externalCollection.icon || "📁",
        isFeatured: externalCollection.is_featured || false,
        updatedAt: externalCollection.updated_at,
        isExternal: true as const,
      };
    }
    return null;
  }, [localCollection, externalCollection]);

  // --- Products ---
  const products = useMemo(() => {
    if (!id) return [];
    if (isExternal) return externalProducts;
    return getCollectionProducts(id);
  }, [id, isExternal, externalProducts, getCollectionProducts]);

  const variantMap = useMemo(() => {
    if (!id || isExternal) return new Map();
    const items = getCollectionProductItems(id);
    const map = new Map<string, { color_name?: string | null; color_hex?: string | null; thumbnail?: string | null }>();
    items.forEach((item) => {
      if (item.variant) map.set(item.productId, item.variant);
    });
    return map;
  }, [id, isExternal, getCollectionProductItems]);

  const isSelectionMode = selectionModeActive || selectedIds.size > 0;

  const toggleSelect = useCallback((pid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => prev.size === products.length ? new Set() : new Set(products.map((p) => p.id)));
  }, [products]);

  const clearSelection = useCallback(() => { setSelectedIds(new Set()); setSelectionModeActive(false); }, []);

  const toggleSelectionMode = useCallback(() => {
    if (selectionModeActive) {
      setSelectedIds(new Set());
      setSelectionModeActive(false);
    } else {
      setSelectionModeActive(true);
    }
  }, [selectionModeActive]);

  const handleBulkRemove = useCallback(() => {
    if (!id || selectedIds.size === 0) return;
    selectedIds.forEach((pid) => removeProductFromCollection(id, pid));
    toast.success(`${selectedIds.size} produto(s) removido(s)`);
    setSelectedIds(new Set());
  }, [id, selectedIds, removeProductFromCollection]);

  const handleBulkQuote = useCallback(() => {
    if (!collection || selectedIds.size === 0) return;
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    navigate("/orcamentos/novo", {
      state: {
        fromCollection: collection.name,
        preloadProducts: selectedProducts.map((p) => ({
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku || null,
          product_image_url: p.images?.[0] || null,
          unit_price: p.price || 0,
          quantity: 1,
          color_name: variantMap.get(p.id)?.color_name || null,
          color_hex: variantMap.get(p.id)?.color_hex || null,
        })),
      },
    });
  }, [collection, selectedIds, products, variantMap, navigate]);



  // Filter + sort
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q));
    }
    if (sortBy === "name") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "sku") filtered = [...filtered].sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
    return filtered;
  }, [products, searchQuery, sortBy]);

  const productsWithVariant = useMemo(() => {
    return filteredProducts.map((product) => {
      const variant = variantMap.get(product.id);
      if (variant?.thumbnail) return { ...product, images: [variant.thumbnail, ...product.images] };
      return product;
    });
  }, [filteredProducts, variantMap]);

  const updatedAgo = useMemo(() => {
    if (!collection?.updatedAt) return null;
    try {
      return formatDistanceToNow(new Date(collection.updatedAt), { addSuffix: true, locale: ptBR });
    } catch {
      return null;
    }
  }, [collection?.updatedAt]);

  // Loading state for external collections
  if (isExternal && isLoadingExternalProducts) {
    return (
      <MainLayout>
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!collection) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <h2 className="font-display text-xl font-semibold mb-4">Coleção não encontrada</h2>
          <Button onClick={() => navigate("/colecoes")}>Voltar para coleções</Button>
        </div>
      </MainLayout>
    );
  }

  const handleRemoveFromCollection = (productId: string) => {
    removeProductFromCollection(collection.id, productId);
    toast.success("Produto removido da coleção");
  };

  const handleCreateQuote = () => {
    navigate("/orcamentos/novo", {
      state: {
        fromCollection: collection.name,
        preloadProducts: products.map((p) => ({
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          product_image_url: p.images?.[0] || null,
          unit_price: p.price || 0,
          quantity: 1,
          color_name: variantMap.get(p.id)?.color_name || null,
          color_hex: variantMap.get(p.id)?.color_hex || null,
        })),
      },
    });
  };

  const sortLabel = sortBy === "name" ? "Nome" : sortBy === "sku" ? "SKU" : "Adicionados";

  return (
    <>
      <MainLayout>
        <PageSEO
          title={`Coleção: ${collection.name}`}
          description={`Explore os produtos da coleção ${collection.name}.`}
          path={`/colecoes/${id}`}
          noIndex
        />
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
          <CollectionDetailHeader
            collection={collection}
            productCount={products.length}
            isLoading={isExternal && isLoadingExternalProducts}
            updatedAgo={updatedAgo}
            onBack={() => navigate("/colecoes")}
            onCreateQuote={handleCreateQuote}
            onExportPDF={() => {
              exportCollectionPDF({ collectionName: collection.name, collectionDescription: collection.description, products, variantMap });
              toast.success("PDF exportado!");
            }}
            onPresent={() => setShowPresentation(true)}
          />

          <BulkSelectionBar
            isActive={isSelectionMode}
            selectedCount={selectedIds.size}
            label={`${selectedIds.size} produto${selectedIds.size > 1 ? "s" : ""} selecionado${selectedIds.size > 1 ? "s" : ""}`}
            subtitle={`Da coleção "${collection.name}"`}
            totalCount={products.length}
            onSelectAll={toggleSelectAll}
            onClear={clearSelection}
            actions={
              <>
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                  <Button size="default" className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow" onClick={handleBulkQuote}>
                    <FileText className="h-4 w-4" />
                    Orçamento ({selectedIds.size})
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleBulkRemove}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                </motion.div>
              </>
            }
          />

          {/* Search + Sort toolbar */}
          {products.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar na coleção..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("added")}>Ordem de adição</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>Nome A-Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("sku")}>SKU</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {!isExternal && (
                <Button
                  variant={isSelectionMode ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={toggleSelectionMode}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {isSelectionMode ? "Selecionando" : "Selecionar"}
                </Button>
              )}
              <div className="hidden sm:block">
                <LayoutPopover
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  gridColumns={gridColumns}
                  setGridColumns={setGridColumns}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length === products.length ? `${products.length} produtos` : `${filteredProducts.length} de ${products.length}`}
              </p>
            </div>
          )}

          {/* Products */}
          {products.length > 0 ? (
            <div className="space-y-4">
              {filteredProducts.length > 0 ? (
                viewMode === "table" ? (
                  <ProductTableView
                    products={productsWithVariant}
                    onProductClick={(productId) => navigate(`/produto/${productId}`)}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    isInCompare={isInCompare}
                    onToggleCompare={toggleCompare}
                    canAddToCompare={canAddMore}
                    selectionMode={isSelectionMode}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                  />
                ) : viewMode === "list" ? (
                  <div className="space-y-1.5">
                    {productsWithVariant.map((product) => (
                      <ProductListItem
                        key={product.id}
                        product={product}
                        onClick={() => navigate(`/produto/${product.id}`)}
                        isFavorited={isFavorite(product.id)}
                        onToggleFavorite={toggleFavorite}
                        isInCompare={isInCompare(product.id)}
                        onToggleCompare={toggleCompare}
                        canAddToCompare={canAddMore}
                      />
                    ))}
                  </div>
                ) : (
                  <ProductGrid
                    products={productsWithVariant}
                    onProductClick={(productId) => navigate(`/produto/${productId}`)}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    isInCompare={isInCompare}
                    onToggleCompare={toggleCompare}
                    canAddToCompare={canAddMore}
                    columns={gridColumns}
                    selectionMode={isSelectionMode}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                  />
                )
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-display text-lg font-semibold mb-1">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground text-sm">Nenhum produto corresponde a "{searchQuery}"</p>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-16 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {isExternal ? "Nenhum produto nesta coleção" : "Coleção vazia"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {isExternal
                  ? "Esta coleção do catálogo ainda não possui produtos vinculados."
                  : "Adicione produtos a esta coleção clicando no ícone de pasta nos cards de produto"}
              </p>
              <Button onClick={() => navigate(isExternal ? "/colecoes" : "/")}>
                {isExternal ? "Voltar para coleções" : "Explorar produtos"}
              </Button>
            </div>
          )}
        </div>
      </MainLayout>

      {showPresentation && products.length > 0 && (
        <PresentationMode
          title={collection.name}
          subtitle={collection.description || undefined}
          brandName="Promo Brindes"
          onClose={() => setShowPresentation(false)}
          slides={products.map((p) => {
            const variant = variantMap.get(p.id);
            return {
              id: p.id,
              title: p.name,
              subtitle: [p.sku ? `SKU: ${p.sku}` : null, variant?.color_name ? `Cor: ${variant.color_name}` : null].filter(Boolean).join(" • ") || undefined,
              imageUrl: variant?.thumbnail || p.images?.[0] || null,
              badge: p.brand || null,
            };
          })}
        />
      )}
    </>
  );
}
