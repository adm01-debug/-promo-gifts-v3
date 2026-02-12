/**
 * TechniqueOption — Uma opção de técnica (= 1 área de gravação)
 * 
 * ARQUITETURA DEFINITIVA (v5.9):
 * Cada área de gravação é uma opção de técnica.
 * Preço calculado via fn_get_customization_price com p_area_id.
 * 
 * Suporta `label` e `variationLabel` para exibição hierárquica:
 * - label: nome principal (ex: "Laser" ou "Cilíndrica")
 * - variationLabel: subtítulo (ex: "Cilíndrica" quando label é o grupo)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Palette, Check, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invokeExternalRpc } from "@/lib/external-rpc";
import type { CustomizationPriceResponse, CustomizationPriceFlat } from "@/hooks/useGravacaoPriceV2";
import { mapPriceResponseToFlat } from "@/hooks/useGravacaoPriceV2";

export interface TechniqueOptionProps {
  /** area_id from product_print_areas (usado como p_area_id na RPC) */
  areaId: string;
  /** Full area_name (e.g., "Lado A — Laser") */
  areaName: string;
  /** Override label for display (e.g., "Laser" or "Cilíndrica" when nested) */
  label?: string;
  /** Variation subtitle (e.g., "Cilíndrica" shown below the main label) */
  variationLabel?: string;
  /** Area-specific dimensions */
  areaMaxWidth: number;
  areaMaxHeight: number;
  isCurved: boolean;
  isSelected: boolean;
  quantity: number;
  onSelect: (areaId: string, priceData: CustomizationPriceFlat | null) => void;
}

/** Extract technique label from area_name: "Lado A — Laser" → "Laser" */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[parts.length - 1] : areaName;
}

export function TechniqueOption({
  areaId,
  areaName,
  label,
  variationLabel,
  areaMaxWidth,
  areaMaxHeight,
  isCurved,
  isSelected,
  quantity,
  onSelect,
}: TechniqueOptionProps) {
  const [priceData, setPriceData] = useState<CustomizationPriceFlat | null>(null);
  const [loading, setLoading] = useState(false);
  const [numColors, setNumColors] = useState(1);

  const displayLabel = label || extractTechLabel(areaName);

  // Dimension label
  const dimensionLabel = useMemo(() => {
    if (areaMaxWidth > 0 && areaMaxHeight > 0) {
      return `${areaMaxWidth}×${areaMaxHeight}cm`;
    }
    return null;
  }, [areaMaxWidth, areaMaxHeight]);

  // Fetch price via fn_get_customization_price with p_area_id
  const fetchPrice = useCallback(async (colors: number) => {
    if (quantity <= 0) return;
    setLoading(true);
    try {
      const result = await invokeExternalRpc<CustomizationPriceResponse>(
        'fn_get_customization_price',
        {
          p_area_id: areaId,
          p_quantidade: quantity,
          p_num_cores: colors,
          p_largura_cm: null,
          p_altura_cm: null,
        }
      );

      if (result?.success) {
        setPriceData(mapPriceResponseToFlat(result));
      } else {
        setPriceData(null);
      }
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [quantity, areaId]);

  // Fetch price on mount and when quantity changes
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

  // Determine max colors from priceData
  const maxColors = useMemo(() => {
    if (!priceData) return 1;
    if (!priceData.price_by_color) return 1;
    if (priceData.max_cores > 1) return priceData.max_cores;
    return 4; // fallback
  }, [priceData]);

  const showColorSelector = isSelected && priceData?.price_by_color && maxColors > 1;

  // Build subtitle: variation label + dimensions
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (variationLabel) parts.push(variationLabel);
    if (dimensionLabel) parts.push(dimensionLabel);
    return parts.join(' · ') || null;
  }, [variationLabel, dimensionLabel]);

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
            <p className="font-medium text-sm text-foreground">{displayLabel}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
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
                R$ {priceData.unit_price?.toFixed(2)}/un
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
