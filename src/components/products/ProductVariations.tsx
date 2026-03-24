import { useState } from "react";
import { Check, Package } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProductVariation, ProductColor } from "@/types/product";

interface ProductVariationsProps {
  variations: ProductVariation[];
  colors: ProductColor[];
  selectedVariation: ProductVariation | null;
  onSelectVariation: (variation: ProductVariation | null) => void;
}

export function ProductVariations({
  variations,
  colors,
  selectedVariation,
  onSelectVariation,
}: ProductVariationsProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      // Quando selecionar todas, limpa a seleção individual
      onSelectVariation(null);
    }
  };

  const getStockStatus = (stock: number) => {
    const s = Math.max(0, stock);
    if (s === 0) return { label: "Sem estoque", color: "text-destructive" };
    if (s < 100) return { label: "Estoque baixo", color: "text-warning" };
    return { label: "Em estoque", color: "text-success" };
  };

  // Se não há variações, mostrar apenas as cores disponíveis
  if (!variations || variations.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-foreground">
          Cores Disponíveis
        </h3>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <Tooltip key={color.name}>
              <TooltipTrigger asChild>
                <div
                  className="color-badge cursor-default"
                  style={{
                    backgroundColor: color.hex,
                    border: color.hex === "#FFFFFF" ? "2px solid hsl(var(--border))" : undefined,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{color.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">
          Variações de Cor ({variations.length})
        </h3>
        <button
          onClick={handleSelectAll}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            selectAll
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {selectAll && <Check className="h-4 w-4" />}
          Selecionar Todas
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {variations.map((variation) => {
          const isSelected = selectAll || selectedVariation?.id === variation.id;
          const stockStatus = getStockStatus(variation.stock);

          return (
            <button
              key={variation.id}
              onClick={() => {
                if (selectAll) {
                  setSelectAll(false);
                }
                onSelectVariation(isSelected && !selectAll ? null : variation);
              }}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all duration-200 text-left",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              {/* Image */}
              <div className="aspect-square rounded-lg overflow-hidden bg-secondary/30 mb-2">
                <img
                  src={variation.image}
                  alt={variation.color.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Color indicator */}
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-4 h-4 rounded-full border border-border"
                  style={{
                    backgroundColor: variation.color.hex,
                    border: variation.color.hex === "#FFFFFF" ? "1px solid hsl(var(--border))" : undefined,
                  }}
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {variation.color.name}
                </span>
              </div>

              {/* SKU */}
              <p className="text-xs text-muted-foreground font-mono mb-1">
                {variation.sku}
              </p>

              {/* Stock */}
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span className={cn("text-xs font-medium", stockStatus.color)}>
                  {Math.max(0, variation.stock).toLocaleString("pt-BR")} un.
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
