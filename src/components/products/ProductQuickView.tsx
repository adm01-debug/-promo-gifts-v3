import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  GitCompare,
  Share2,
  ShoppingCart,
  Package,
  Truck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
  Plus,
  Minus,
  Ruler,
  Weight,
  ImageOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@/components/a11y/VisuallyHidden";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { ProductCategoryBadges } from "./ProductCategoryBadges";
import { ProductColorSelector, type ProductColor } from "./ProductColorSelector";
import { sortByColorGroup } from "@/utils/colorSorting";
import { toast } from "sonner";

interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  onShare?: (product: Product) => void;
}

export function ProductQuickView({
  product,
  open,
  onOpenChange,
  isFavorited = false,
  onToggleFavorite,
  isInCompare = false,
  onToggleCompare,
  onShare,
}: ProductQuickViewProps) {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Early return if product is null
  if (!product) return null;
  
  // Mapear cores do produto para o formato do seletor com ordenação padronizada
  const sortedColors = sortByColorGroup(
    product.colors || [],
    (color) => color.name || '',
    (color) => color.hex
  );
  const productColors: ProductColor[] = sortedColors.map((color, idx) => ({
    id: `${product.id}-color-${idx}`,
    name: color.name,
    hex: color.hex,
    variationName: color.name,
    groupName: color.group,
  }));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getStockStatusInfo = (status: string) => {
    switch (status) {
      case "in-stock":
        return { label: "Em estoque", color: "text-success", bg: "bg-success/10" };
      case "low-stock":
        return { label: "Estoque baixo", color: "text-warning", bg: "bg-warning/10" };
      case "out-of-stock":
        return { label: "Sem estoque", color: "text-destructive", bg: "bg-destructive/10" };
      default:
        return { label: "Em estoque", color: "text-success", bg: "bg-success/10" };
    }
  };

  const stockInfo = getStockStatusInfo(product.stockStatus);

  const handlePrevImage = () => {
    setImageLoaded(false);
    setImageError(false);
    setCurrentImageIndex((prev) =>
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setImageLoaded(false);
    setImageError(false);
    setCurrentImageIndex((prev) =>
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
      toast.success(
        isFavorited
          ? `"${product.name}" removido dos favoritos`
          : `"${product.name}" adicionado aos favoritos`
      );
    }
  };

  const handleCompare = () => {
    if (onToggleCompare) {
      const result = onToggleCompare(product.id);
      if (result.isFull) {
        toast.error("Limite de 4 produtos para comparação atingido");
      } else {
        toast.success(
          result.added
            ? `"${product.name}" adicionado à comparação`
            : `"${product.name}" removido da comparação`
        );
      }
    }
  };

  const handleViewDetails = () => {
    onOpenChange(false);
    navigate(`/produto/${product.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border gap-0">
        <VisuallyHidden>
          <DialogTitle>Visualização rápida: {product.name}</DialogTitle>
        </VisuallyHidden>
        
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Gallery */}
          <div className="relative bg-gradient-to-br from-secondary/30 to-muted/20 aspect-square md:aspect-auto md:min-h-[500px]">
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {product.featured && (
                <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Destaque
                </Badge>
              )}
              {product.newArrival && (
                <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground shadow-md">
                  Novidade
                </Badge>
              )}
              {product.isKit && (
                <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground shadow-md">
                  <Layers className="h-3 w-3 mr-1" />
                  KIT
                </Badge>
              )}
            </div>

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Loading skeleton */}
              {!imageLoaded && !imageError && product.images[currentImageIndex] && product.images[currentImageIndex] !== '/placeholder.svg' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
                </div>
              )}
              
              {/* Placeholder/Error state */}
              {(imageError || !product.images[currentImageIndex] || product.images[currentImageIndex] === '/placeholder.svg') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                  <ImageOff className="h-16 w-16 mb-2 opacity-50" />
                  <p className="text-sm">Imagem não disponível</p>
                </div>
              )}
              
              {product.images[currentImageIndex] && product.images[currentImageIndex] !== '/placeholder.svg' && (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={product.images[currentImageIndex]}
                    alt={`${product.name} - Imagem ${currentImageIndex + 1}`}
                    className={cn(
                      "w-full h-full object-contain p-8 transition-opacity duration-300",
                      imageLoaded ? "opacity-100" : "opacity-0"
                    )}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    onLoad={() => {
                      setImageLoaded(true);
                      setImageError(false);
                    }}
                    onError={() => {
                      setImageError(true);
                      setImageLoaded(false);
                    }}
                  />
                </AnimatePresence>
              )}
            </div>

            {/* Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg hover:bg-card"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg hover:bg-card"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Thumbnail dots */}
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {product.images.map((_, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all duration-200",
                      idx === currentImageIndex
                        ? "bg-primary scale-110"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-6 flex flex-col">
            {/* Header */}
            <div className="space-y-3">
              {/* Category Badges - Ícones das categorias */}
              <ProductCategoryBadges 
                category={product.category} 
                groups={product.groups}
              />
              
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                  {product.supplier.name}
                </span>
              </div>

              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">
                {product.name}
              </h2>

              <p className="text-sm text-muted-foreground">
                SKU: {product.sku}
              </p>
            </div>

            <Separator className="my-4" />

            {/* Price & Stock */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">A partir de</p>
                <span className="text-3xl font-display font-bold text-foreground">
                  {formatPrice(product.price)}
                </span>
              </div>
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", stockInfo.bg)}>
                <Package className={cn("h-4 w-4", stockInfo.color)} />
                <span className={cn("text-sm font-medium", stockInfo.color)}>
                  {stockInfo.label}
                </span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Colors - Usando o novo sistema hierárquico */}
            {productColors.length > 0 && (
              <ProductColorSelector
                colors={productColors}
                selectedColorId={selectedColorId}
                onColorSelect={(color) => setSelectedColorId(color.id || null)}
                maxVisible={8}
                size="md"
              />
            )}

            {/* Dimensions & Weight - Compact grid */}
            {(product.dimensions || product.weight) && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {product.dimensions?.width && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Larg:</span>
                    <span className="text-xs font-medium">{product.dimensions.width}cm</span>
                  </div>
                )}
                {product.dimensions?.height && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Alt:</span>
                    <span className="text-xs font-medium">{product.dimensions.height}cm</span>
                  </div>
                )}
                {product.dimensions?.length && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Prof:</span>
                    <span className="text-xs font-medium">{product.dimensions.length}cm</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Weight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Peso:</span>
                    <span className="text-xs font-medium">{product.weight >= 1000 ? `${(product.weight / 1000).toFixed(1)}kg` : `${product.weight}g`}</span>
                  </div>
                )}
              </div>
            )}

            {/* Materials */}
            {Array.isArray(product.materials) && product.materials.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Materiais</p>
                <div className="flex flex-wrap gap-2">
                  {product.materials.map((material) => (
                    <span
                      key={material}
                      className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium"
                    >
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Quantidade</p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  = {formatPrice(product.price * quantity)}
                </span>
              </div>
            </div>

            {/* Delivery info */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Entrega estimada</p>
                <p className="text-muted-foreground">3-5 dias úteis após aprovação</p>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1 min-h-4" />

            {/* Actions */}
            <div className="space-y-3 mt-4">
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-11 w-11",
                        isFavorited && "bg-destructive/10 border-destructive/30 text-destructive"
                      )}
                      onClick={handleFavorite}
                    >
                      <Heart className={cn("h-5 w-5", isFavorited && "fill-current")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-11 w-11",
                        isInCompare && "bg-primary/10 border-primary/30 text-primary"
                      )}
                      onClick={handleCompare}
                    >
                      <GitCompare className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isInCompare ? "Remover da comparação" : "Adicionar à comparação"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11"
                      onClick={() => onShare?.(product)}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compartilhar</TooltipContent>
                </Tooltip>

                <Button
                  variant="orange"
                  className="flex-1 h-11"
                  onClick={() => {
                    toast.success(`${quantity}x "${product.name}" adicionado ao orçamento`);
                  }}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Adicionar ao Orçamento
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleViewDetails}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Detalhes Completos
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
