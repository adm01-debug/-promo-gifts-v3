/**
 * VariationSelector — Etapa 3: Escolha da variação (tabela de preço específica)
 * 
 * Mostra as variações disponíveis para um grupo de técnica.
 * Cada variação = 1 product_print_area com seu customization_price_table_id.
 * Se só houver 1 variação, auto-seleciona.
 */

import { useEffect } from "react";
import { Check, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrintAreaV2 } from "@/hooks/useGravacaoPriceV2";

interface VariationSelectorProps {
  variations: PrintAreaV2[];
  selectedAreaId: string | null;
  onSelect: (areaId: string) => void;
}

export function VariationSelector({ variations, selectedAreaId, onSelect }: VariationSelectorProps) {
  // Auto-select if only 1 variation
  useEffect(() => {
    if (variations.length === 1 && !selectedAreaId) {
      onSelect(variations[0].area_id);
    }
  }, [variations, selectedAreaId, onSelect]);

  // If auto-selected single variation, don't show selector
  if (variations.length === 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Etapa 3 · Escolha a variação
      </p>
      <div className="space-y-1.5">
        {variations.map((area) => {
          const isSelected = selectedAreaId === area.area_id;
          const variationName = area.technique_name || area.area_name;

          return (
            <button
              key={area.area_id}
              className={cn(
                "w-full p-3 rounded-lg flex items-center justify-between transition-all duration-200 border text-left",
                isSelected
                  ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                  : "bg-secondary/50 border-border/50 hover:bg-secondary/80 hover:border-border"
              )}
              onClick={() => onSelect(area.area_id)}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                )}>
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="font-medium text-sm text-foreground">
                  {variationName}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Maximize2 className="h-3 w-3" />
                até {area.max_width}×{area.max_height}cm
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
