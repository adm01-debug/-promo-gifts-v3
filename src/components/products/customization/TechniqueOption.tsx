/**
 * TechniqueOption — Linha de técnica dentro de um LocationCard
 * 
 * Usa fn_get_customization_price_v2 com variante_id quando disponível,
 * fallback para fn_get_customization_price (v1) com area_id.
 * 
 * Mostra seletor de variantes (tamanho) quando há múltiplas variantes.
 * Mostra seletor de cores quando price_by_color = true.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Palette, Check, Loader2, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { invokeExternalRpc } from "@/lib/external-rpc";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";
import type { PrintAreaTechnique, TechniqueVariant } from "@/hooks/useGravacaoPriceV2";

interface TechniqueOptionProps {
  areaId: string;
  areaCode: string;
  areaName: string;
  maxWidth: number;
  maxHeight: number;
  isCurved: boolean;
  isSelected: boolean;
  quantity: number;
  /** v2 techniques with variantes (optional, enables size selector) */
  techniques?: PrintAreaTechnique[];
  onSelect: (areaId: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Extract technique label from area_name (part after " — ") */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[1] : areaName;
}

/** Flatten all variantes from all techniques in an area */
function flattenVariantes(techniques: PrintAreaTechnique[]): Array<{
  variant: TechniqueVariant;
  techniqueName: string;
}> {
  const result: Array<{ variant: TechniqueVariant; techniqueName: string }> = [];
  for (const tech of techniques) {
    for (const v of tech.variantes) {
      result.push({ variant: v, techniqueName: tech.nome });
    }
  }
  return result;
}

/** Format variant label with dimensions */
function formatVariantLabel(v: TechniqueVariant, defaultW: number, defaultH: number): string {
  const w = v.override_width ?? defaultW;
  const h = v.override_height ?? defaultH;
  const dims = w > 0 && h > 0 ? ` (${w}×${h}cm)` : '';
  // Strip technique name prefix if present
  const parts = v.nome.split(' | ');
  const label = parts.length > 1 ? parts[1] : v.nome;
  return `${label}${dims}`;
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
  techniques,
  onSelect,
}: TechniqueOptionProps) {
  const [priceData, setPriceData] = useState<CustomizationPriceV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [numColors, setNumColors] = useState(1);
  const [selectedVarianteId, setSelectedVarianteId] = useState<string | null>(null);

  const techLabel = extractTechLabel(areaName);

  // Flatten available variantes
  const allVariantes = useMemo(() => {
    if (!techniques?.length) return [];
    return flattenVariantes(techniques);
  }, [techniques]);

  const hasVariantes = allVariantes.length > 0;
  const showVarianteSelector = hasVariantes && allVariantes.length > 1;

  // Auto-select recommended or first variante
  useEffect(() => {
    if (!hasVariantes) return;
    if (selectedVarianteId) {
      // Verify current selection still exists
      const exists = allVariantes.some(v => v.variant.variante_id === selectedVarianteId);
      if (exists) return;
    }
    const recommended = allVariantes.find(v => v.variant.is_recommended);
    setSelectedVarianteId(recommended?.variant.variante_id || allVariantes[0]?.variant.variante_id || null);
  }, [allVariantes, hasVariantes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current selected variante data
  const selectedVariante = useMemo(() => {
    if (!selectedVarianteId) return null;
    return allVariantes.find(v => v.variant.variante_id === selectedVarianteId) || null;
  }, [allVariantes, selectedVarianteId]);

  // Determine max colors for this technique/variante
  const maxColorsForTech = useMemo(() => {
    if (selectedVariante) {
      const mc = selectedVariante.variant.max_colors;
      if (mc === 0) return 0; // unlimited / full color
      if (mc > 0) return mc;
    }
    return getMaxColorsLegacy(areaCode, priceData);
  }, [selectedVariante, areaCode, priceData]);

  // Fetch price (v2 with variante or v1 with area_id)
  const fetchPrice = useCallback(async (colors: number, varianteId: string | null) => {
    if (quantity <= 0) return;
    setLoading(true);
    try {
      let result: CustomizationPriceV2 | null = null;

      if (varianteId) {
        // V2 flow: use variante_id
        result = await invokeExternalRpc<CustomizationPriceV2>(
          'fn_get_customization_price_v2',
          {
            p_tecnica_variante_id: varianteId,
            p_quantidade: quantity,
            p_num_cores: colors,
          }
        );
      } else {
        // V1 fallback: use area_id
        result = await invokeExternalRpc<CustomizationPriceV2>(
          'fn_get_customization_price',
          {
            p_area_id: areaId,
            p_quantidade: quantity,
            p_num_cores: colors,
          }
        );
      }

      if (result?.success) {
        setPriceData(result);
      }
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [areaId, quantity]);

  // Push updated price to parent whenever priceData changes and this technique is selected
  useEffect(() => {
    if (isSelected && priceData) {
      onSelect(areaId, priceData);
    }
  }, [priceData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch price on mount and when quantity or variante changes
  useEffect(() => {
    fetchPrice(numColors, selectedVarianteId);
  }, [fetchPrice, selectedVarianteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when colors change
  const handleColorChange = (colors: number) => {
    setNumColors(colors);
    fetchPrice(colors, selectedVarianteId);
  };

  // Handle variante change
  const handleVarianteChange = (varianteId: string) => {
    setSelectedVarianteId(varianteId);
    // Reset colors to 1 when changing variante (max_colors may differ)
    setNumColors(1);
  };

  const showColorSelector = isSelected && priceData?.price_by_color && maxColorsForTech > 1;

  // Effective dimensions (from variante or area defaults)
  const effectiveWidth = selectedVariante?.variant.override_width ?? maxWidth;
  const effectiveHeight = selectedVariante?.variant.override_height ?? maxHeight;

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
              {effectiveWidth}×{effectiveHeight}cm
              {isCurved && " · curva"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
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

      {/* Variante/Size selector (when selected and multiple variantes available) */}
      {isSelected && showVarianteSelector && (
        <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            Variante / Tamanho:
          </p>
          <Select value={selectedVarianteId || ''} onValueChange={handleVarianteChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione a variante" />
            </SelectTrigger>
            <SelectContent>
              {allVariantes.map(({ variant }) => (
                <SelectItem key={variant.variante_id} value={variant.variante_id}>
                  <span className="flex items-center gap-1.5">
                    {formatVariantLabel(variant, maxWidth, maxHeight)}
                    {variant.is_recommended && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">⭐</Badge>
                    )}
                    {!variant.has_pricing && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">sob consulta</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Single variante info (when only 1 exists but has size override) */}
      {isSelected && hasVariantes && !showVarianteSelector && selectedVariante?.variant.override_width && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
          <Ruler className="h-3 w-3" />
          {selectedVariante.variant.nome}
          {' '}({selectedVariante.variant.override_width}×{selectedVariante.variant.override_height}cm)
        </div>
      )}

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

/** Legacy: Determine max colors based on area_code and price data */
function getMaxColorsLegacy(areaCode: string, priceData: CustomizationPriceV2 | null): number {
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

  if (priceData?.price_by_color) return 4;
  return 1;
}
