import { useState } from "react";
import { Heart, Share2, Eye, Package, Layers, GitCompare, FolderPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductQuickView } from "./ProductQuickView";
import { ProductCategoryBadges } from "./ProductCategoryBadges";
import { NoveltyBadge } from "./NoveltyBadge";
import { showUndoToast, showErrorToast } from "@/utils/undoToast";

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
}

export function ProductCard({ 
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
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      const wasAlreadyFavorited = isFavorited;
      onToggleFavorite(product.id);
      
      if (wasAlreadyFavorited) {
        // Show undo toast when removing from favorites
        showUndoToast({
          title: `"${product.name}" removido dos favoritos`,
          onUndo: () => {
            onToggleFavorite(product.id);
          },
        });
      } else {
        toast.success(`"${product.name}" adicionado aos favoritos`);
      }
    } else {
      onFavorite?.(product);
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleCompare) {
      const wasInCompare = isInCompare;
      const result = onToggleCompare(product.id);
      
      if (result.isFull) {
        showErrorToast({ title: "Limite de 4 produtos para comparação atingido" });
      } else if (!result.added && wasInCompare) {
        // Show undo toast when removing from comparison
        showUndoToast({
          title: `"${product.name}" removido da comparação`,
          onUndo: () => {
            onToggleCompare(product.id);
          },
        });
      } else if (result.added) {
        toast.success(`"${product.name}" adicionado à comparação`);
      }
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

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 cursor-pointer card-lift",
        "transition-all duration-300 ease-out",
        "hover:border-primary/30 hover:shadow-xl",
        "active:scale-[0.98] active:transition-transform active:duration-100 touch-manipulation",
        product.featured && "ring-2 ring-primary/20 shadow-lg",
        hasHighlightedColor && "ring-2 ring-success/40 shadow-glow-success"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image container with gradient overlay */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-secondary/50 to-muted/30 z-0">
        {/* Skeleton loader with shimmer */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,hsl(var(--background)/0.4),transparent)] bg-[length:200%_100%] animate-shimmer" />
        )}
        
        <img
          src={product.images[0]}
          alt={product.name}
          className={cn(
            "w-full h-full object-cover transition-all duration-700 ease-out",
            "group-hover:scale-110",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />

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
          {product.onSale && (
            <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md animate-pulse">
              <span className="hidden sm:inline">Promoção</span>
              <span className="sm:hidden">%</span>
            </Badge>
          )}
          {product.isKit && (
            <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md">
              <Layers className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              KIT
            </Badge>
          )}
        </div>

        {/* Quick actions - Right Side - Always visible on mobile, hover on desktop */}
        <div
          className={cn(
            "absolute top-3 right-3 flex flex-col gap-2 z-10",
            "transition-all duration-300 ease-out",
            // Mobile: sempre visível; Desktop: hover
            "opacity-100 translate-x-0 md:opacity-0 md:translate-x-4",
            "md:group-hover:opacity-100 md:group-hover:translate-x-0"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50",
                  "hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200",
                  "min-h-[44px] min-w-[44px]",
                  isFavorited && "bg-destructive/10 border-destructive/30"
                )}
                onClick={handleFavorite}
                aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isFavorited && "fill-destructive text-destructive scale-110 animate-heart-fill"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50",
                  "hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200",
                  "min-h-[44px] min-w-[44px]",
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
                    "h-5 w-5 transition-all duration-300",
                    isInCompare && "text-primary scale-110"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isInCompare ? "Remover da comparação" : "Adicionar à comparação"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200 min-h-[44px] min-w-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollectionModalOpen(true);
                }}
                aria-label="Adicionar à coleção"
              >
                <FolderPlus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Adicionar à coleção</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 hover:shadow-xl transition-all duration-200 min-h-[44px] min-w-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(product);
                }}
                aria-label="Compartilhar produto"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Compartilhar</TooltipContent>
          </Tooltip>
        </div>

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

        {/* View button overlay on hover */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center z-10",
            "transition-all duration-400",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex gap-2">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full shadow-2xl bg-card/95 backdrop-blur-md hover:bg-card hover:scale-105 transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                setQuickViewOpen(true);
              }}
            >
              <Eye className="h-5 w-5 mr-2" />
              Quick View
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-2.5 sm:p-4 space-y-2 sm:space-y-3 bg-card">
        {/* Category Badges - Ícones das categorias (escondido em layouts compactos) */}
        {!hideCategoryBadges && (
          <ProductCategoryBadges 
            category={product.category} 
            groups={product.groups}
            className="flex-wrap"
          />
        )}
        
        {/* Supplier */}
        <div className="flex items-center justify-end">
          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium shrink-0">
            {product.supplier.name}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-foreground line-clamp-2 min-h-[2.25rem] sm:min-h-[2.75rem] text-sm sm:text-base leading-snug group-hover:text-primary transition-colors duration-300">
          {product.name}
        </h3>

        {/* Price & Stock */}
        <div className="flex items-end justify-between pt-0.5 sm:pt-1">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">A partir de</p>
            <span className="text-base sm:text-xl font-display font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5 sm:gap-1">
            <span className={cn("stock-indicator text-[10px] sm:text-xs", getStockStatusColor(product.stockStatus))}>
              <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline">{getStockStatusLabel(product.stockStatus)}</span>
              <span className="sm:hidden">{product.stockStatus === 'in-stock' ? '✓' : product.stockStatus === 'low-stock' ? '!' : '✗'}</span>
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {product.stock.toLocaleString('pt-BR')} un.
            </span>
          </div>
        </div>

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
      </div>

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
}
