import { useState } from "react";
import { Plus, Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QuickAddToQuoteProps {
  productId: string;
  productName: string;
  minQuantity?: number;
  className?: string;
  variant?: "icon" | "button";
}

export function QuickAddToQuote({ 
  productId, 
  productName, 
  minQuantity = 1,
  className,
  variant = "button"
}: QuickAddToQuoteProps) {
  const [quantity, setQuantity] = useState(minQuantity);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToQuote = () => {
    // TODO: Integrar com contexto de orçamento
    setIsAdded(true);
    toast.success(`${productName} adicionado ao orçamento`, {
      description: `Quantidade: ${quantity} unidades`,
    });
    
    setTimeout(() => {
      setIsAdded(false);
      setIsOpen(false);
    }, 1500);
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
            <h4 className="font-medium text-sm mb-1">Adicionar ao orçamento</h4>
            <p className="text-xs text-muted-foreground line-clamp-1">{productName}</p>
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
            disabled={isAdded}
          >
            {isAdded ? (
              <>
                <Check className="h-4 w-4" />
                Adicionado!
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Adicionar ao Orçamento
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
