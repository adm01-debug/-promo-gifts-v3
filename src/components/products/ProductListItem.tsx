import { useState } from "react";
import { Heart, Eye, Share2, Scale, Package, Star, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { resolveColorImage, resolveColorStock, getActiveColorName, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { getCdnUrl } from "@/utils/image-utils";

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

export function ProductListItem({
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const stockConfig = {
    'in-stock': { label: 'Em estoque', class: 'bg-success/10 text-success border-success/20' },
    'low-stock': { label: 'Estoque baixo', class: 'bg-warning/10 text-warning border-warning/20' },
    'out-of-stock': { label: 'Sem estoque', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  const stock = stockConfig[product.stockStatus];

  const hasColorMatch = highlightColors.length > 0 && 
    product.colors.some(c => highlightColors.includes(c.group));

  const handleClick = () => {
    if (onClick) onClick();
    else if (onView) onView(product);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompare?.(product.id);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(product);
  };

  return (
    <div
      className={cn(
        "group relative flex gap-4 p-4 rounded-xl bg-card border border-border/50",
        "transition-all duration-300 ease-out cursor-pointer",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        hasColorMatch && "ring-2 ring-primary/20 border-primary/30"
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden product-img-container shrink-0">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
        )}
        {(() => {
          const colorImg = resolveColorImage(product, activeColorFilter);
          const rawUrl = colorImg || product.images[0];
          const imgUrl = rawUrl ? getCdnUrl(rawUrl, 'card') : '/placeholder.svg';
          return (
            <img
              src={imgUrl}
              alt={product.name}
              className={cn(
                "w-full h-full object-cover transition-all duration-700 ease-out",
                imageLoaded ? "opacity-100 blur-0 scale-100" : "opacity-40 blur-md scale-105",
                isHovered && "scale-110"
              )}
              onLoad={() => setImageLoaded(true)}
            />
          );
        })()}
        
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.newArrival && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              Novo
            </Badge>
          )}
          {product.featured && (
            <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5 py-0.5">
              <Star className="h-2.5 w-2.5 mr-0.5" />
              Destaque
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div className="space-y-2">
          {/* Category & Supplier */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{product.category.name}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span>{product.supplier.name}</span>
          </div>

          {/* Name */}
          <h3 className="font-display font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {product.colors.slice(0, 6).map((color, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-transform",
                  highlightColors.includes(color.group)
                    ? "border-primary scale-110 ring-2 ring-primary/30"
                    : "border-background"
                )}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            {product.colors.length > 6 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{product.colors.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Bottom row */}
        {(() => {
          const colorStock = resolveColorStock(product, activeColorFilter);
          const displayStock = colorStock?.stock ?? product.stock;
          const displayStatus = colorStock?.stockStatus ?? product.stockStatus;
          const stockCfg = stockConfig[displayStatus];
          return (
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", stockCfg.class)}>
              <Package className="h-2.5 w-2.5 mr-1" />
              {stockCfg.label} ({displayStock.toLocaleString('pt-BR')})
            </Badge>

            <div className="text-right">
              <span className="font-display font-bold text-lg text-foreground">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center justify-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full transition-all",
            isFavorited 
              ? "text-destructive bg-destructive/10 hover:bg-destructive/20" 
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          )}
          onClick={handleFavoriteClick}
         aria-label="Favoritar"><Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full transition-all",
            isInCompare 
              ? "text-primary bg-primary/10 hover:bg-primary/20" 
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          )}
          onClick={handleCompareClick}
          disabled={!canAddToCompare && !isInCompare}
         aria-label="Scale"><Scale className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={handleShareClick}
         aria-label="Compartilhar"><Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Arrow indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}