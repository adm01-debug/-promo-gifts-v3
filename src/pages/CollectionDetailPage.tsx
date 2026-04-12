import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Monitor, Package, Trash2, Search,
  FileText, ArrowUpDown, Clock, Download, CheckSquare, X, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { SortableProductItem } from "@/components/collections/SortableProductItem";
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { toast } from "sonner";
import { exportCollectionPDF } from "@/lib/export-collection-pdf";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortOption = "name" | "sku" | "added";


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

  // --- Local collection lookup ---
  const localCollection = useMemo(() => {
    return collections.find((c) => c.id === id);
  }, [collections, id]);

  // --- External collection lookup ---
  const { data: externalCollections = [] } = useExternalCollections();
  const externalCollection = useMemo(() => {
    if (localCollection) return null;
    return externalCollections.find((c) => c.id === id) || null;
  }, [localCollection, externalCollections, id]);

  const isExternal = !!externalCollection;

  // Fetch external collection products (product IDs)
  const { data: externalProductLinks = [], isLoading: isLoadingExternalProducts } =
    useExternalCollectionProducts(isExternal ? id! : null);

  // Resolve external product IDs to Product objects
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
    const map = new Map<
      string,
      { color_name?: string | null; color_hex?: string | null; thumbnail?: string | null }
    >();
    items.forEach((item) => {
      if (item.variant) {
        map.set(item.productId, item.variant);
      }
    });
    return map;
  }, [id, isExternal, getCollectionProductItems]);

  const isSelectionMode = selectedIds.size > 0;

  const toggleSelect = useCallback((pid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === products.length
        ? new Set()
        : new Set(products.map((p) => p.id))
    );
  }, [products]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !id) return;
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(
        products.map((p) => p.id),
        oldIndex,
        newIndex
      );
      reorderProducts(id, newOrder);
      toast.success("Ordem atualizada");
    },
    [id, products, reorderProducts]
  );

  // Filter + sort
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "sku") {
      filtered = [...filtered].sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
    }
    return filtered;
  }, [products, searchQuery, sortBy]);

  const productsWithVariant = useMemo(() => {
    return filteredProducts.map((product) => {
      const variant = variantMap.get(product.id);
      if (variant?.thumbnail) {
        return { ...product, images: [variant.thumbnail, ...product.images] };
      }
      return product;
    });
  }, [filteredProducts, variantMap]);

  const updatedAgo = useMemo(() => {
    if (!collection?.updatedAt) return null;
    try {
      return formatDistanceToNow(new Date(collection.updatedAt), {
        addSuffix: true,
        locale: ptBR,
      });
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
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
          <Button onClick={() => navigate("/colecoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para coleções
          </Button>
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
          {/* Header */}
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              className="w-fit -ml-2"
              onClick={() => navigate("/colecoes")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para coleções
            </Button>

            <div className="flex items-start gap-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 border-[1.5px] border-primary/20"
                style={{ backgroundColor: `${collection.color}20` }}
              >
                {collection.icon}
              </motion.div>
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-muted-foreground mt-1">{collection.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {isExternal && isLoadingExternalProducts
                      ? "Carregando..."
                      : `${products.length} produtos`}
                  </Badge>
                  {updatedAgo && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Atualizado {updatedAgo}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {products.length > 0 && (
                  <>
                    <Button
                      className="gap-2 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                      onClick={handleCreateQuote}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Criar Orçamento</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        exportCollectionPDF({
                          collectionName: collection.name,
                          collectionDescription: collection.description,
                          products,
                          variantMap,
                        });
                        toast.success("PDF exportado!");
                      }}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setShowPresentation(true)}
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="hidden sm:inline">Apresentar</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Premium Bulk Selection Bar ═══ */}
          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="sticky top-0 z-30 rounded-xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border-2 border-primary/30 backdrop-blur-xl rounded-xl px-5 py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Left — Counter */}
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.div
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 600, damping: 25 }}
                      >
                        <span className="font-display font-bold text-lg">{selectedIds.size}</span>
                      </motion.div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-foreground">
                          {selectedIds.size} produto{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Da coleção "{collection.name}"
                        </p>
                      </div>
                    </div>

                    {/* Right — Actions */}
                    <div className="flex items-center gap-2">
                      {selectedIds.size < products.length && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleSelectAll}
                            className="gap-1.5 text-xs"
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Selecionar Todos</span>
                          </Button>
                        </motion.div>
                      )}

                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Button
                          size="default"
                          className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow"
                          onClick={handleBulkQuote}
                        >
                          <FileText className="h-4 w-4" />
                          Orçamento ({selectedIds.size})
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={handleBulkRemove}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </Button>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearSelection}
                          className="gap-1.5 text-xs"
                        >
                          <X className="h-3.5 w-3.5" />
                          Limpar
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search + Sort toolbar */}
          {products.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na coleção..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("added")}>
                    Ordem de adição
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    Nome A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("sku")}>
                    SKU
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length === products.length
                  ? `${products.length} produtos`
                  : `${filteredProducts.length} de ${products.length}`}
              </p>
            </div>
          )}

          {/* Products */}
          {products.length > 0 ? (
            <div className="space-y-4">
              {filteredProducts.length > 0 ? (
                <ProductGrid
                  products={productsWithVariant}
                  onProductClick={(productId) => navigate(`/produto/${productId}`)}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  isInCompare={isInCompare}
                  onToggleCompare={toggleCompare}
                  canAddToCompare={canAddMore}
                />
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-display text-lg font-semibold mb-1">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Nenhum produto corresponde a "{searchQuery}"
                  </p>
                </div>
              )}

              {/* Management section — only for local collections */}
              {!isExternal && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <SelectionCheckbox
                        checked={selectedIds.size === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                        size="md"
                      />
                      <p className="text-sm font-medium text-muted-foreground">
                        {selectedIds.size > 0
                          ? `${selectedIds.size} selecionado(s)`
                          : `Gerenciar produtos (${products.length}) — arraste para reordenar`}
                      </p>
                    </div>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {products.map((product, idx) => (
                          <SortableProductItem
                            key={product.id}
                            product={product}
                            variant={variantMap.get(product.id)}
                            onRemove={() => handleRemoveFromCollection(product.id)}
                            isSelected={selectedIds.has(product.id)}
                            onToggleSelect={() => toggleSelect(product.id)}
                            notes={getCollectionProductItems(id!).find((i) => i.productId === product.id)?.notes}
                            onNotesChange={(notes) => updateProductNotes(id!, product.id, notes)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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
              subtitle:
                [
                  p.sku ? `SKU: ${p.sku}` : null,
                  variant?.color_name ? `Cor: ${variant.color_name}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ") || undefined,
              imageUrl: variant?.thumbnail || p.images?.[0] || null,
              badge: p.brand || null,
            };
          })}
        />
      )}
    </>
  );
}
