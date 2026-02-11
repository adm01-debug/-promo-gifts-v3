/**
 * TechniqueOption — Uma opção de técnica (= 1 área de gravação)
 * 
 * Fluxo de seleção sequencial:
 * 1. Clique seleciona a técnica
 * 2. Seletor de tamanho/variante aparece (obrigatório)
 * 3. Seletor de cores aparece (se price_by_color)
 * 4. Preço final calculado via fn_get_customization_price_v2 com variante_id
 * 
 * Fallback para fn_get_customization_price (v1) com area_id quando
 * não há variantes disponíveis.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Palette, Check, Loader2, Clock, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invokeExternalRpc } from "@/lib/external-rpc";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";
import type { TechniqueVariant } from "@/hooks/useGravacaoPriceV2";

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
  /** Technique variants (size/format options) from v2 areas data */
  variants?: TechniqueVariant[];
  onSelect: (areaId: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Extract technique label from area_name: "Lado A — Laser" → "Laser" */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[1] : areaName;
}

/** Extract a short size label from variant name */
function extractVariantSizeLabel(variant: TechniqueVariant): string {
  // nome format examples: "Fiber Laser | Plana", "Serigrafia UV | Cilíndrica"
  // The variant often has override dimensions which are more useful
  const parts = variant.nome.split(' | ');
  return parts.length > 1 ? parts[1] : variant.nome;
}

/** Build a display label for a variant including dimensions */
function getVariantDisplayLabel(variant: TechniqueVariant, areaMaxWidth: number, areaMaxHeight: number): string {
  const sizeLabel = extractVariantSizeLabel(variant);
  const w = variant.override_width ?? areaMaxWidth;
  const h = variant.override_height ?? areaMaxHeight;
  if (w > 0 && h > 0) {
    return `${sizeLabel} — ${w}×${h}cm`;
  }
  return sizeLabel;
}

export function TechniqueOption({
  areaId,
  areaName,
  areaMaxWidth,
  areaMaxHeight,
  isCurved,
  isSelected,
  quantity,
  variants = [],
  onSelect,
}: TechniqueOptionProps) {
  const [priceData, setPriceData] = useState<CustomizationPriceV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [numColors, setNumColors] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const techLabel = extractTechLabel(areaName);

  // Deduplicate variants by variante_id
  const uniqueVariants = useMemo(() => {
    if (!variants.length) return [];
    const seen = new Set<string>();
    return variants.filter(v => {
      if (seen.has(v.variante_id)) return false;
      seen.add(v.variante_id);
      return true;
    });
  }, [variants]);

  const hasVariants = uniqueVariants.length > 0;
  const selectedVariant = uniqueVariants.find(v => v.variante_id === selectedVariantId) ?? null;

  // Use technique-specific dimensions from enriched price data or selected variant
  const dimensionLabel = useMemo(() => {
    // If a variant is selected, use its dimensions
    if (selectedVariant) {
      const w = selectedVariant.override_width ?? areaMaxWidth;
      const h = selectedVariant.override_height ?? areaMaxHeight;
      if (w > 0 && h > 0) return `${w}×${h}cm`;
    }

    // Otherwise use enriched technique dimensions from priceData
    const techW = (priceData as any)?.largura_max_tecnica;
    const techH = (priceData as any)?.altura_max_tecnica;
    
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
  }, [areaMaxWidth, areaMaxHeight, priceData, selectedVariant]);

  // Fetch price with v2 (variant) or v1 (area_id) fallback
  const fetchPrice = useCallback(async (colors: number, variantId?: string | null) => {
    if (quantity <= 0) return;
    setLoading(true);
    try {
      let result: CustomizationPriceV2 | null = null;

      if (variantId) {
        // v2 with variante_id
        result = await invokeExternalRpc<CustomizationPriceV2>(
          'fn_get_customization_price_v2',
          {
            p_tecnica_variante_id: variantId,
            p_quantidade: quantity,
            p_num_cores: colors,
          }
        );
        // Map v2 fields to v1 interface for compatibility
        if (result) {
          const r = result as any;
          if (!r.unit_price && r.preco_minimo_unitario) {
            r.unit_price = r.preco_minimo_unitario;
          }
        }
      } else if (areaId) {
        // v1 fallback with area_id
        result = await invokeExternalRpc<CustomizationPriceV2>(
          'fn_get_customization_price',
          {
            p_area_id: areaId,
            p_quantidade: quantity,
            p_num_cores: colors,
          }
        );
      }

      setPriceData(result?.success !== false ? result : null);
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [quantity, areaId]);

  // When no variants: fetch v1 price on mount / quantity change
  useEffect(() => {
    if (!hasVariants) {
      fetchPrice(numColors);
    }
  }, [fetchPrice, hasVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  // When variant is selected: fetch v2 price
  useEffect(() => {
    if (selectedVariantId && isSelected) {
      fetchPrice(numColors, selectedVariantId);
    }
  }, [selectedVariantId, quantity, numColors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push price to parent when it changes and this option is selected
  useEffect(() => {
    if (isSelected) {
      onSelect(areaId, priceData);
    }
  }, [priceData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset variant when deselected
  useEffect(() => {
    if (!isSelected) {
      setSelectedVariantId(null);
    }
  }, [isSelected]);

  const handleColorChange = (colors: number) => {
    setNumColors(colors);
    fetchPrice(colors, selectedVariantId);
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    // Price will be fetched by the useEffect
  };

  // Determine max colors from selected variant or priceData
  const maxColors = useMemo(() => {
    if (selectedVariant && selectedVariant.max_colors > 1) return selectedVariant.max_colors;
    if (!priceData) return 1;
    if (!priceData.price_by_color) return 1;
    const mc = (priceData as any).max_cores;
    if (typeof mc === 'number' && mc > 1) return mc;
    return 4; // fallback
  }, [priceData, selectedVariant]);

  const showColorSelector = isSelected && priceData?.price_by_color && maxColors > 1;
  const showVariantSelector = isSelected && hasVariants;
  const needsVariantSelection = hasVariants && !selectedVariantId;

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
            ) : needsVariantSelection && isSelected ? (
              <span className="text-xs text-muted-foreground">Selecione o tamanho</span>
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

      {/* Variant/Size selector (when selected + has variants) */}
      {showVariantSelector && (
        <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            Tamanho da gravação:
          </p>
          <div className="grid gap-1.5">
            {uniqueVariants.map(variant => {
              const isVarSelected = selectedVariantId === variant.variante_id;
              const displayLabel = getVariantDisplayLabel(variant, areaMaxWidth, areaMaxHeight);
              
              return (
                <button
                  key={variant.variante_id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors text-left",
                    isVarSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
                  )}
                  onClick={() => handleVariantSelect(variant.variante_id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center",
                      isVarSelected
                        ? "border-primary-foreground bg-primary-foreground/20"
                        : "border-muted-foreground/50"
                    )}>
                      {isVarSelected && <Check className="h-2 w-2" />}
                    </div>
                    <span className="font-medium">{displayLabel}</span>
                  </div>
                  {variant.is_recommended && (
                    <Badge variant="outline" className={cn(
                      "text-[9px] h-4",
                      isVarSelected && "border-primary-foreground/50 text-primary-foreground"
                    )}>
                      ⭐ Recomendado
                    </Badge>
                  )}
                  {!variant.has_pricing && (
                    <Badge variant="outline" className={cn(
                      "text-[9px] h-4",
                      isVarSelected && "border-primary-foreground/50 text-primary-foreground"
                    )}>
                      Sob consulta
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color selector (only when selected + variant chosen + price_by_color) */}
      {showColorSelector && !needsVariantSelection && (
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
