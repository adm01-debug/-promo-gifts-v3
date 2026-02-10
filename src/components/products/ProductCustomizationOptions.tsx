/**
 * ProductCustomizationOptions — Opções de personalização agrupadas por local físico
 * 
 * Usa fn_get_product_print_areas_v2 (external RPC) + agrupamento por
 * component_name + location_name para exibir cards colapsáveis.
 * 
 * Cada card = 1 local físico (ex: "Corpo — Lado A")
 * Dentro do card = técnicas disponíveis com dimensões
 */

import { useState, useMemo } from "react";
import {
  Paintbrush,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Sparkles,
  Palette,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useProductPrintAreasV2 } from "@/hooks/useGravacaoPriceV2";
import { groupPrintAreasToLocations } from "@/lib/print-area-grouping";

interface ProductCustomizationOptionsProps {
  productId: string;
  productSku?: string;
}

export function ProductCustomizationOptions({ productId }: ProductCustomizationOptionsProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { data: areas, isLoading } = useProductPrintAreasV2(productId);

  const groupedLocations = useMemo(() => {
    if (!areas?.length) return [];
    return groupPrintAreasToLocations(areas);
  }, [areas]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!groupedLocations.length) return null;

  const totalTechniques = groupedLocations.reduce(
    (acc, loc) => acc + loc.availableTechniques.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Paintbrush className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Opções de Personalização
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {groupedLocations.length} loca{groupedLocations.length !== 1 ? "is" : "l"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalTechniques} técnica{totalTechniques !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Grouped Location Cards */}
      <div className="space-y-2">
        {groupedLocations.map((location) => {
          const isExpanded = expandedGroups.includes(location.id);

          return (
            <Collapsible
              key={location.id}
              open={isExpanded}
              onOpenChange={() => toggleGroup(location.id)}
            >
              <div
                className={cn(
                  "rounded-xl border transition-all duration-200",
                  isExpanded
                    ? "bg-card border-primary/30 shadow-lg shadow-primary/5"
                    : "bg-card/50 border-border hover:border-primary/20 hover:bg-card"
                )}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                          isExpanded
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {location.componentName} — {location.locationName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Maximize2 className="h-3 w-3" />
                            até {location.maxWidthCm}×{location.maxHeightCm}cm
                          </span>
                          <span className="text-sm text-muted-foreground">
                            · {location.availableTechniques.length} técnica
                            {location.availableTechniques.length !== 1 ? "s" : ""}
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

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2">
                    {location.availableTechniques.map((tech) => (
                      <div
                        key={tech.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              {tech.techniqueName}
                            </p>
                            {tech.areaMaxWidth && tech.areaMaxHeight && (
                              <p className="text-xs text-muted-foreground">
                                {tech.areaMaxWidth}×{tech.areaMaxHeight}cm
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {tech.maxColors !== null && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              {tech.maxColors === 0
                                ? "Full Color"
                                : tech.maxColors === 1
                                ? "1 cor"
                                : `até ${tech.maxColors} cores`}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] h-5 font-mono">
                            {tech.techniqueCode}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        {totalTechniques} técnica{totalTechniques !== 1 ? "s" : ""} de gravação
        disponíve{totalTechniques !== 1 ? "is" : "l"} em{" "}
        {groupedLocations.length} loca{groupedLocations.length !== 1 ? "is" : "l"}
      </div>
    </div>
  );
}
