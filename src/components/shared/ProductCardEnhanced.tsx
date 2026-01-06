import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Heart, Share2, Eye, ShoppingCart, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PriceDisplay } from "./PricingComponents";

interface ProductCardEnhancedProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  category?: string;
  stock?: number;
  stockStatus?: "in-stock" | "low-stock" | "out-of-stock";
  isNew?: boolean;
  isFeatured?: boolean;
  isKit?: boolean;
  isFavorite?: boolean;
  isInCart?: boolean;
  tags?: string[];
  colors?: { name: string; hex: string }[];
  onView?: () => void;
  onAddToCart?: () => void;
  onToggleFavorite?: () => void;
  onShare?: () => void;
  onQuickView?: () => void;
  className?: string;
}

export function ProductCardEnhanced({
  id,
  name,
  description,
  price,
  originalPrice,
  image,
  images,
  category,
  stock,
  stockStatus = "in-stock",
  isNew,
  isFeatured,
  isKit,
  isFavorite,
  isInCart,
  tags,
  colors,
  onView,
  onAddToCart,
  onToggleFavorite,
  onShare,
  onQuickView,
  className,
}: ProductCardEnhancedProps) {
  const displayImage = image || images?.[0];

  const stockConfig = {
    "in-stock": { label: "Em estoque", color: "text-success", bg: "bg-success/10" },
    "low-stock": { label: "Últimas unidades", color: "text-warning", bg: "bg-warning/10" },
    "out-of-stock": { label: "Esgotado", color: "text-destructive", bg: "bg-destructive/10" },
  };

  const stockInfo = stockConfig[stockStatus];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden transition-all",
        "hover:shadow-lg hover:border-primary/20",
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {displayImage ? (
          <img
            src={displayImage}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isNew && (
            <Badge className="bg-primary text-primary-foreground">Novo</Badge>
          )}
          {isFeatured && (
            <Badge className="bg-warning text-warning-foreground">Destaque</Badge>
          )}
          {isKit && (
            <Badge variant="secondary">Kit</Badge>
          )}
          {originalPrice && originalPrice > price && (
            <Badge className="bg-success text-success-foreground">
              -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            {onToggleFavorite && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite();
                    }}
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4",
                        isFavorite ? "fill-destructive text-destructive" : ""
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                </TooltipContent>
              </Tooltip>
            )}
            {onShare && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare();
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compartilhar</TooltipContent>
              </Tooltip>
            )}
            {onQuickView && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickView();
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualização rápida</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        {/* Quick add to cart overlay */}
        {onAddToCart && stockStatus !== "out-of-stock" && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
            >
              {isInCart ? (
                <>
                  <Check className="w-4 h-4" />
                  No carrinho
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3" onClick={onView}>
        {/* Category */}
        {category && (
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {category}
          </span>
        )}

        {/* Name */}
        <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Colors */}
        {colors && colors.length > 0 && (
          <div className="flex items-center gap-1">
            {colors.slice(0, 5).map((color, idx) => (
              <div
                key={idx}
                className="w-4 h-4 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            {colors.length > 5 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{colors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Price and Stock */}
        <div className="flex items-end justify-between gap-2">
          <PriceDisplay price={price} originalPrice={originalPrice} size="sm" />
          <span className={cn("text-xs font-medium", stockInfo.color)}>
            {stock !== undefined ? `${stock} un.` : stockInfo.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
