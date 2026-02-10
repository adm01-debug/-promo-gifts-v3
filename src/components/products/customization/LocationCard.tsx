/**
 * LocationCard — Card colapsável por local físico do produto
 * 
 * Header: {component_name} — {location_name} + dimensão max + nº técnicas
 * Body: lista de TechniqueOption (1 selecionável por card)
 * 
 * Usa forceMount + hidden para evitar remount de TechniqueOptions
 * ao colapsar/expandir, preservando preços já carregados.
 */

import { ChevronDown, ChevronUp, Sparkles, Maximize2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TechniqueOption } from "./TechniqueOption";
import type { PrintAreaV2 } from "@/hooks/useGravacaoPriceV2";
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

interface LocationCardProps {
  group: LocationGroupData;
  isExpanded: boolean;
  selectedAreaId: string | null;
  quantity: number;
  onToggle: () => void;
  onSelectArea: (areaId: string, priceData: CustomizationPriceV2 | null) => void;
}

export function LocationCard({
  group,
  isExpanded,
  selectedAreaId,
  quantity,
  onToggle,
  onSelectArea,
}: LocationCardProps) {
  const hasSelection = selectedAreaId !== null;

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
                    · {group.areas.length} técnica
                    {group.areas.length !== 1 ? "s" : ""} disponíve
                    {group.areas.length !== 1 ? "is" : "l"}
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
            {group.areas.map((area) => (
              <TechniqueOption
                key={area.area_id}
                areaId={area.area_id}
                areaCode={area.area_code}
                areaName={area.area_name}
                maxWidth={area.max_width}
                maxHeight={area.max_height}
                isCurved={area.is_curved}
                isSelected={selectedAreaId === area.area_id}
                quantity={quantity}
                onSelect={onSelectArea}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
