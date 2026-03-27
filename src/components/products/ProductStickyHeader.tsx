import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Heart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddToQuote } from "./QuickAddToQuote";
import { cn } from "@/lib/utils";

interface ProductStickyHeaderProps {
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  productImage: string;
  minQuantity: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function ProductStickyHeader({
  productId,
  productName,
  productSku,
  productPrice,
  productImage,
  minQuantity,
  isFavorite,
  onToggleFavorite,
}: ProductStickyHeaderProps) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 hidden md:block bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center gap-4">
            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border">
              <img
                src={productImage}
                alt={productName}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Name */}
            <h2 className="text-sm font-semibold text-foreground truncate max-w-[300px] lg:max-w-[500px]">
              {productName}
            </h2>

            {/* Price */}
            <span className="text-sm font-bold text-foreground whitespace-nowrap ml-auto">
              {formatPrice(productPrice)}<span className="text-muted-foreground font-normal">/un</span>
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={onToggleFavorite}
              >
                <Heart className={cn("h-4 w-4", isFavorite && "fill-destructive text-destructive")} />
              </Button>

              <QuickAddToQuote
                productId={productId}
                productName={productName}
                productSku={productSku}
                productPrice={productPrice}
                minQuantity={minQuantity}
                variant="button"
                labelOverride="Carrinho"
                iconOverride="cart"
                className="h-9 rounded-full px-5 bg-orange hover:bg-orange-active text-orange-foreground font-medium text-sm"
              />

              <Button
                size="sm"
                className="h-9 rounded-full px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm gap-1.5"
                onClick={() => navigate(`/orcamentos/novo?product_id=${productId}&product_name=${encodeURIComponent(productName)}&product_sku=${encodeURIComponent(productSku || '')}&product_price=${productPrice}&product_image=${encodeURIComponent(productImage || '')}`)}
              >
                <FileText className="h-3.5 w-3.5" />
                Orçamento
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
