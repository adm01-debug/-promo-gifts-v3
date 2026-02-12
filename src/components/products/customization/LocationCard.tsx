/**
 * LocationCard — Card colapsável por local físico do produto
 * 
 * HIERARQUIA DE SELEÇÃO (v5.9):
 * 1. Local físico (este card)
 * 2. Grupo de técnica (Laser, Serigrafia, UV Digital…)
 * 3. Variação dentro do grupo (Plana, Cilíndrica…)
 * 4. Preço + cores/tamanho
 */

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Sparkles, Maximize2, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TechniqueOption } from "./TechniqueOption";
import type { PrintAreaV2 } from "@/hooks/useGravacaoPriceV2";
import type { CustomizationPriceFlat } from "@/hooks/useGravacaoPriceV2";

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

interface LocationCardProps {
  group: LocationGroupData;
  isExpanded: boolean;
  selectedAreaId: string | null;
  quantity: number;
  onToggle: () => void;
  onSelectArea: (areaId: string, priceData: CustomizationPriceFlat | null) => void;
}

// ============================================
// HELPERS: Agrupamento por técnica
// ============================================

interface TechniqueGroup {
  groupCode: string;
  groupLabel: string;
  areas: PrintAreaV2[];
}

/** Extrai o label do grupo técnico do area_name: "Lado A — Laser" → "Laser" */
function extractTechLabel(areaName: string): string {
  const parts = areaName.split(' — ');
  return parts.length > 1 ? parts[parts.length - 1] : areaName;
}

/** Extrai o label da variação do nome da tabela de preço
 *  Ex: "Serigrafia Vinílica | UV | Cilíndrica" → "UV · Cilíndrica"
 *  Ex: "Fiber Laser | Plana" → "Plana"
 *  Ex: "Impressão Digital UV" → "" (sem variação)
 */
function extractVariationLabel(techniqueName: string | null): string {
  if (!techniqueName) return '';
  const parts = techniqueName.split('|').map(s => s.trim());
  if (parts.length > 1) {
    return parts.slice(1).join(' · ');
  }
  return '';
}

/** Agrupa áreas por grupo_tecnica */
function groupAreasByTechnique(areas: PrintAreaV2[]): TechniqueGroup[] {
  const groups = new Map<string, TechniqueGroup>();

  for (const area of areas) {
    const groupCode = area.grupo_tecnica || extractTechLabel(area.area_name);

    if (!groups.has(groupCode)) {
      groups.set(groupCode, {
        groupCode,
        groupLabel: extractTechLabel(area.area_name),
        areas: [],
      });
    }
    groups.get(groupCode)!.areas.push(area);
  }

  return [...groups.values()];
}

/** Encontra o groupCode que contém um areaId */
function findGroupForArea(groups: TechniqueGroup[], areaId: string | null): string | null {
  if (!areaId) return null;
  for (const g of groups) {
    if (g.areas.some(a => a.area_id === areaId)) return g.groupCode;
  }
  return null;
}

// ============================================
// COMPONENT
// ============================================

export function LocationCard({
  group,
  isExpanded,
  selectedAreaId,
  quantity,
  onToggle,
  onSelectArea,
}: LocationCardProps) {
  const hasSelection = selectedAreaId !== null;
  const techniqueCount = group.areas.length;

  // Agrupa as áreas por técnica
  const techniqueGroups = useMemo(
    () => groupAreasByTechnique(group.areas),
    [group.areas]
  );

  // Auto-expand o grupo que contém a área selecionada
  const initialGroup = useMemo(
    () => findGroupForArea(techniqueGroups, selectedAreaId),
    [techniqueGroups, selectedAreaId]
  );

  const [expandedGroupCode, setExpandedGroupCode] = useState<string | null>(initialGroup);

  const handleGroupToggle = (groupCode: string) => {
    setExpandedGroupCode(prev => prev === groupCode ? null : groupCode);
  };

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
                    · {techniqueCount} técnica{techniqueCount !== 1 ? "s" : ""}
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
            "px-4 pb-4 space-y-1.5",
            !isExpanded && "hidden"
          )}>
            {techniqueGroups.map((techGroup) => {
              const isGroupExpanded = expandedGroupCode === techGroup.groupCode;
              const hasMultipleVariations = techGroup.areas.length > 1;
              const groupHasSelection = techGroup.areas.some(a => a.area_id === selectedAreaId);

              // Se só tem 1 variação, renderiza direto sem nível intermediário
              if (!hasMultipleVariations) {
                const area = techGroup.areas[0];
                return (
                  <TechniqueOption
                    key={area.area_id}
                    areaId={area.area_id}
                    areaName={area.area_name}
                    label={techGroup.groupLabel}
                    variationLabel={extractVariationLabel(area.technique_name)}
                    areaMaxWidth={area.max_width}
                    areaMaxHeight={area.max_height}
                    isCurved={area.is_curved}
                    isSelected={selectedAreaId === area.area_id}
                    quantity={quantity}
                    onSelect={onSelectArea}
                  />
                );
              }

              // Múltiplas variações → nível intermediário
              return (
                <div key={techGroup.groupCode} className="space-y-1">
                  {/* Header do grupo de técnica */}
                  <button
                    className={cn(
                      "w-full p-3 rounded-lg flex items-center justify-between transition-all duration-200 border",
                      groupHasSelection
                        ? "bg-primary/10 border-primary/30"
                        : isGroupExpanded
                          ? "bg-secondary/80 border-border"
                          : "bg-secondary/40 border-border/30 hover:bg-secondary/60 hover:border-border/50"
                    )}
                    onClick={() => handleGroupToggle(techGroup.groupCode)}
                  >
                    <div className="flex items-center gap-2.5">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isGroupExpanded && "rotate-90"
                        )}
                      />
                      <span className="font-medium text-sm text-foreground">
                        {techGroup.groupLabel}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {techGroup.areas.length} variações
                      </Badge>
                    </div>
                    {groupHasSelection && (
                      <Badge className="text-[10px] h-5 bg-primary/20 text-primary border-primary/30">
                        selecionado
                      </Badge>
                    )}
                  </button>

                  {/* Variações expandidas */}
                  {isGroupExpanded && (
                    <div className="pl-4 space-y-1 border-l-2 border-border/50 ml-4">
                      {techGroup.areas.map((area) => (
                        <TechniqueOption
                          key={area.area_id}
                          areaId={area.area_id}
                          areaName={area.area_name}
                          label={extractVariationLabel(area.technique_name) || extractTechLabel(area.area_name)}
                          areaMaxWidth={area.max_width}
                          areaMaxHeight={area.max_height}
                          isCurved={area.is_curved}
                          isSelected={selectedAreaId === area.area_id}
                          quantity={quantity}
                          onSelect={onSelectArea}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
