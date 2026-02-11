/**
 * TechniqueOption — Uma opção de Técnica + Variante (tamanho)
 * 
 * Cada instância = 1 combinação (ex: "Laser — Plano", "UV Digital — Rotativo")
 * Sem dropdown. Seleção direta por clique.
 * 
 * Usa fn_get_customization_price_v2 com variante_id. SEM fallback v1.
 * Mostra seletor de cores apenas quando price_by_color = true.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Palette, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invokeExternalRpc } from "@/lib/external-rpc";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";
import type { TechniqueVariant } from "@/hooks/useGravacaoPriceV2";

export interface TechniqueVariantOptionProps {
  /** Unique key for this option (varianteId) */
  optionKey: string;
  /** Technique name (e.g., "Laser") */
  techniqueName: string;
  /** Variant data */
  variant: TechniqueVariant;
  /** Area default dimensions (fallback when variant has no override) */
  areaMaxWidth: number;
  areaMaxHeight: number;
  /** Dimension text from tabela_preco_gravacao_oficial (e.g., "8x12cm") */
  areaMaxText: string | null;
  isCurved: boolean;
  isSelected: boolean;
  quantity: number;
  onSelect: (optionKey: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Format display label: "Técnica — Variante" */
function formatOptionLabel(techName: string, variant: TechniqueVariant): string {
  // Strip technique prefix from variant name if present (e.g., "Fiber Laser | Plana" → "Plana")
  const parts = variant.nome.split(' | ');
  const variantLabel = parts.length > 1 ? parts[1] : variant.nome;
  return `${techName} — ${variantLabel}`;
}

export function TechniqueOption({
  optionKey,
  techniqueName,
  variant,
  areaMaxWidth,
  areaMaxHeight,
  areaMaxText,
  isCurved,
  isSelected,
  quantity,
  onSelect,
}: TechniqueVariantOptionProps) {
  const [priceData, setPriceData] = useState<CustomizationPriceV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [numColors, setNumColors] = useState(1);

  const label = formatOptionLabel(techniqueName, variant);

  // Dimensions: use area max dimensions (from product_print_areas) as primary source
  const dimensionLabel = useMemo(() => {
    if (areaMaxWidth > 0 && areaMaxHeight > 0) {
      return `${areaMaxWidth}×${areaMaxHeight}cm`;
    }
    if (areaMaxText) return areaMaxText;
    return null;
  }, [areaMaxWidth, areaMaxHeight, areaMaxText]);

  // Max colors from variant
  const maxColorsForTech = useMemo(() => {
    const mc = variant.max_colors;
    if (mc === 0) return 0; // Full color
    if (mc > 0) return mc;
    if (priceData?.price_by_color) return 4;
    return 1;
  }, [variant.max_colors, priceData]);

  // Fetch price v2
  const fetchPrice = useCallback(async (colors: number) => {
    if (quantity <= 0 || !variant.variante_id) return;
    setLoading(true);
    try {
      const result = await invokeExternalRpc<CustomizationPriceV2>(
        'fn_get_customization_price_v2',
        {
          p_tecnica_variante_id: variant.variante_id,
          p_quantidade: quantity,
          p_num_cores: colors,
        }
      );
      setPriceData(result?.success ? result : null);
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [quantity, variant.variante_id]);

  // Fetch on mount / quantity change
  useEffect(() => {
    fetchPrice(numColors);
  }, [fetchPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push price to parent when it changes and this option is selected
  useEffect(() => {
    if (isSelected) {
      onSelect(optionKey, priceData);
    }
  }, [priceData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleColorChange = (colors: number) => {
    setNumColors(colors);
    fetchPrice(colors);
  };

  const showColorSelector = isSelected && priceData?.price_by_color && maxColorsForTech > 1;

  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all duration-200 border",
        isSelected
          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
          : "bg-secondary/50 border-border/50 hover:bg-secondary/80 hover:border-border"
      )}
      onClick={() => onSelect(optionKey, priceData)}
    >
      {/* Header: label + badges + price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40"
          )}>
            {isSelected && <Check className="h-3 w-3" />}
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{label}</p>
            {dimensionLabel && (
              <p className="text-xs text-muted-foreground">
                {dimensionLabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {variant.is_recommended && (
            <Badge variant="secondary" className="text-[10px] h-5">⭐</Badge>
          )}
          {!variant.has_pricing && (
            <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">sob consulta</Badge>
          )}
          {priceData && !priceData.price_by_color && (
            <Badge variant="outline" className="text-[10px] h-5">
              {maxColorsForTech === 1 ? "1 cor" : maxColorsForTech === 0 ? "Full Color" : `até ${maxColorsForTech} cores`}
            </Badge>
          )}
          {priceData?.price_by_color && (
            <Badge variant="outline" className="text-[10px] h-5">
              <Palette className="h-2.5 w-2.5 mr-0.5" />
              até {maxColorsForTech} cores
            </Badge>
          )}
          <div className="text-right min-w-[80px]">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
            ) : priceData ? (
              <span className="text-sm font-semibold text-primary">
                R$ {priceData.unit_price.toFixed(2)}/un
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Color selector (only when selected + price_by_color) */}
      {showColorSelector && (
        <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Nº de cores:
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: maxColorsForTech }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={cn(
                  "w-8 h-8 rounded-md text-sm font-medium transition-colors",
                  n === numColors
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                onClick={() => handleColorChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
