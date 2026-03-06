import React from "react";
import { Heart, Share2, Calculator, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MobileProductActionsProps {
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
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
    isFavorite,
    onToggleFavorite,
    onShare,
  }, ref) {
  productId,
  productName,
  productSku,
  productPrice,
  isFavorite,
  onToggleFavorite,
  onShare,
}: MobileProductActionsProps) {
  const navigate = useNavigate();

  const handleQuickQuote = () => {
    // Navigate to quote builder with product pre-selected
    navigate(`/orcamentos/novo?produto=${productId}`);
  };

  const handleSimulator = () => {
    navigate(`/simulador?produto=${productId}`);
  };

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
        >
          <Heart
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
        >
          <Share2 className="h-4 w-4" />
        </Button>

        {/* Simulator Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSimulator}
          className="h-10 rounded-full gap-1.5 text-xs px-3"
        >
          <Calculator className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Simular</span>
        </Button>

        {/* Main CTA - Quote */}
        <Button
          onClick={handleQuickQuote}
          className="flex-1 h-10 rounded-full gap-2 bg-orange hover:bg-orange-active text-orange-foreground font-medium text-sm"
        >
          <FileText className="h-4 w-4" />
          Orçar Produto
        </Button>
      </div>
    </div>
  );
  }
);
