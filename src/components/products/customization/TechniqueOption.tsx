/**
 * TechniqueOption — Linha de técnica dentro de um LocationCard
 * 
 * Fluxo correto: Local → Técnica (este componente) → Tamanho/Variante
 * 
 * Usa fn_get_customization_price_v2 com variante_id.
 * SEM fallback para v1.
 * 
 * Mostra seletor de variantes (tamanho) apenas da técnica correspondente a esta área.
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
  /** v2 techniques with variantes */
  techniques?: PrintAreaTechnique[];
  onSelect: (areaId: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Extract technique label from area_name (part after " — ") */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[1] : areaName;
}

/**
 * Find the technique matching this area's label.
 * area_name = "Lado A — Laser" → techLabel = "Laser" → match technique with nome "Laser"
 */
function findMatchingTechnique(
  techniques: PrintAreaTechnique[],
  techLabel: string
): PrintAreaTechnique | null {
  if (!techniques.length) return null;

  const label = techLabel.toLowerCase().trim();

  // Exact match
  const exact = techniques.find(t => t.nome.toLowerCase().trim() === label);
  if (exact) return exact;

  // Partial match
  const partial = techniques.find(t =>
    t.nome.toLowerCase().includes(label) ||
    label.includes(t.nome.toLowerCase())
  );
  if (partial) return partial;

  // Last resort: first technique
  return techniques[0];
}

/** Format variant label with dimensions (only from variant overrides, no fallback) */
function formatVariantLabel(v: TechniqueVariant): string {
  const w = v.override_width;
  const h = v.override_height;
  const dims = w && h && w > 0 && h > 0 ? ` (${w}×${h}cm)` : '';
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

  // Find ONLY the technique matching this area (not all techniques)
  const matchedTechnique = useMemo(() => {
    if (!techniques?.length) return null;
    return findMatchingTechnique(techniques, techLabel);
  }, [techniques, techLabel]);

  // Get variants only from the matched technique
  const areaVariantes = useMemo(() => {
    if (!matchedTechnique) return [];
    return matchedTechnique.variantes.map(v => ({
      variant: v,
      techniqueName: matchedTechnique.nome,
    }));
  }, [matchedTechnique]);

  const hasVariantes = areaVariantes.length > 0;
  const showVarianteSelector = hasVariantes && areaVariantes.length > 1;

  // Auto-select recommended or first variante
  useEffect(() => {
    if (!hasVariantes) return;
    if (selectedVarianteId) {
      const exists = areaVariantes.some(v => v.variant.variante_id === selectedVarianteId);
      if (exists) return;
    }
    const recommended = areaVariantes.find(v => v.variant.is_recommended);
    setSelectedVarianteId(recommended?.variant.variante_id || areaVariantes[0]?.variant.variante_id || null);
  }, [areaVariantes, hasVariantes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current selected variante data
  const selectedVariante = useMemo(() => {
    if (!selectedVarianteId) return null;
    return areaVariantes.find(v => v.variant.variante_id === selectedVarianteId) || null;
  }, [areaVariantes, selectedVarianteId]);

  // Determine max colors for this technique/variante
  const maxColorsForTech = useMemo(() => {
    if (selectedVariante) {
      const mc = selectedVariante.variant.max_colors;
      if (mc === 0) return 0; // unlimited / full color
      if (mc > 0) return mc;
    }
    // No legacy fallback — use variant data only
    if (priceData?.price_by_color) return 4;
    return 1;
  }, [selectedVariante, priceData]);

  // Fetch price (v2 only, no v1 fallback)
  const fetchPrice = useCallback(async (colors: number, varianteId: string | null) => {
    if (quantity <= 0 || !varianteId) return;
    setLoading(true);
    try {
      const result = await invokeExternalRpc<CustomizationPriceV2>(
        'fn_get_customization_price_v2',
        {
          p_tecnica_variante_id: varianteId,
          p_quantidade: quantity,
          p_num_cores: colors,
        }
      );

      if (result?.success) {
        setPriceData(result);
      }
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [quantity]);

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
    setNumColors(1);
  };

  const showColorSelector = isSelected && priceData?.price_by_color && maxColorsForTech > 1;

  // Effective dimensions (from variante overrides only, no area fallback)
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

      {/* Variante/Tamanho selector — only variants from the MATCHED technique */}
      {isSelected && showVarianteSelector && (
        <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            Tamanho da gravação:
          </p>
          <Select value={selectedVarianteId || ''} onValueChange={handleVarianteChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione o tamanho" />
            </SelectTrigger>
            <SelectContent>
              {areaVariantes.map(({ variant }) => (
                <SelectItem key={variant.variante_id} value={variant.variante_id}>
                  <span className="flex items-center gap-1.5">
                    {formatVariantLabel(variant)}
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

      {/* Single variante info */}
      {isSelected && hasVariantes && !showVarianteSelector && selectedVariante?.variant.override_width && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
          <Ruler className="h-3 w-3" />
          {selectedVariante.variant.nome}
          {' '}({selectedVariante.variant.override_width}×{selectedVariante.variant.override_height}cm)
        </div>
      )}

      {/* Color selector */}
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
