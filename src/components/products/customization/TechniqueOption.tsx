/**
 * TechniqueOption — Uma opção de técnica (= 1 área de gravação)
 * 
 * Cada instância = 1 área (ex: "Lado A — Laser", "Lado A — UV Digital")
 * Seleção direta por clique.
 * 
 * Usa fn_get_customization_price (v1) com area_id.
 * Mostra seletor de cores quando price_by_color = true.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Palette, Check, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invokeExternalRpc } from "@/lib/external-rpc";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";

export interface TechniqueOptionProps {
  /** area_id from product_print_areas */
  areaId: string;
  /** Full area_name (e.g., "Lado A — Laser") */
  areaName: string;
  /** Area-specific dimensions */
  areaMaxWidth: number;
  areaMaxHeight: number;
  isCurved: boolean;
  isSelected: boolean;
  quantity: number;
  onSelect: (areaId: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Extract technique label from area_name: "Lado A — Laser" → "Laser" */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[1] : areaName;
}

export function TechniqueOption({
  areaId,
  areaName,
  areaMaxWidth,
  areaMaxHeight,
  isCurved,
  isSelected,
  quantity,
  onSelect,
}: TechniqueOptionProps) {
  const [priceData, setPriceData] = useState<CustomizationPriceV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [numColors, setNumColors] = useState(1);

  const techLabel = extractTechLabel(areaName);

  // Use technique-specific dimensions from enriched price data when available
  // Use MIN(technique_limit, physical_area) to show the binding constraint
  const dimensionLabel = useMemo(() => {
    const techW = (priceData as any)?.largura_max_tecnica;
    const techH = (priceData as any)?.altura_max_tecnica;
    
    // If we have technique-specific limits, use MIN with physical area
    const effectiveW = (typeof techW === 'number' && techW > 0)
      ? Math.min(techW, areaMaxWidth > 0 ? areaMaxWidth : techW)
      : areaMaxWidth;
    const effectiveH = (typeof techH === 'number' && techH > 0)
      ? Math.min(techH, areaMaxHeight > 0 ? areaMaxHeight : techH)
      : areaMaxHeight;
    
    if (effectiveW > 0 && effectiveH > 0) {
      return `${effectiveW}×${effectiveH}cm`;
    }
    return null;
  }, [areaMaxWidth, areaMaxHeight, priceData]);

  // Fetch price v1 with area_id
  const fetchPrice = useCallback(async (colors: number) => {
    if (quantity <= 0 || !areaId) return;
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
      setPriceData(result?.success ? result : null);
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [quantity, areaId]);

  // Fetch on mount / quantity change
  useEffect(() => {
    fetchPrice(numColors);
  }, [fetchPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push price to parent when it changes and this option is selected
  useEffect(() => {
    if (isSelected) {
      onSelect(areaId, priceData);
    }
  }, [priceData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleColorChange = (colors: number) => {
    setNumColors(colors);
    fetchPrice(colors);
  };

  // Determine max colors: from enriched priceData.max_cores (from tabela_preco_gravacao_oficial)
  const maxColors = useMemo(() => {
    if (!priceData) return 1;
    if (!priceData.price_by_color) return 1;
    // max_cores is enriched by the edge function from tabela_preco_gravacao_oficial
    const mc = (priceData as any).max_cores;
    if (typeof mc === 'number' && mc > 1) return mc;
    return 4; // fallback if enrichment missing
  }, [priceData]);

  const showColorSelector = isSelected && priceData?.price_by_color && maxColors > 1;

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
            <p className="font-medium text-sm text-foreground">{techLabel}</p>
            {dimensionLabel && (
              <p className="text-xs text-muted-foreground">
                {dimensionLabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {priceData && !priceData.price_by_color && (
            <Badge variant="outline" className="text-[10px] h-5">
              {maxColors === 1 ? "1 cor" : "Full Color"}
            </Badge>
          )}
          {priceData?.price_by_color && (
            <Badge variant="outline" className="text-[10px] h-5">
              <Palette className="h-2.5 w-2.5 mr-0.5" />
              até {maxColors} cores
            </Badge>
          )}
          {isSelected && priceData?.production_days && (
            <Badge variant="outline" className="text-[10px] h-5">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              {priceData.production_days}d
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
            {Array.from({ length: maxColors }, (_, i) => i + 1).map(n => (
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
