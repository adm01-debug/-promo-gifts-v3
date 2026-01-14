import { Check, Award, Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface QuantityOption {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isOptimal?: boolean;
  isBestValue?: boolean;
  savings?: number;
}

interface OptimalQuantityHighlightProps {
  options: QuantityOption[];
  selectedQuantity?: number;
  onSelectQuantity?: (quantity: number) => void;
  className?: string;
}

export function OptimalQuantityHighlight({
  options,
  selectedQuantity,
  onSelectQuantity,
  className,
}: OptimalQuantityHighlightProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
      {options.map((option) => (
        <Tooltip key={option.quantity}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSelectQuantity?.(option.quantity)}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                "hover:shadow-md hover:scale-[1.02]",
                option.isOptimal && "border-success bg-success/5 shadow-lg shadow-success/10",
                option.isBestValue && !option.isOptimal && "border-primary bg-primary/5",
                !option.isOptimal && !option.isBestValue && "border-border hover:border-primary/50",
                selectedQuantity === option.quantity && "ring-2 ring-primary ring-offset-2"
              )}
            >
              {/* Optimal badge */}
              {option.isOptimal && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-success text-success-foreground shadow-md gap-1 px-3">
                    <Trophy className="h-3 w-3" />
                    Melhor Opção
                  </Badge>
                </div>
              )}
              
              {/* Best value badge */}
              {option.isBestValue && !option.isOptimal && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-md gap-1 px-3">
                    <Award className="h-3 w-3" />
                    Melhor Custo
                  </Badge>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {/* Quantity */}
                <p className="text-2xl font-bold font-display">
                  {option.quantity.toLocaleString('pt-BR')}
                  <span className="text-sm font-normal text-muted-foreground ml-1">un</span>
                </p>
                
                {/* Unit price */}
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">Preço unitário</p>
                  <p className={cn(
                    "font-semibold",
                    option.isOptimal ? "text-success" : "text-foreground"
                  )}>
                    {formatPrice(option.unitPrice)}
                  </p>
                </div>
                
                {/* Total */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">
                    {formatPrice(option.totalPrice)}
                  </p>
                </div>
                
                {/* Savings */}
                {option.savings && option.savings > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "w-full justify-center",
                      option.isOptimal 
                        ? "bg-success/20 text-success" 
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    Economia de {formatPrice(option.savings)}
                  </Badge>
                )}
              </div>
              
              {/* Selected indicator */}
              {selectedQuantity === option.quantity && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {option.isOptimal 
              ? "Quantidade recomendada para melhor custo-benefício"
              : option.isBestValue
              ? "Menor preço por unidade"
              : `${option.quantity} unidades por ${formatPrice(option.unitPrice)}/un`
            }
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
