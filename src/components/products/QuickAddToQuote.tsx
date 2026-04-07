import { useState } from "react";
import { Plus, Check, ShoppingCart, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";

interface QuickAddToQuoteProps {
  productId: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  productPrice?: number;
  minQuantity?: number;
  className?: string;
  variant?: "icon" | "button" | "badge";
  labelOverride?: string;
  iconOverride?: "cart" | "plus";
  buttonSize?: "default" | "sm" | "lg" | "xl" | "icon";
}

export function QuickAddToQuote({ 
  productId, 
  productName,
  productSku,
  productImageUrl,
  productPrice = 0,
  minQuantity = 1,
  className,
  variant = "button",
  labelOverride,
  iconOverride,
  buttonSize,
}: QuickAddToQuoteProps) {
...
        ) : (
          <Button
            size={buttonSize}
            className={cn("w-full gap-2 font-display !text-[0.875rem]", className)}
            onClick={(e) => e.stopPropagation()}
          >
            {iconOverride === "cart" ? <ShoppingCart className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {labelOverride || "Orçar"}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 relative" align="end" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button aria-label="Fechar"
          className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors z-10"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Step 1: Pick company if no active cart */}
        {showCompanyPicker && !activeCart ? (
          <CartCompanyPicker
            onCreated={handleCompanyCreated}
            onCancel={() => setIsOpen(false)}
          />
        ) : (
          /* Step 2: Add product to cart */
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1 pr-6">Adicionar ao carrinho</h4>
              <p className="text-xs text-muted-foreground line-clamp-1">{productName}</p>
              {activeCart && (
                <p className="text-[10px] text-primary mt-1 font-medium truncate">
                  → {activeCart.company_name}
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
        )}
      </PopoverContent>
    </Popover>
  );
}
