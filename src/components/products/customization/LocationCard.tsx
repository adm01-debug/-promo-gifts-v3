/**
 * LocationCard — Card colapsável por local físico do produto
 * 
 * Achata todas as combinações técnica+variante em opções individuais.
 * Ex: Laser tem 2 variantes (Plano, Rotativo) → 2 opções separadas.
 * 
 * Busca dimensões específicas de cada variante via tabela_preco_gravacao_oficial.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Sparkles, Maximize2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TechniqueOption } from "./TechniqueOption";
import { invokeExternalDb } from "@/lib/external-db";
import type { PrintAreaV2 } from "@/hooks/useGravacaoPriceV2";
import type { TechniqueVariant } from "@/hooks/useGravacaoPriceV2";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";

export interface LocationGroupData {
  groupKey: string;
  componentName: string;
  locationName: string;
  locationCode: string;
  isPrimary: boolean;
  maxWidth: number;
  maxHeight: number;
  areas: PrintAreaV2[];
}

/** Flattened technique+variant combo for rendering */
interface FlatOption {
  key: string;           // varianteId (unique key)
  techniqueName: string;
  variant: TechniqueVariant;
  areaMaxWidth: number;
  areaMaxHeight: number;
  isCurved: boolean;
}

interface LocationCardProps {
  group: LocationGroupData;
  isExpanded: boolean;
  selectedOptionKey: string | null;
  quantity: number;
  onToggle: () => void;
  onSelectOption: (optionKey: string, priceData: CustomizationPriceV2 | null) => void;
}

/** Flatten all areas→techniques→variantes into individual options, deduplicating by variante_id */
function flattenOptions(areas: PrintAreaV2[]): FlatOption[] {
  const seen = new Set<string>();
  const options: FlatOption[] = [];
  for (const area of areas) {
    for (const tech of area.techniques) {
      for (const variant of tech.variantes) {
        if (seen.has(variant.variante_id)) continue;
        seen.add(variant.variante_id);
        options.push({
          key: variant.variante_id,
          techniqueName: tech.nome,
          variant,
          areaMaxWidth: area.max_width,
          areaMaxHeight: area.max_height,
          isCurved: area.is_curved,
        });
      }
    }
  }
  return options;
}

/** Fetch area_maxima_texto for each variante_id from tabela_preco_gravacao_oficial */
function useVariantDimensions(varianteIds: string[]) {
  return useQuery({
    queryKey: ['variant-dimensions', varianteIds.sort().join(',')],
    queryFn: async (): Promise<Map<string, string>> => {
      if (!varianteIds.length) return new Map();
      
      const result = await invokeExternalDb<{
        tecnica_variante_id: string;
        area_maxima_texto: string | null;
        area_maxima_cm2: number | null;
      }>({
        table: 'tabela_preco_gravacao_oficial',
        operation: 'select',
        select: 'tecnica_variante_id,area_maxima_texto,area_maxima_cm2',
        filters: { ativo: true },
        limit: 100,
      });

      const map = new Map<string, string>();
      if (result?.records) {
        for (const row of result.records) {
          if (row.tecnica_variante_id && varianteIds.includes(row.tecnica_variante_id)) {
            const text = row.area_maxima_texto || (row.area_maxima_cm2 ? `${row.area_maxima_cm2}cm²` : null);
            if (text) map.set(row.tecnica_variante_id, text);
          }
        }
      }
      return map;
    },
    enabled: varianteIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

export function LocationCard({
  group,
  isExpanded,
  selectedOptionKey,
  quantity,
  onToggle,
  onSelectOption,
}: LocationCardProps) {
  const hasSelection = selectedOptionKey !== null;

  const flatOptions = useMemo(() => flattenOptions(group.areas), [group.areas]);
  
  const varianteIds = useMemo(() => flatOptions.map(o => o.key), [flatOptions]);
  const { data: dimensionsMap } = useVariantDimensions(varianteIds);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn(
          "rounded-xl border transition-all duration-200",
          hasSelection
            ? "bg-card border-primary/40 shadow-lg shadow-primary/5"
            : isExpanded
              ? "bg-card border-primary/20 shadow-md shadow-primary/5"
              : "bg-card/50 border-border hover:border-primary/20 hover:bg-card"
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  hasSelection
                    ? "bg-primary text-primary-foreground"
                    : isExpanded
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-secondary-foreground"
                )}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {group.componentName} — {group.locationName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" />
                    até {group.maxWidth}×{group.maxHeight}cm
                  </span>
                  <span className="text-sm text-muted-foreground">
                    · {flatOptions.length} opç{flatOptions.length !== 1 ? "ões" : "ão"}
                  </span>
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent forceMount>
          <div className={cn(
            "px-4 pb-4 space-y-2",
            !isExpanded && "hidden"
          )}>
            {flatOptions.map((opt) => (
              <TechniqueOption
                key={opt.key}
                optionKey={opt.key}
                techniqueName={opt.techniqueName}
                variant={opt.variant}
                areaMaxWidth={opt.areaMaxWidth}
                areaMaxHeight={opt.areaMaxHeight}
                areaMaxText={dimensionsMap?.get(opt.key) ?? null}
                isCurved={opt.isCurved}
                isSelected={selectedOptionKey === opt.key}
                quantity={quantity}
                onSelect={onSelectOption}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}