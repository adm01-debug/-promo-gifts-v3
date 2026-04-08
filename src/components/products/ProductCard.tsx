import { useState, useRef, useEffect, memo, forwardRef, useCallback } from "react";
import { GenderBadge } from "./GenderBadge";
import { Heart, Share2, Eye, Package, Layers, GitCompare, FolderPlus, Sparkles, Building2, ShoppingCart, Plus, X, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCdnUrl, getSrcSet } from "@/utils/image-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { QuickAddToQuote } from "./QuickAddToQuote";
import { ProductQuickView } from "./ProductQuickView";
import { ProductCategoryBadges } from "./ProductCategoryBadges";
import { NoveltyBadge } from "./NoveltyBadge";
import { showUndoToast, showErrorToast } from "@/utils/undoToast";
import { getSupplierColors } from "@/lib/supplier-colors";
import { resolveColorImage, resolveColorStock, getActiveColorName, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { useProductBounds } from "@/hooks/useProductBounds";
import { ProductSparkline } from "./ProductSparkline";
import { VariantPickerDialog, type VariantActionMode } from "./VariantPickerDialog";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
export interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onView?: (product: Product) => void;
  onShare?: (product: Product) => void;
  onFavorite?: (product: Product) => void;
  highlightColors?: string[];
  isFavorited?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  /** Esconder badges de categoria (útil em layouts compactos de grid) */
  hideCategoryBadges?: boolean;
  /** Se o produto é uma novidade (opcional - se não passar, não mostra o badge) */
  isNovelty?: boolean;
  /** Dias restantes como novidade (para mostrar no badge) */
  noveltyDaysRemaining?: number;
  /** Filtros de cor ativos - quando presente, o card mostra a imagem da cor filtrada */
  activeColorFilter?: ActiveColorFilter | null;
}

export const ProductCard = memo(forwardRef<HTMLElement, ProductCardProps>(function ProductCard({ 
  product, 
  onClick, 
  onView, 
  onShare, 
  onFavorite, 
  highlightColors,
  isFavorited = false,
  onToggleFavorite,
  isInCompare = false,
  onToggleCompare,
  canAddToCompare = true,
  hideCategoryBadges = false,
  isNovelty = false,
  noveltyDaysRemaining,
  activeColorFilter,
}, ref) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionBusyRef = useRef(false);

  // Variant picker state for favorite/compare/collection
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
    } else if (variantPickerMode === 'quote') {
      const params = new URLSearchParams({ productId: product.id });
      if (variant?.color_name) params.set('color_name', variant.color_name);
      if (variant?.color_hex) params.set('color_hex', variant.color_hex);
      if (variant?.selected_thumbnail) params.set('product_image', variant.selected_thumbnail);
      // Delay navigation to avoid Radix Dialog close event propagating to card onClick
      setTimeout(() => navigate(`/orcamentos/novo?${params.toString()}`), 0);
    }
  }, [variantPickerMode, product, favStore, compStore, navigate]);

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'in-stock';
      case 'low-stock':
        return 'low-stock';
      case 'out-of-stock':
        return 'out-of-stock';
      default:
        return 'in-stock';
    }
  };

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'Em estoque';
      case 'low-stock':
        return 'Estoque baixo';
      case 'out-of-stock':
        return 'Sem estoque';
      default:
        return 'Em estoque';
    }
  };

  const hasHighlightedColor = highlightColors?.some(group =>
    product.colors.some(color => color.group === group)
  );

  const colorSpecificImage = resolveColorImage(product, activeColorFilter);
  const rawImageUrl = colorSpecificImage || product.og_image_url || product.images[0] || null;
  const cardImageUrl = rawImageUrl ? getCdnUrl(rawImageUrl, "card") : "/placeholder.svg";
  const cardSrcSet = colorSpecificImage ? undefined : (rawImageUrl ? getSrcSet(rawImageUrl) : undefined);
  const activeColorName = getActiveColorName(product, activeColorFilter);

  const imageBounds = useProductBounds(cardImageUrl !== "/placeholder.svg" ? cardImageUrl : null, {
    whiteThreshold: 230,
    margin: 0.01,
    maxSize: 384,
  });

  const isOversizedImage = imageBounds.detected && imageBounds.fractionX >= 0.86 && imageBounds.fractionY >= 0.86;
  const baseImageScale = isOversizedImage ? 0.88 : 1;
  const hoverScale = isHovered ? 1.03 : 1;
  const computedImageScale = Number((baseImageScale * hoverScale).toFixed(3));

  return (
    <article
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 cursor-pointer card-lift",
        "transition-all duration-300 ease-out",
        "hover:border-primary/30 hover:shadow-xl",
        "active:scale-[0.98] active:transition-transform active:duration-100 touch-manipulation",
        product.featured && "ring-2 ring-primary/20 shadow-lg",
        hasHighlightedColor && "ring-2 ring-success/40 shadow-glow-success"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActionsOpen(false);
      }}
      onClick={(e) => {
        // Block card navigation when FAB actions are open or a dialog was just used
        if (actionsOpen || actionBusyRef.current || variantPickerOpen || collectionModalOpen || quickViewOpen) {
          e.stopPropagation();
          return;
        }
        onClick?.();
      }}
    >
      {/* Image container with gradient overlay - isolated stacking context */}
      <div className="relative aspect-[4/5] overflow-hidden product-img-container bg-muted/30" style={{ zIndex: 0 }}>
        {/* Blur-to-sharp: imagem começa borrada e fica nítida ao carregar */}
        <>
          <img
            src={cardImageUrl}
            srcSet={cardSrcSet}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            alt={activeColorName ? `${product.name} - ${activeColorName}` : product.name}
            title={activeColorName ? `${product.name} - ${activeColorName}` : product.name}
            className={cn(
              "w-full h-full object-contain transition-all duration-700 ease-out",
              imageLoaded
                ? "opacity-100 blur-0 scale-100"
                : "opacity-40 blur-md scale-105"
            )}
            style={imageLoaded ? { transform: `scale(${computedImageScale})` } : undefined}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallback) {
                img.dataset.fallback = '1';
                img.srcset = '';
                img.src = product.images[0] || '/placeholder.svg';
              }
            }}
          />
          {/* Badge indicando cor filtrada */}
          {activeColorName && colorSpecificImage && (
            <div className="absolute top-2 right-2 z-10 sm:hidden">
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0.5 bg-card/90 backdrop-blur-sm shadow-sm"
              >
                {activeColorName}
              </Badge>
            </div>
          )}
        </>

        {/* Gradient overlay on hover */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent",
            "transition-opacity duration-500",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Featured glow effect */}
        {product.featured && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        )}

        {/* Badges - Top Left */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-1.5 z-10">
          {product.featured && (
            <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-lg animate-glow-pulse">
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline">Destaque</span>
              <span className="sm:hidden">★</span>
            </Badge>
          )}
          {/* Badge de novidade: prioriza isNovelty com dias, senão usa newArrival */}
          {isNovelty && noveltyDaysRemaining !== undefined ? (
            <NoveltyBadge daysRemaining={noveltyDaysRemaining} size="sm" />
          ) : product.newArrival && (
            <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md">
              <span className="hidden sm:inline">Novidade</span>
              <span className="sm:hidden">Novo</span>
            </Badge>
          )}
          {product.isKit && (
            <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md">
              <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline">Kit</span>
              <span className="sm:hidden">Kit</span>
            </Badge>
          )}
          {product.onSale && (
            <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md animate-pulse">
              <span className="hidden sm:inline">Promoção</span>
              <span className="sm:hidden">%</span>
            </Badge>
          )}
        </div>


        {/* Colors and gradient remain inside overflow-hidden, actions moved outside */}

        {/* Color variations - Bottom */}
        {product.colors.length > 0 && (
          <div
            className={cn(
              "absolute bottom-3 left-3 right-3 z-10",
              "transition-all duration-400 ease-out",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md rounded-full px-3 py-2 shadow-lg border border-border/50">
              {product.colors.slice(0, 6).map((color, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 shadow-sm cursor-pointer",
                        "transition-all duration-200 hover:scale-125 hover:shadow-md",
                        highlightColors?.includes(color.group) 
                          ? "border-success ring-2 ring-success/30 scale-110" 
                          : "border-border/50"
                      )}
                      style={{ 
                        backgroundColor: color.hex,
                        borderColor: color.hex === '#FFFFFF' ? 'hsl(var(--border))' : undefined
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{color.name}</TooltipContent>
                </Tooltip>
              ))}
              {product.colors.length > 6 && (
                <span className="text-xs font-medium text-muted-foreground ml-1">
                  +{product.colors.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Quick actions FAB - OUTSIDE overflow-hidden container */}
      <div
        ref={actionsRef}
        className={cn(
          "absolute top-3 right-3 flex flex-col items-end gap-2 z-30",
          "transition-all duration-300 ease-out",
          // Only show on hover (desktop)
          "opacity-100 translate-x-0 md:opacity-0 md:translate-x-4",
          "md:group-hover:opacity-100 md:group-hover:translate-x-0",
        )}
      >
        {/* Main FAB "+" button */}
        <button
          className={cn(
            "flex items-center justify-center h-9 w-9 md:h-11 md:w-11 rounded-full shadow-lg",
            "transition-all duration-300 ease-out",
            "min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            actionsOpen
              ? "bg-muted text-muted-foreground rotate-45"
              : "bg-orange/60 text-orange-foreground hover:bg-orange/80"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setActionsOpen(!actionsOpen);
          }}
          aria-label={actionsOpen ? "Fechar ações" : "Ações rápidas"}
          aria-expanded={actionsOpen}
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-200" />
        </button>

        {/* Expanded actions - grow downward */}
        <div
          className={cn(
            "flex flex-col gap-2 transition-all duration-300 ease-out origin-top",
            actionsOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-75 -translate-y-4 pointer-events-none"
          )}
        >
          {/* Favorite */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50",
                  "hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200",
                  "min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]",
                  isFavorited && "bg-destructive/10 border-destructive/30"
                )}
                onClick={handleFavorite}
                aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 md:h-5 md:w-5 transition-all duration-300",
                    isFavorited && "fill-destructive text-destructive scale-110 animate-heart-fill"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}</TooltipContent>
          </Tooltip>

          {/* Compare */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50",
                  "hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200",
                  "min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]",
                  isInCompare && "bg-primary/10 border-primary/30"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCompare(e);
                }}
                disabled={!isInCompare && !canAddToCompare}
                aria-label={isInCompare ? "Remover da comparação" : "Adicionar à comparação"}
              >
                <GitCompare
                  className={cn(
                    "h-4 w-4 md:h-5 md:w-5 transition-all duration-300",
                    isInCompare && "text-primary scale-110"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isInCompare ? "Remover da comparação" : "Adicionar à comparação"}
            </TooltipContent>
          </Tooltip>

          {/* Collection */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200 min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setVariantPickerMode('collection');
                  setVariantPickerOpen(true);
                }}
                aria-label="Adicionar à coleção"
              >
                <FolderPlus className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Adicionar à coleção</TooltipContent>
          </Tooltip>

          {/* Share */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200 min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  actionBusyRef.current = true;
                  setTimeout(() => { actionBusyRef.current = false; }, 500);
                  onShare?.(product);
                }}
                aria-label="Compartilhar produto"
              >
                <Share2 className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Compartilhar</TooltipContent>
          </Tooltip>

          {/* Orçamento */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200 min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setVariantPickerMode('quote');
                  setVariantPickerOpen(true);
                }}
                aria-label="Criar orçamento"
              >
                <FileText className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Orçamento</TooltipContent>
          </Tooltip>

          {/* Add to Cart */}
          <QuickAddToQuote
            productId={product.id}
            productName={product.name}
            productSku={product.sku}
            productImageUrl={product.og_image_url || product.images[0]}
            productPrice={product.price}
            minQuantity={product.minQuantity || 1}
            variant="icon"
            className="h-9 w-9 md:h-11 md:w-11 min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]"
          />

          {/* Quick View */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200 min-h-[36px] min-w-[36px] md:min-h-[44px] md:min-w-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickViewOpen(true);
                }}
                aria-label="Visualização rápida"
              >
                <Eye className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Quick View</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="relative p-2.5 sm:p-4 space-y-2 sm:space-y-3 bg-card" style={{ zIndex: 10 }}>
        {/* Category Badges - Ícones das categorias (escondido em layouts compactos) */}
        {!hideCategoryBadges && (
          <ProductCategoryBadges 
            category={product.category} 
            groups={product.groups}
            categoryUuid={product.category_id}
            className="flex-wrap"
          />
        )}
        
        {/* SKU & Supplier & Gender */}
        <div className="flex items-center justify-between gap-2">
          {/* SKU/Código do produto */}
          <span className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">
            {product.sku}
          </span>
          
          <div className="flex items-center gap-1 shrink-0">
            {/* Gender badge */}
            <GenderBadge gender={product.gender} size="sm" />
            {/* Nome do fornecedor - badge neutro */}
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium truncate max-w-[120px] flex items-center gap-1">
              <Building2 className={cn("h-3 w-3 shrink-0", getSupplierColors(product.supplier.name).text)} />
              {product.supplier.name}
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-foreground line-clamp-2 min-h-[2.25rem] sm:min-h-[2.75rem] text-sm sm:text-base leading-snug group-hover:text-primary transition-colors duration-300">
          {product.name}
        </h3>

        {/* Price & Stock */}
        {(() => {
          const colorStock = resolveColorStock(product, activeColorFilter);
          const displayStock = colorStock?.stock ?? product.stock;
          const displayStatus = colorStock?.stockStatus ?? product.stockStatus;
          return (
          <div className="flex items-end justify-between pt-0.5 sm:pt-1">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">A partir de</p>
            <span className="text-base sm:text-xl font-display font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5 sm:gap-1">
            <span className={cn("stock-indicator text-[10px] sm:text-xs", getStockStatusColor(displayStatus))}>
              <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline">{getStockStatusLabel(displayStatus)}</span>
              <span className="sm:hidden">{displayStatus === 'in-stock' ? '✓' : displayStatus === 'low-stock' ? '!' : '✗'}</span>
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {displayStock.toLocaleString('pt-BR')} un.
            </span>
          </div>
          </div>
          );
        })()}

        {/* Materials - Hidden on mobile */}
        {Array.isArray(product.materials) && product.materials.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
            {product.materials.slice(0, 2).map((material) => (
              <span
                key={material}
                className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium"
              >
                {material}
              </span>
            ))}
            {product.materials.length > 2 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">
                +{product.materials.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Sales Sparkline */}
        <div className="pt-1.5 sm:pt-2 border-t border-border/30">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Vendas 30d
            </span>
          </div>
          <ProductSparkline productId={product.id} />
        </div>
      </div>

      {/* Variant Picker Dialog for favorite/compare/collection */}
      <VariantPickerDialog
        open={variantPickerOpen}
        onOpenChange={setVariantPickerOpen}
        productId={product.id}
        productName={product.name}
        mode={variantPickerMode}
        onComplete={handleVariantComplete}
      />

      {/* Collection Modal */}
      <AddToCollectionModal
        open={collectionModalOpen}
        onOpenChange={setCollectionModalOpen}
        productId={product.id}
        productName={product.name}
      />

      {/* Quick View Modal */}
      <ProductQuickView
        product={product}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        isInCompare={isInCompare}
        onToggleCompare={onToggleCompare}
        onShare={onShare}
      />
    </article>
  );
}));

ProductCard.displayName = 'ProductCard';
