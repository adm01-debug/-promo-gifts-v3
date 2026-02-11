/**
 * TechniqueOption — Linha de técnica dentro de um LocationCard
 * 
 * Fluxo correto: Local → Técnica → Tamanho → Cores → Preço
 * 
 * 1. Usuário seleciona a técnica (clica neste componente)
 * 2. Se houver variantes (tamanhos), exibe seletor de tamanho
 * 3. Se price_by_color, exibe seletor de cores
 * 4. Preço é calculado com variante + cores selecionadas
 * 
 * Usa fn_get_customization_price_v2 com variante_id. SEM fallback v1.
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
  techniques?: PrintAreaTechnique[];
  onSelect: (areaId: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Extract technique label from area_name (part after " — ") */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[1] : areaName;
}

/** Find the technique matching this area's label */
function findMatchingTechnique(
  techniques: PrintAreaTechnique[],
  techLabel: string
): PrintAreaTechnique | null {
  if (!techniques.length) return null;
  const label = techLabel.toLowerCase().trim();
  const exact = techniques.find(t => t.nome.toLowerCase().trim() === label);
  if (exact) return exact;
  const partial = techniques.find(t =>
    t.nome.toLowerCase().includes(label) || label.includes(t.nome.toLowerCase())
  );
  return partial || techniques[0];
}

/** Format variant label with dimensions (only from variant overrides) */
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

  // Find ONLY the technique matching this area
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
  const hasMultipleVariantes = areaVariantes.length > 1;

  // Auto-select ONLY when there's a single variante (no choice needed)
  // When multiple, user must pick
  useEffect(() => {
    if (!hasVariantes) {
      setSelectedVarianteId(null);
      return;
    }
    if (hasMultipleVariantes) {
      // Don't auto-select when there are multiple — user must choose
      if (selectedVarianteId) {
        const exists = areaVariantes.some(v => v.variant.variante_id === selectedVarianteId);
        if (!exists) setSelectedVarianteId(null);
      }
      return;
    }
    // Single variante: auto-select it
    setSelectedVarianteId(areaVariantes[0].variant.variante_id);
  }, [areaVariantes, hasVariantes, hasMultipleVariantes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current selected variante data
  const selectedVariante = useMemo(() => {
    if (!selectedVarianteId) return null;
    return areaVariantes.find(v => v.variant.variante_id === selectedVarianteId) || null;
  }, [areaVariantes, selectedVarianteId]);

  // Max colors from selected variante
  const maxColorsForTech = useMemo(() => {
    if (selectedVariante) {
      const mc = selectedVariante.variant.max_colors;
      if (mc === 0) return 0;
      if (mc > 0) return mc;
    }
    if (priceData?.price_by_color) return 4;
    return 1;
  }, [selectedVariante, priceData]);

  // Fetch price (v2 only) — only when variante is selected
  const fetchPrice = useCallback(async (colors: number, varianteId: string | null) => {
    if (quantity <= 0 || !varianteId) {
      setPriceData(null);
      return;
    }
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
      } else {
        setPriceData(null);
      }
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [quantity]);

  // Push updated price to parent when priceData changes and this is selected
  useEffect(() => {
    if (isSelected) {
      onSelect(areaId, priceData);
    }
  }, [priceData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch price when variante is selected/changed
  useEffect(() => {
    if (selectedVarianteId) {
      fetchPrice(numColors, selectedVarianteId);
    } else {
      setPriceData(null);
    }
  }, [fetchPrice, selectedVarianteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleColorChange = (colors: number) => {
    setNumColors(colors);
    fetchPrice(colors, selectedVarianteId);
  };

  const handleVarianteChange = (varianteId: string) => {
    setSelectedVarianteId(varianteId);
    setNumColors(1);
  };

  // Show color selector only after technique selected + variante selected + price loaded
  const showColorSelector = isSelected && selectedVarianteId && priceData?.price_by_color && maxColorsForTech > 1;

  // Show variante selector only when technique is selected and multiple variantes exist
  const showVarianteSelector = isSelected && hasMultipleVariantes;

  // Effective dimensions
  const effectiveWidth = selectedVariante?.variant.override_width ?? maxWidth;
  const effectiveHeight = selectedVariante?.variant.override_height ?? maxHeight;

  // Whether we're waiting for user to pick a size before showing price
  const awaitingVarianteSelection = isSelected && hasMultipleVariantes && !selectedVarianteId;

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
      {/* Header row: technique name + price */}
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
            ) : awaitingVarianteSelection ? (
              <span className="text-xs text-muted-foreground italic">selecione tamanho</span>
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

      {/* STEP 1: Tamanho/Variante selector (after selecting technique) */}
      {showVarianteSelector && (
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

      {/* Single variante info (auto-selected, no dropdown needed) */}
      {isSelected && hasVariantes && !hasMultipleVariantes && selectedVariante?.variant.override_width && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
          <Ruler className="h-3 w-3" />
          {selectedVariante.variant.nome}
          {' '}({selectedVariante.variant.override_width}×{selectedVariante.variant.override_height}cm)
        </div>
      )}

      {/* STEP 2: Color selector (after tamanho is selected + price_by_color) */}
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
