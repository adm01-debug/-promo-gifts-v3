/**
 * ProductTableView — Tabela compacta para análise comparativa rápida.
 * Mostra SKU, nome, fornecedor, preço, estoque e cores em colunas.
 *
 * ✅ PARIDADE COM GRID: Todas as ações rápidas do ProductCard (Grid)
 *    estão implementadas aqui com a mesma arquitetura de variante/cor:
 *    Favoritar, Comparar, Coleção, Share, Orçamento, Carrinho, QuickView
 */
import { memo, useState, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Package, Heart, GitCompare, ExternalLink, Share2, FolderPlus, Eye, FileText } from "lucide-react";
import { resolveColorImage, resolveColorStock, getActiveColorName, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { getCdnUrl } from "@/utils/image-utils";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { VariantPickerDialog, type VariantActionMode } from "./VariantPickerDialog";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductQuickView } from "./ProductQuickView";
import { SharePreviewDialog } from "./share/SharePreviewDialog";
import { QuickAddToQuote } from "./QuickAddToQuote";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { toast } from "sonner";
import { showUndoToast, showErrorToast } from "@/utils/undoToast";

interface ProductTableViewProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (id: string) => void;
  isInCompare?: (id: string) => boolean;
  onToggleCompare?: (id: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  onShareProduct?: (product: Product) => void;
  highlightColors?: string[];
  activeColorFilter?: ActiveColorFilter | null;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

type SortCol = "name" | "sku" | "price" | "stock" | "supplier";
type SortDir = "asc" | "desc";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

const stockColor = (status: string) => {
  if (status === "in-stock") return "text-success";
  if (status === "low-stock") return "text-warning";
  return "text-destructive";
};

function SortHeader({
  label,
  col,
  activeCol,
  activeDir,
  onSort,
  className,
}: {
  label: string;
  col: SortCol;
  activeCol: SortCol;
  activeDir: SortDir;
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const isActive = activeCol === col;
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors",
        isActive && "text-primary",
        className
      )}
      onClick={() => onSort(col)}
    >
      {label}
      {isActive ? (
        activeDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export const ProductTableView = memo(function ProductTableView({
  products,
  onProductClick,
  isFavorite,
  onToggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare = true,
  onShareProduct,
  highlightColors = [],
  activeColorFilter,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: ProductTableViewProps) {
  const navigate = useNavigate();
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  
  // Shared variant picker state
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantPickerMode, setVariantPickerMode] = useState<VariantActionMode>('favorite');
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  
  // Collection modal state
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionProduct, setCollectionProduct] = useState<Product | null>(null);
  const [collectionVariant, setCollectionVariant] = useState<{ color_name?: string | null; color_hex?: string | null; variant_id?: string | null; thumbnail?: string | null } | undefined>(undefined);

  // QuickView state
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);
  const [shareVariant, setShareVariant] = useState<{ variantName?: string | null; colorHex?: string | null; thumbnailUrl?: string | null } | null>(null);

  const favStore = useFavoritesStore();
  const compStore = useComparisonStore();

  const openVariantPicker = useCallback((product: Product, mode: VariantActionMode) => {
    setVariantPickerProduct(product);
    setVariantPickerMode(mode);
    setVariantPickerOpen(true);
  }, []);

  const handleVariantComplete = useCallback((variant: ExternalVariantStock | null) => {
    if (!variantPickerProduct) return;
    const variantInfo = variant ? {
      color_name: variant.color_name,
      color_hex: variant.color_hex,
      size_code: variant.size_code,
      variant_id: variant.id,
      thumbnail: variant.selected_thumbnail,
    } : undefined;

    if (variantPickerMode === 'favorite') {
      favStore.addFavorite(variantPickerProduct.id, variantInfo);
      toast.success(`"${variantPickerProduct.name}" favoritado${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
    } else if (variantPickerMode === 'compare') {
      const result = compStore.addToCompare(variantPickerProduct.id, variantInfo);
      if (!result) {
        showErrorToast({ title: "Limite de 4 produtos para comparação atingido" });
      } else {
        toast.success(`"${variantPickerProduct.name}" adicionado à comparação${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
      }
    } else if (variantPickerMode === 'collection') {
      setCollectionProduct(variantPickerProduct);
      setCollectionVariant(variantInfo);
      setCollectionModalOpen(true);
    } else if (variantPickerMode === 'quote') {
      const params = new URLSearchParams({
        product_id: variantPickerProduct.id,
        product_name: variantPickerProduct.name,
        product_sku: variantPickerProduct.sku || '',
        product_price: String(variantPickerProduct.price ?? 0),
      });
      if (variant?.color_name) params.set('color_name', variant.color_name);
      if (variant?.color_hex) params.set('color_hex', variant.color_hex);
      if (variant?.selected_thumbnail) params.set('product_image', variant.selected_thumbnail);
      if (variantPickerProduct.images?.[0]) params.set('product_image', variant?.selected_thumbnail || variantPickerProduct.images[0]);
      setTimeout(() => navigate(`/orcamentos/novo?${params.toString()}`), 0);
    } else if (variantPickerMode === 'share') {
      setShareProduct(variantPickerProduct);
      setShareVariant(variant ? {
        variantName: variant.color_name,
        colorHex: variant.color_hex,
        thumbnailUrl: variant.selected_thumbnail,
      } : null);
      setShareDialogOpen(true);
    }
  }, [variantPickerMode, variantPickerProduct, favStore, compStore, navigate]);

  const handleSort = useCallback((col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }, [sortCol]);

  const sorted = [...products].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortCol) {
      case "name": return dir * a.name.localeCompare(b.name);
      case "sku": return dir * (a.sku || "").localeCompare(b.sku || "");
      case "price": return dir * (a.price - b.price);
      case "stock": return dir * ((a.stock || 0) - (b.stock || 0));
      case "supplier": return dir * (a.supplier?.name || "").localeCompare(b.supplier?.name || "");
      default: return 0;
    }
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {selectionMode && <th className="w-10 px-2 py-2.5" />}
            <th className="w-12 px-2 py-2.5" />
            <th className="text-left px-3 py-2.5">
              <SortHeader label="Produto" col="name" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} />
            </th>
            <th className="text-left px-3 py-2.5 hidden md:table-cell">
              <SortHeader label="SKU" col="sku" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} />
            </th>
            <th className="text-left px-3 py-2.5 hidden lg:table-cell">
              <SortHeader label="Fornecedor" col="supplier" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} />
            </th>
            <th className="text-left px-3 py-2.5 hidden sm:table-cell">Cores</th>
            <th className="text-right px-3 py-2.5">
              <SortHeader label="Preço" col="price" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} className="justify-end" />
            </th>
            <th className="text-right px-3 py-2.5">
              <SortHeader label="Estoque" col="stock" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} className="justify-end" />
            </th>
            <th className="w-auto min-w-[180px] px-2 py-2.5 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((product) => {
            const colorSpecificImage = resolveColorImage(product, activeColorFilter);
            const rawImg = colorSpecificImage || product.og_image_url || product.images[0] || null;
            const thumbUrl = rawImg ? getCdnUrl(rawImg, "card") : "/placeholder.svg";
            const colorStock = resolveColorStock(product, activeColorFilter);
            const displayStock = colorStock?.stock ?? product.stock;
            const displayStatus = colorStock?.stockStatus ?? product.stockStatus;
            const activeColorName = getActiveColorName(product, activeColorFilter);
            const isSelected = selectionMode && selectedIds?.has(product.id);
            const fav = isFavorite?.(product.id) ?? false;
            const inComp = isInCompare?.(product.id) ?? false;
            const matchedColor = resolveHighlightHex(product.colors, activeColorFilter, highlightColors);
            const hasColorMatch = !!matchedColor || (highlightColors.length > 0 &&
              product.colors.some((c) => highlightColors.includes(c.group))) ||
              !!activeColorName;
            return (
              <tr
                key={product.id}
                className={cn(
                  "border-b border-border/30 hover:bg-accent/30 cursor-pointer transition-colors group",
                  isSelected && "bg-primary/5 ring-1 ring-primary/30",
                )}
                style={hasColorMatch && matchedColor ? {
                  backgroundColor: `${matchedColor}10`,
                  borderLeftWidth: '4px',
                  borderLeftColor: `${matchedColor}80`,
                  boxShadow: `inset 4px 0 12px -4px ${matchedColor}25`,
                } as React.CSSProperties : undefined}
                onClick={() => selectionMode ? onToggleSelect?.(product.id) : onProductClick?.(product.id)}
              >
                {/* Selection checkbox */}
                {selectionMode && (
                  <td className="px-2 py-1.5">
                    <SelectionCheckbox
                      checked={!!isSelected}
                      onChange={() => onToggleSelect?.(product.id)}
                      size="sm"
                    />
                  </td>
                )}
                {/* Thumb */}
                <td className="px-2 py-1.5">
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted/30 border border-border/30">
                    <img src={thumbUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
                  </div>
                </td>
                {/* Name */}
                <td className="px-3 py-1.5">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 text-[13px]">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-muted-foreground md:hidden">{product.sku}</p>
                    {activeColorName && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/80">
                        {activeColorName}
                      </Badge>
                    )}
                  </div>
                </td>
                {/* SKU */}
                <td className="px-3 py-1.5 hidden md:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                </td>
                {/* Supplier */}
                <td className="px-3 py-1.5 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{product.supplier?.name}</span>
                </td>
                {/* Colors */}
                <td className="px-3 py-1.5 hidden sm:table-cell">
                  <div className="flex items-center gap-0.5">
                    {product.colors.slice(0, 6).map((c, i) => {
                      const isHighlighted = highlightColors.includes(c.group) ||
                        (activeColorFilter?.groups?.includes(c.groupSlug || '') ?? false) ||
                        (activeColorFilter?.variations?.includes(c.variationSlug || '') ?? false);
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border",
                                isHighlighted
                                  ? "border-success ring-1 ring-success/40 scale-110"
                                  : "border-border/50"
                              )}
                              style={{ backgroundColor: c.hex }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{c.name}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {product.colors.length > 6 && (
                      <span className="text-[10px] text-muted-foreground ml-0.5">+{product.colors.length - 6}</span>
                    )}
                  </div>
                </td>
                {/* Price */}
                <td className="px-3 py-1.5 text-right">
                  <span className="font-display font-bold text-foreground text-[13px]">
                    {formatPrice(product.price)}
                  </span>
                </td>
                {/* Stock — color-aware */}
                <td className="px-3 py-1.5 text-right">
                  <span className={cn("flex items-center gap-1 justify-end text-xs font-medium", stockColor(displayStatus))}>
                    <Package className="h-3 w-3" />
                    {(displayStock || 0).toLocaleString("pt-BR")}
                  </span>
                </td>
                {/* Actions — full parity with Grid */}
                <td className="px-2 py-1.5">
                  <div className="flex items-center justify-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {/* Favoritar */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-7 w-7 rounded-full", fav && "text-destructive bg-destructive/10")}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fav) {
                              onToggleFavorite?.(product.id);
                              showUndoToast({
                                title: `"${product.name}" removido dos favoritos`,
                                onUndo: () => onToggleFavorite?.(product.id),
                              });
                            } else {
                              openVariantPicker(product, 'favorite');
                            }
                          }}
                          aria-label="Favoritar"
                        >
                          <Heart className={cn("h-3 w-3", fav && "fill-current")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">{fav ? "Remover favorito" : "Favoritar"}</TooltipContent>
                    </Tooltip>

                    {/* Comparar */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-7 w-7 rounded-full", inComp && "text-primary bg-primary/10")}
                          disabled={!inComp && !canAddToCompare}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (inComp) {
                              onToggleCompare?.(product.id);
                              showUndoToast({
                                title: `"${product.name}" removido da comparação`,
                                onUndo: () => onToggleCompare?.(product.id),
                              });
                            } else {
                              openVariantPicker(product, 'compare');
                            }
                          }}
                          aria-label="Comparar"
                        >
                          <GitCompare className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Comparar</TooltipContent>
                    </Tooltip>

                    {/* Coleção */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVariantPicker(product, 'collection');
                          }}
                          aria-label="Adicionar à coleção"
                        >
                          <FolderPlus className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Coleção</TooltipContent>
                    </Tooltip>

                    {/* Compartilhar via VariantPicker */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVariantPicker(product, 'share');
                          }}
                          aria-label="Compartilhar"
                        >
                          <Share2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Compartilhar</TooltipContent>
                    </Tooltip>

                    {/* Orçamento */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVariantPicker(product, 'quote');
                          }}
                          aria-label="Orçamento"
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Orçamento</TooltipContent>
                    </Tooltip>

                    {/* Carrinho */}
                    <QuickAddToQuote
                      productId={product.id}
                      productName={product.name}
                      productSku={product.sku}
                      productImageUrl={product.og_image_url || product.images[0]}
                      productPrice={product.price}
                      minQuantity={product.minQuantity || 1}
                      variant="icon"
                      className="h-7 w-7"
                    />

                    {/* Quick View */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickViewProduct(product);
                            setQuickViewOpen(true);
                          }}
                          aria-label="Visualização rápida"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Quick View</TooltipContent>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Variant Picker Dialog — shared across all rows */}
      {variantPickerProduct && (
        <VariantPickerDialog
          open={variantPickerOpen}
          onOpenChange={setVariantPickerOpen}
          productId={variantPickerProduct.id}
          productName={variantPickerProduct.name}
          mode={variantPickerMode}
          onComplete={handleVariantComplete}
        />
      )}

      {/* Collection Modal */}
      {collectionProduct && (
        <AddToCollectionModal
          open={collectionModalOpen}
          onOpenChange={setCollectionModalOpen}
          productId={collectionProduct.id}
          productName={collectionProduct.name}
          variant={collectionVariant}
        />
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          isFavorited={isFavorite?.(quickViewProduct.id)}
          onToggleFavorite={onToggleFavorite}
          isInCompare={isInCompare?.(quickViewProduct.id)}
          onToggleCompare={onToggleCompare}
          onShare={onShareProduct}
        />
      )}

      {/* Share Preview Dialog */}
      {shareProduct && (
        <SharePreviewDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          product={shareProduct}
          selectedVariant={shareVariant}
        />
      )}
    </div>
  );
});
