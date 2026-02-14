import { useState } from "react";
import { Plus, Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSellerCartContext } from "@/contexts/SellerCartContext";

interface QuickAddToQuoteProps {
  productId: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  productPrice?: number;
  minQuantity?: number;
  className?: string;
  variant?: "icon" | "button";
}

export function QuickAddToQuote({ 
  productId, 
  productName,
  productSku,
  productImageUrl,
  productPrice = 0,
  minQuantity = 1,
  className,
  variant = "button"
}: QuickAddToQuoteProps) {
  const [quantity, setQuantity] = useState(minQuantity);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { activeCart, addToActiveCart } = useSellerCartContext();

  const handleAddToQuote = () => {
    addToActiveCart({
      product_id: productId,
      product_name: productName,
      product_sku: productSku,
      product_image_url: productImageUrl,
      product_price: productPrice,
      quantity,
    });
    
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      setIsOpen(false);
      setQuantity(minQuantity);
    }, 1200);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50",
              "hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all duration-200",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Adicionar ao carrinho</h4>
            <p className="text-xs text-muted-foreground line-clamp-1">{productName}</p>
            {activeCart && (
              <p className="text-[10px] text-primary mt-1 font-medium truncate">
                → {activeCart.company_name}
              </p>
            )}
            {!activeCart && (
              <p className="text-[10px] text-destructive mt-1">
                Nenhum carrinho ativo
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Quantidade</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(minQuantity, quantity - 10))}
              >
                -
              </Button>
              <Input
                type="number"
                min={minQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(minQuantity, parseInt(e.target.value) || minQuantity))}
                className="h-8 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(quantity + 10)}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo: {minQuantity} un.</p>
          </div>
          
          <Button
            className="w-full gap-2"
            onClick={handleAddToQuote}
            disabled={isAdded || !activeCart}
          >
            {isAdded ? (
              <>
                <Check className="h-4 w-4" />
                Adicionado!
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Adicionar ao Carrinho
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
