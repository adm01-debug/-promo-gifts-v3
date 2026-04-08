/**
 * ProductListItem — Layout horizontal compacto para modo lista do catálogo.
 *
 * 🎨 DESIGN STRATEGY (NÃO ALTERAR):
 * - Densidade: ~8-10 produtos visíveis por tela (vs ~3 no card vertical)
 * - Scan horizontal: thumb → info → preço/estoque → ações
 * - Thumb 64-80px contém o produto sem dominar o layout
 * - Ações de hover no desktop, sempre visíveis no mobile
 * - Altura fixa ~72-88px para virtualização consistente
 */
import { memo, useState, useCallback } from "react";
import { Heart, GitCompare, Share2, Package, Building2, FolderPlus } from "lucide-react";
import { getCdnUrl } from "@/utils/image-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { GenderBadge } from "./GenderBadge";
import { getSupplierColors } from "@/lib/supplier-colors";
import { resolveColorImage, resolveColorStock, getActiveColorName, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { showUndoToast, showErrorToast } from "@/utils/undoToast";
import { QuickAddToQuote } from "./QuickAddToQuote";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { VariantPickerDialog, type VariantActionMode } from "./VariantPickerDialog";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";

interface ProductListItemProps {
  product: Product;
  onClick?: () => void;
  onView?: (product: Product) => void;
  onShare?: (product: Product) => void;
  onFavorite?: (product: Product) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  highlightColors?: string[];
  activeColorFilter?: ActiveColorFilter | null;
}

export const ProductListItem = memo(function ProductListItem({
  product,
  onClick,
  onView,
  onShare,
  isFavorited = false,
  onToggleFavorite,
  isInCompare = false,
  onToggleCompare,
  canAddToCompare = true,
  highlightColors = [],
  activeColorFilter,
}: ProductListItemProps) {
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantPickerMode, setVariantPickerMode] = useState<VariantActionMode>('favorite');
  const favStore = useFavoritesStore();
  const compStore = useComparisonStore();

  const handleVariantComplete = useCallback((variant: ExternalVariantStock | null) => {
    const variantInfo = variant ? {
      color_name: variant.color_name,
      color_hex: variant.color_hex,
      size_code: variant.size_code,
      variant_id: variant.id,
      thumbnail: variant.selected_thumbnail,
    } : undefined;

    if (variantPickerMode === 'favorite') {
      favStore.addFavorite(product.id, variantInfo);
      toast.success(`"${product.name}" favoritado${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
    } else if (variantPickerMode === 'compare') {
      const result = compStore.addToCompare(product.id, variantInfo);
      if (!result) {
        showErrorToast({ title: "Limite de 4 produtos para comparação atingido" });
      } else {
        toast.success(`"${product.name}" adicionado à comparação${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
      }
    } else if (variantPickerMode === 'collection') {
      setCollectionModalOpen(true);
    }
  }, [variantPickerMode, product, favStore, compStore]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const getStockColor = (status: string) => {
    switch (status) {
      case "in-stock": return "text-emerald-400";
      case "low-stock": return "text-amber-400";
      case "out-of-stock": return "text-red-400";
      default: return "text-emerald-400";
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case "in-stock": return "Em estoque";
      case "low-stock": return "Estoque baixo";
      case "out-of-stock": return "Sem estoque";
      default: return "Em estoque";
    }
  };

  const handleClick = () => {
    if (onClick) onClick();
    else if (onView) onView(product);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorited) {
      if (onToggleFavorite) {
        onToggleFavorite(product.id);
        showUndoToast({
          title: `"${product.name}" removido dos favoritos`,
          onUndo: () => onToggleFavorite(product.id),
        });
      }
    } else {
      setVariantPickerMode('favorite');
      setVariantPickerOpen(true);
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInCompare) {
      if (onToggleCompare) {
        onToggleCompare(product.id);
        showUndoToast({
          title: `"${product.name}" removido da comparação`,
          onUndo: () => onToggleCompare(product.id),
        });
      }
    } else {
      setVariantPickerMode('compare');
      setVariantPickerOpen(true);
    }
  };

  const colorSpecificImage = resolveColorImage(product, activeColorFilter);
  const rawImageUrl = colorSpecificImage || product.og_image_url || product.images[0] || null;
  const thumbUrl = rawImageUrl ? getCdnUrl(rawImageUrl, "card") : "/placeholder.svg";

  const colorStock = resolveColorStock(product, activeColorFilter);
  const displayStock = colorStock?.stock ?? product.stock;
  const displayStatus = colorStock?.stockStatus ?? product.stockStatus;

  const hasColorMatch = highlightColors.length > 0 &&
    product.colors.some((c) => highlightColors.includes(c.group));

  return (
    <>
      <article
        className={cn(
          "group relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5",
          "rounded-xl bg-card border border-border/50 cursor-pointer",
          "transition-all duration-200 ease-out",
          "hover:border-primary/30 hover:bg-accent/30 hover:shadow-md",
          "active:scale-[0.997] touch-manipulation",
          hasColorMatch && "ring-2 ring-primary/20 border-primary/30"
        )}
        onClick={handleClick}
      >
        {/* Thumbnail — compact square */}
        <div className="relative shrink-0 w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-lg overflow-hidden bg-muted/30 border border-border/30">
          <img
            src={thumbUrl}
            alt={product.name}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = product.images[0] || "/placeholder.svg";
              }
            }}
          />
        </div>

        {/* Info — main content block */}
        <div className="flex-1 min-w-0 py-0.5">
          {/* Top meta row */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground mb-0.5">
            <span className="truncate max-w-[120px]">{product.category?.name || "Sem categoria"}</span>
            <span className="text-border">•</span>
            <span className={cn("flex items-center gap-0.5 shrink-0", getSupplierColors(product.supplier.name).text)}>
              <Building2 className="h-2.5 w-2.5" />
              <span className="truncate max-w-[80px]">{product.supplier.name}</span>
            </span>
            <GenderBadge gender={product.gender} size="sm" />
          </div>

          {/* Product name */}
          <h3 className="font-display font-semibold text-foreground text-sm sm:text-[15px] leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Stock + SKU row */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn("flex items-center gap-1 text-[10px] sm:text-xs font-medium", getStockColor(displayStatus))}>
              <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {getStockLabel(displayStatus)} ({displayStock.toLocaleString("pt-BR")})
            </span>
            {product.sku && (
              <span className="text-[10px] text-muted-foreground/50 font-mono hidden sm:inline">
                {product.sku}
              </span>
            )}
            {/* Inline color dots */}
            {product.colors.length > 0 && (
              <div className="hidden md:flex items-center gap-1 ml-1">
                {product.colors.slice(0, 5).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-3 h-3 rounded-full border border-border/50"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
                {product.colors.length > 5 && (
                  <span className="text-[9px] text-muted-foreground">+{product.colors.length - 5}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price column — right-aligned, always visible */}
        <div className="shrink-0 text-right min-w-[80px] sm:min-w-[100px]">
          <span className="text-base sm:text-lg font-display font-bold text-foreground whitespace-nowrap">
            {formatPrice(product.price)}
          </span>
        </div>

        {/* Quick actions — hover on desktop, always on mobile */}
        <div className={cn(
          "shrink-0 flex items-center gap-0.5",
          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
          "transition-opacity duration-200"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  isFavorited ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"
                )}
                onClick={handleFavorite}
                aria-label="Favoritar"
              >
                <Heart className={cn("h-3.5 w-3.5", isFavorited && "fill-current")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{isFavorited ? "Remover favorito" : "Favoritar"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-full", isInCompare ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}
                onClick={handleCompare}
                disabled={!isInCompare && !canAddToCompare}
                aria-label="Comparar"
              >
                <GitCompare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Comparar</TooltipContent>
          </Tooltip>

          <div className="hidden sm:flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onShare?.(product); }}
                  aria-label="Compartilhar"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Compartilhar</TooltipContent>
            </Tooltip>
          </div>

          <QuickAddToQuote
            productId={product.id}
            productName={product.name}
            productSku={product.sku}
            productImageUrl={product.og_image_url || product.images[0]}
            productPrice={product.price}
            minQuantity={product.minQuantity || 1}
            variant="icon"
            className="h-8 w-8"
          />
        </div>
      </article>

      <AddToCollectionModal
        open={collectionModalOpen}
        onOpenChange={setCollectionModalOpen}
        productId={product.id}
        productName={product.name}
      />
    </>
  );
});
