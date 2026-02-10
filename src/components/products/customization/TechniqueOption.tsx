/**
 * TechniqueOption — Linha de técnica dentro de um LocationCard
 * 
 * Busca preço via fn_get_customization_price (v1) com area_id.
 * Mostra seletor de cores quando price_by_color = true.
 */

import { useState, useEffect, useCallback } from "react";
import { Palette, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invokeExternalRpc } from "@/lib/external-rpc";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";

interface TechniqueOptionProps {
  areaId: string;
  areaCode: string;
  areaName: string;
  maxWidth: number;
  maxHeight: number;
  isCurved: boolean;
  isSelected: boolean;
  quantity: number;
  onSelect: (areaId: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Extract technique label from area_name (part after " — ") */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[1] : areaName;
}

export function TechniqueOption({
  areaId,
  areaCode,
  areaName,
  maxWidth,
  maxHeight,
  isCurved,
  isSelected,
  quantity,
  onSelect,
}: TechniqueOptionProps) {
  const [priceData, setPriceData] = useState<CustomizationPriceV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [numColors, setNumColors] = useState(1);

  const techLabel = extractTechLabel(areaName);

  const fetchPrice = useCallback(async (colors: number) => {
    if (quantity <= 0) return;
    setLoading(true);
    try {
      const result = await invokeExternalRpc<CustomizationPriceV2>(
        'fn_get_customization_price',
        {
          p_area_id: areaId,
          p_quantidade: quantity,
          p_num_cores: colors,
        }
      );
      if (result?.success) {
        setPriceData(result);
        if (isSelected) onSelect(areaId, result);
      }
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [areaId, quantity, isSelected, onSelect]);

  // Fetch price on mount and when quantity changes
  useEffect(() => {
    fetchPrice(numColors);
  }, [areaId, quantity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when colors change
  const handleColorChange = (colors: number) => {
    setNumColors(colors);
    fetchPrice(colors);
  };

  // Determine max colors for this technique
  const maxColorsForTech = getMaxColors(areaCode, priceData);
  const showColorSelector = isSelected && priceData?.price_by_color && maxColorsForTech > 1;

  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all duration-200 border",
        isSelected
          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
          : "bg-secondary/50 border-border/50 hover:bg-secondary/80 hover:border-border"
      )}
      onClick={() => onSelect(areaId, priceData)}
    >
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
            <p className="font-medium text-sm text-foreground">{techLabel}</p>
            <p className="text-xs text-muted-foreground">
              {maxWidth}×{maxHeight}cm
              {isCurved && " · curva"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {priceData && !priceData.price_by_color && (
            <Badge variant="outline" className="text-[10px] h-5">
              {maxColorsForTech === 1 ? "1 cor" : "Full Color"}
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

      {/* Color selector (only for price_by_color techniques when selected) */}
      {showColorSelector && (
        <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-muted-foreground mb-2">Nº de cores:</p>
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

/** Determine max colors based on area_code and price data */
function getMaxColors(areaCode: string, priceData: CustomizationPriceV2 | null): number {
  // Known mappings from the briefing
  const MAX_COLORS: Record<string, number> = {
    'LADO-A': 1,
    'LADO-B': 1,
    '360': 1,
    '360-UV': 1,
    '360-UV-V': 1,
    'LADO-A-UV': 1,
    'LADO-A-SILK': 3,
    'LADO-B-SILK': 3,
    '360-SILK': 1,
  };

  if (MAX_COLORS[areaCode] !== undefined) {
    return MAX_COLORS[areaCode];
  }

  // Fallback: if price_by_color, allow up to 4; otherwise 1
  if (priceData?.price_by_color) return 4;
  return 1;
}
