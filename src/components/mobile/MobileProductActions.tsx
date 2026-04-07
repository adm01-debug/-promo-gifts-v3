import React from "react";
import { Heart, Share2, Calculator, FileText, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { QuickAddToQuote } from "@/components/products/QuickAddToQuote";

interface MobileProductActionsProps {
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  productImageUrl?: string;
  minQuantity?: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare?: () => void;
}

export const MobileProductActions = React.forwardRef<HTMLDivElement, MobileProductActionsProps>(
  function MobileProductActions({
    productId,
    productName,
    productSku,
    productPrice,
    productImageUrl,
    minQuantity = 1,
    isFavorite,
    onToggleFavorite,
    onShare,
  }, ref) {
  const navigate = useNavigate();

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else if (navigator.share) {
      navigator.share({
        title: productName,
        text: `Confira: ${productName} - ${productSku}`,
        url: window.location.href,
      });
    }
  };

  return (
    <div 
      ref={ref}
      className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Favorite Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleFavorite}
          className={cn(
            "h-10 w-10 shrink-0 rounded-full transition-colors",
            isFavorite && "bg-destructive/10 border-destructive/50 text-destructive"
          )}
         aria-label="Favoritar"><Heart
            className={cn(
              "h-4 w-4",
              isFavorite && "fill-current"
            )}
          />
        </Button>

        {/* Share Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          className="h-10 w-10 shrink-0 rounded-full"
         aria-label="Compartilhar"><Share2 className="h-4 w-4" />
        </Button>

        {/* Carrinho Button */}
        <QuickAddToQuote
          productId={productId}
          productName={productName}
          productSku={productSku}
          productImageUrl={productImageUrl}
          productPrice={productPrice}
          minQuantity={minQuantity}
          variant="button"
          buttonSize="default"
          labelOverride="Carrinho"
          iconOverride="cart"
          className="flex-1 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm"
        />

        {/* Orçamento Button */}
        <Button
          onClick={() => navigate(`/orcamentos/novo?product_id=${productId}&product_name=${encodeURIComponent(productName)}&product_sku=${encodeURIComponent(productSku || '')}&product_price=${productPrice}&product_image=${encodeURIComponent(productImageUrl || '')}&min_quantity=${minQuantity}`)}
          className="flex-1 h-10 rounded-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm"
        >
          <FileText className="h-4 w-4" />
          Orçamento
        </Button>
      </div>
    </div>
  );
  }
);
