import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus, MoreVertical, Pencil, Trash2, FolderOpen, Package,
  RefreshCw, Cloud, Search, Star, FolderHeart, Copy, Clock, List,
  FileText, CheckSquare, X, Sparkles, ShoppingBag, ArrowRight,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import type { ViewMode } from "@/hooks/useCatalogState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { useExternalCollectionsManager, useExternalCollectionProductCounts } from "@/hooks/useExternalCollections";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function relativeTime(dateStr: string | undefined) {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
}

export default function CollectionsPage() {
  const navigate = useNavigate();

  const {
    collections: localCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addProductToCollection,
    getCollectionProducts,
    defaultColors,
    defaultIcons,
  } = useCollectionsContext();

  const {
    collections: externalCollections,
    isLoading: isLoadingExternal,
    refetch: refetchExternal,
  } = useExternalCollectionsManager();

  const externalCollectionIds = useMemo(() => externalCollections.map(c => c.id), [externalCollections]);
  const { data: externalProductCounts } = useExternalCollectionProductCounts(externalCollectionIds);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [hintDismissed, setHintDismissed] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: defaultColors[0],
    icon: defaultIcons[0],
  });

  const isSelectionMode = selectedCollectionIds.size > 0;

  const toggleSelectCollection = useCallback((id: string) => {
    setSelectedCollectionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAllLocal = useCallback(() => {
    setSelectedCollectionIds(new Set(localCollections.map(c => c.id)));
  }, [localCollections]);

  const clearSelection = useCallback(() => setSelectedCollectionIds(new Set()), []);

  // Compute selected products summary
  const selectedSummary = useMemo(() => {
    const names: string[] = [];
    let totalProducts = 0;
    const productIds = new Set<string>();

    selectedCollectionIds.forEach(colId => {
      const col = localCollections.find(c => c.id === colId);
      if (!col) return;
      names.push(col.name);
      const products = getCollectionProducts(colId);
      products.forEach(p => {
        if (!productIds.has(p.id)) {
          productIds.add(p.id);
          totalProducts++;
        }
      });
    });

    return { names, totalProducts, uniqueProductCount: productIds.size };
  }, [selectedCollectionIds, localCollections, getCollectionProducts]);

  const handleSendSelectedToQuote = useCallback(() => {
    const allProducts: Array<{
      product_id: string;
      product_name: string;
      product_sku: string | null;
      product_image_url: string | null;
      unit_price: number;
      quantity: number;
    }> = [];

    const collectionNames: string[] = [];

    selectedCollectionIds.forEach(colId => {
      const col = localCollections.find(c => c.id === colId);
      if (!col) return;
      collectionNames.push(col.name);
      const products = getCollectionProducts(colId);
      products.forEach(p => {
        if (!allProducts.some(x => x.product_id === p.id)) {
          allProducts.push({
            product_id: p.id,
            product_name: p.name,
            product_sku: p.sku || null,
            product_image_url: p.images?.[0] || null,
            unit_price: p.price || 0,
            quantity: 1,
          });
        }
      });
    });

    if (allProducts.length === 0) {
      toast.error("As coleções selecionadas não possuem produtos");
      return;
    }

    navigate("/orcamentos/novo", {
      state: {
        fromCollection: collectionNames.join(", "),
        preloadProducts: allProducts,
      },
    });
  }, [selectedCollectionIds, localCollections, getCollectionProducts, navigate]);

  // Stats
  const totalProducts = useMemo(() => {
    return localCollections.reduce((acc, col) => acc + col.productIds.length, 0);
  }, [localCollections]);

  const featuredCount = useMemo(() => {
    const extFeatured = externalCollections.filter((c) => c.is_featured).length;
    const localFeatured = localCollections.filter((c) => c.isFeatured).length;
    return extFeatured + localFeatured;
  }, [externalCollections, localCollections]);

  const totalCollections = localCollections.length + externalCollections.length;

  const gridClasses = useMemo(() => {
    if (viewMode === "list") return "flex flex-col gap-2";
    const colMap: Record<ColumnCount, string> = {
      3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
      4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
      5: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
      6: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3",
      8: "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3",
    };
    return colMap[gridColumns] || colMap[4];
  }, [viewMode, gridColumns]);

  const filteredExternal = useMemo(() => {
    if (!searchQuery.trim()) return externalCollections;
    const q = searchQuery.toLowerCase();
    return externalCollections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  }, [externalCollections, searchQuery]);

  const filteredLocal = useMemo(() => {
    if (!searchQuery.trim()) return localCollections;
    const q = searchQuery.toLowerCase();
    return localCollections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  }, [localCollections, searchQuery]);

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    createCollection(formData.name, formData.description, formData.color, formData.icon);
    toast.success(`Coleção "${formData.name}" criada`);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingCollection || !formData.name.trim()) return;
    updateCollection(editingCollection, {
      name: formData.name,
      description: formData.description,
      color: formData.color,
      icon: formData.icon,
    });
    toast.success("Coleção atualizada");
    setEditingCollection(null);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const collection = localCollections.find((c) => c.id === deleteConfirm);
    deleteCollection(deleteConfirm);
    toast.success(`Coleção "${collection?.name}" excluída`);
    setDeleteConfirm(null);
  };

  const handleClone = (collection: (typeof localCollections)[0]) => {
    const cloned = createCollection(
      `${collection.name} (cópia)`,
      collection.description,
      collection.color,
      collection.icon
    );
    const items = collection.productItems || [];
    if (items.length > 0) {
      setTimeout(() => {
        items.forEach((item) => {
          addProductToCollection(cloned.id, item.productId, item.variant);
        });
      }, 300);
    }
    toast.success(`Coleção "${collection.name}" duplicada com ${items.length} produtos`);
  };

  const openEdit = (collection: (typeof localCollections)[0]) => {
    setFormData({
      name: collection.name,
      description: collection.description || "",
      color: collection.color,
      icon: collection.icon,
    });
    setEditingCollection(collection.id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: defaultColors[0],
      icon: defaultIcons[0],
    });
  };

  return (
    <MainLayout>
      <PageSEO
        title="Coleções"
        description="Organize seus produtos favoritos em coleções personalizadas."
        path="/colecoes"
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FolderHeart, value: totalCollections, label: "Total Coleções", color: "text-primary" },
            { icon: FolderOpen, value: externalCollections.length, label: "Coleções Catálogo", color: "text-blue-500" },
            { icon: Star, value: localCollections.length, label: "Minhas Coleções", color: "text-amber-500" },
            { icon: Package, value: totalProducts, label: "Produtos", color: "text-emerald-500" },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, type: "spring", stiffness: 400, damping: 25 }}
              className="stat-card flex items-center gap-3 group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-default"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Nova Coleção + Search Bar + Layout */}
        <div className="flex items-center justify-between gap-3">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Coleção
          </Button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar coleções..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="hidden sm:block">
            <LayoutPopover
              viewMode={viewMode}
              setViewMode={setViewMode}
              gridColumns={gridColumns}
              setGridColumns={setGridColumns}
            />
          </div>
        </div>

        {/* ═══ Premium Selection Action Bar ═══ */}
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
                  {/* Left — Counter + Collection names */}
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 25 }}
                    >
                      <span className="font-display font-bold text-lg">{selectedCollectionIds.size}</span>
                    </motion.div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-foreground">
                        {selectedCollectionIds.size} coleção{selectedCollectionIds.size > 1 ? "ões" : ""} selecionada{selectedCollectionIds.size > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {selectedSummary.uniqueProductCount > 0 ? (
                          <>
                            <Package className="h-3 w-3 inline mr-1" />
                            {selectedSummary.uniqueProductCount} produto{selectedSummary.uniqueProductCount > 1 ? "s" : ""} únicos
                            {selectedSummary.names.length <= 3 && (
                              <> · {selectedSummary.names.join(", ")}</>
                            )}
                          </>
                        ) : (
                          "Nenhum produto nas coleções selecionadas"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right — Actions */}
                  <div className="flex items-center gap-2">
                    {selectedCollectionIds.size < localCollections.length && (
                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={selectAllLocal}
                          className="gap-1.5 text-xs"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Selecionar Todas</span>
                        </Button>
                      </motion.div>
                    )}

                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                      <Button
                        size="default"
                        className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow"
                        onClick={handleSendSelectedToQuote}
                        disabled={selectedSummary.uniqueProductCount === 0}
                      >
                        <FileText className="h-4 w-4" />
                        Criar Orçamento
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearSelection}
                        className="gap-1.5 text-xs hover:text-destructive hover:border-destructive/50 transition-colors"
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

        {/* ═══ Hint bar when no selection ═══ */}
        <AnimatePresence>
          {!isSelectionMode && !hintDismissed && localCollections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/40 border border-border/50"
            >
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">
                <span className="font-medium text-foreground">Dica:</span> Selecione coleções marcando o checkbox nos cards para enviar todos os produtos para um orçamento de uma vez.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setHintDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Personal Collections (DB-persisted) ═══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderHeart className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Minhas Coleções</h2>
            <Badge variant="secondary" className="text-xs">
              {localCollections.length}
            </Badge>
          </div>

          {filteredLocal.length > 0 ? (
            <div className={gridClasses}>
              {filteredLocal.map((collection, idx) => {
                const products = getCollectionProducts(collection.id);
                const previewImages = products.slice(0, 4).map((p) => p.images[0]);
                const updatedAgo = relativeTime(collection.updatedAt);
                const isSelected = selectedCollectionIds.has(collection.id);

                const contextMenu = (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mais opções"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-background/60 backdrop-blur-sm hover:bg-background/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(collection); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClone(collection); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        updateCollection(collection.id, { isFeatured: !collection.isFeatured });
                        toast.success(collection.isFeatured ? "Removido dos destaques" : "Marcado como destaque ⭐");
                      }}>
                        <Star className="h-4 w-4 mr-2" />
                        {collection.isFeatured ? "Remover destaque" : "Destacar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(collection.id); }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );

                if (viewMode === "list") {
                  return (
                    <motion.div
                      key={collection.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        "group flex items-center gap-4 p-3 rounded-xl bg-card border cursor-pointer transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border/50 hover:border-primary/40 hover:shadow-md"
                      )}
                      onClick={() => navigate(`/colecoes/${collection.id}`)}
                    >
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <SelectionCheckbox
                          checked={isSelected}
                          onChange={() => toggleSelectCollection(collection.id)}
                          size="md"
                        />
                      </div>
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden"
                        style={{ backgroundColor: `${collection.color}20` }}
                      >
                        {previewImages[0] ? (
                          <img src={previewImages[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{collection.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground truncate">{collection.name}</h3>
                        {collection.description && (
                          <p className="text-sm text-muted-foreground truncate">{collection.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {collection.productIds.length}
                        </span>
                        {collection.isFeatured && <Star className="h-4 w-4 text-primary" />}
                        {updatedAgo && (
                          <span className="text-xs text-muted-foreground/60 hidden md:flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {updatedAgo}
                          </span>
                        )}
                        {contextMenu}
                      </div>
                    </motion.div>
                  );
                }

                // Grid card
                return (
                  <motion.div
                    key={collection.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "group relative rounded-xl sm:rounded-2xl bg-card overflow-hidden cursor-pointer border-[1.5px] hover:shadow-xl card-lift transition-all duration-300",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
                        : "border-primary/20 hover:border-primary/50"
                    )}
                    onClick={() => navigate(`/colecoes/${collection.id}`)}
                  >
                    <div className="absolute top-3 right-3 z-10">{contextMenu}</div>

                    {/* Selection checkbox — always visible in selection mode, otherwise on hover */}
                    <div
                      className={cn(
                        "absolute top-3 left-3 z-10 transition-opacity duration-200",
                        isSelected || isSelectionMode
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectionCheckbox
                        checked={isSelected}
                        onChange={() => toggleSelectCollection(collection.id)}
                        size="lg"
                        animateEntry
                      />
                    </div>

                    {/* Preview images grid */}
                    <div
                      className="aspect-[4/3] overflow-hidden relative"
                      style={{ backgroundColor: `${collection.color}12` }}
                    >
                      {previewImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5 p-3 h-full">
                          {previewImages.map((img, imgIdx) => (
                            <div key={imgIdx} className="rounded-lg overflow-hidden bg-background/50">
                              <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                            </div>
                          ))}
                          {previewImages.length < 4 && Array(4 - previewImages.length).fill(0).map((_, i) => (
                            <div key={`empty-${i}`} className="rounded-lg bg-background/20" />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                          <FolderOpen className="h-14 w-14 transition-transform duration-300 group-hover:scale-110" style={{ color: collection.color }} />
                          <span className="text-xs text-muted-foreground">Sem produtos</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/60 to-transparent" />
                    </div>

                    {/* Info */}
                    <div className="p-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${collection.color}20` }}>
                        {collection.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-semibold text-foreground truncate">{collection.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {collection.productIds.length} produtos
                          </p>
                          {collection.isFeatured && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                              <Star className="h-2.5 w-2.5 mr-0.5" /> Destaque
                            </Badge>
                          )}
                          {updatedAgo && (
                            <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {updatedAgo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : localCollections.length > 0 && searchQuery ? (
            <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                Nenhuma coleção encontrada
              </h3>
              <p className="text-muted-foreground text-sm">
                Nenhuma coleção corresponde a "{searchQuery}"
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="text-center py-16 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10"
            >
              <motion.div
                initial={{ y: 10 }}
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <FolderOpen className="h-16 w-16 text-primary/40 mx-auto mb-4" />
              </motion.div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Nenhuma coleção criada
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crie coleções para organizar seus produtos favoritos e montar apresentações profissionais
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Criar primeira coleção
              </Button>
            </motion.div>
          )}
        </div>

        {/* ═══ External Collections (Catalog) ═══ */}
        {(externalCollections.length > 0 || isLoadingExternal) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Coleções do Catálogo</h2>
            </div>

            {isLoadingExternal ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className={gridClasses}>
                {filteredExternal.map((collection, idx) => (
                  viewMode === "list" ? (
                    <motion.div
                      key={collection.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-200"
                      onClick={() => navigate(`/colecoes/${collection.id}`)}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden"
                        style={{ backgroundColor: collection.color ? `${collection.color}20` : "hsl(var(--muted))" }}
                      >
                        {collection.image_url ? (
                          <img src={collection.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FolderOpen className="h-6 w-6" style={{ color: collection.color || "hsl(var(--primary))" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground truncate">{collection.name}</h3>
                        {collection.description && (
                          <p className="text-sm text-muted-foreground truncate">{collection.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {externalProductCounts ? (externalProductCounts.get(collection.id) ?? 0) : "…"}
                        </span>
                        {collection.is_featured && (
                          <Star className="h-4 w-4 text-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            createCollection(
                              collection.name,
                              collection.description || undefined,
                              collection.color || defaultColors[0],
                              collection.icon || defaultIcons[0]
                            );
                            toast.success(`Coleção "${collection.name}" duplicada como local`);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 400, damping: 25 }}
                    className="group relative rounded-xl sm:rounded-2xl bg-card overflow-hidden cursor-pointer border-[1.5px] border-primary/20 hover:border-primary/50 hover:shadow-xl card-lift transition-all duration-300"
                    onClick={() => navigate(`/colecoes/${collection.id}`)}
                  >
                    {/* Preview */}
                    <div
                      className="aspect-[4/3] overflow-hidden flex items-center justify-center relative"
                      style={{
                        backgroundColor: collection.color
                          ? `${collection.color}12`
                          : "hsl(var(--muted))",
                      }}
                    >
                      {collection.image_url ? (
                        <img
                          src={collection.image_url}
                          alt={collection.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FolderOpen
                            className="h-14 w-14 transition-transform duration-300 group-hover:scale-110"
                            style={{ color: collection.color || "hsl(var(--primary))" }}
                          />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/80 to-transparent" />
                    </div>

                    {/* Info */}
                    <div className="p-4 flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{
                          backgroundColor: collection.color
                            ? `${collection.color}20`
                            : "hsl(var(--muted))",
                        }}
                      >
                        {collection.icon || "📁"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-semibold text-foreground truncate">
                          {collection.name}
                        </h3>
                        {collection.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {collection.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {externalProductCounts ? (externalProductCounts.get(collection.id) ?? 0) : "…"} produtos
                          </p>
                          {collection.is_featured && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                            >
                              <Star className="h-3 w-3 mr-0.5" />
                              Destaque
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Duplicate button */}
                    <div className="absolute top-3 right-3 z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Duplicar como coleção local"
                        className="h-8 w-8 bg-background/60 backdrop-blur-sm hover:bg-background/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          createCollection(
                            collection.name,
                            collection.description || undefined,
                            collection.color || defaultColors[0],
                            collection.icon || defaultIcons[0]
                          );
                          toast.success(`Coleção "${collection.name}" duplicada como local`, {
                            description: "Adicione produtos manualmente à nova coleção",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={isCreateOpen || !!editingCollection}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCollection(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCollection ? "Editar Coleção" : "Nova Coleção"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5" onKeyDown={(e) => {
            if (e.key === "Enter" && formData.name.trim()) {
              e.preventDefault();
              editingCollection ? handleUpdate() : handleCreate();
            }
          }}>
            {/* Live preview */}
            <motion.div
              layout
              className="flex items-center gap-3 p-3 rounded-xl border-[1.5px] border-primary/20 bg-muted/30"
            >
              <motion.div
                key={`${formData.color}-${formData.icon}`}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                {formData.icon}
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-foreground truncate">
                  {formData.name || "Nome da coleção..."}
                </p>
                {formData.description && (
                  <p className="text-xs text-muted-foreground truncate">{formData.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">Preview</Badge>
            </motion.div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Clientes Premium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descreva esta coleção..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {defaultColors.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all duration-200",
                      formData.color === color && "ring-2 ring-offset-2 ring-primary scale-110 shadow-md"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {defaultIcons.map((icon) => (
                  <motion.button
                    key={icon}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={cn(
                      "w-10 h-10 rounded-lg text-lg flex items-center justify-center border transition-all",
                      formData.icon === icon
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {icon}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingCollection(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2 shadow-lg shadow-primary/20"
                onClick={editingCollection ? handleUpdate : handleCreate}
                disabled={!formData.name.trim()}
              >
                {editingCollection ? "Salvar" : (
                  <>
                    <Plus className="h-4 w-4" />
                    Criar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coleção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os produtos não serão excluídos, apenas removidos
              desta coleção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
