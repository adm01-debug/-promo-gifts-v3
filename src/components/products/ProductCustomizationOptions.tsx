/**
 * ProductCustomizationOptions — Opções de personalização agrupadas por local físico
 * 
 * FLUXO HÍBRIDO v2/v1:
 * - fn_get_product_print_areas_v2 para listar e agrupar áreas
 * - fn_get_customization_price (v1) para calcular preço por area_id
 * 
 * 9 registros → 3 cards (agrupados por component_name + location_name)
 * Cada card = 1 local físico com técnicas selecionáveis
 */

import { useState, useMemo, useCallback } from "react";
import { Paintbrush } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductPrintAreasV2 } from "@/hooks/useGravacaoPriceV2";
import { LocationCard, type LocationGroupData } from "./customization/LocationCard";
import type { PrintAreaV2 } from "@/hooks/useGravacaoPriceV2";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";

interface ProductCustomizationOptionsProps {
  productId: string;
  quantity?: number;
  onSelectionChange?: (selections: Map<string, { areaId: string; price: CustomizationPriceV2 | null }>) => void;
}

/** Group PrintAreaV2[] by component_name + location_name */
function groupAreasToLocations(areas: PrintAreaV2[]): LocationGroupData[] {
  if (!areas.length) return [];

  const groups = new Map<string, {
    componentName: string;
    locationName: string;
    areas: PrintAreaV2[];
    displayOrder: number;
  }>();

  for (const area of areas) {
    const componentName = area.component_name || 'Principal';
    const locationName = area.location_name || area.area_name.split(' — ')[0] || area.area_name;
    const key = `${componentName}|${locationName}`;

    if (!groups.has(key)) {
      groups.set(key, {
        componentName,
        locationName,
        areas: [],
        displayOrder: area.display_order,
      });
    }
    const group = groups.get(key)!;
    group.areas.push(area);
    group.displayOrder = Math.min(group.displayOrder, area.display_order);
  }

  return [...groups.entries()]
    .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
    .map(([key, group]) => ({
      groupKey: key,
      componentName: group.componentName,
      locationName: group.locationName,
      maxWidth: Math.max(...group.areas.map(a => a.max_width)),
      maxHeight: Math.max(...group.areas.map(a => a.max_height)),
      areas: group.areas.sort((a, b) => a.display_order - b.display_order),
    }));
}

export function ProductCustomizationOptions({
  productId,
  quantity = 100,
  onSelectionChange,
}: ProductCustomizationOptionsProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<Map<string, { areaId: string; price: CustomizationPriceV2 | null }>>(new Map());

  const { data: areas, isLoading } = useProductPrintAreasV2(productId);

  const groupedLocations = useMemo(() => {
    if (!areas?.length) return [];
    return groupAreasToLocations(areas);
  }, [areas]);

  const handleToggle = useCallback((groupKey: string) => {
    setExpandedGroup(prev => prev === groupKey ? null : groupKey);
  }, []);

  const handleSelectArea = useCallback((groupKey: string, areaId: string, priceData: CustomizationPriceV2 | null) => {
    setSelectedAreas(prev => {
      const next = new Map(prev);
      if (next.get(groupKey)?.areaId === areaId) {
        next.delete(groupKey); // Toggle off
      } else {
        next.set(groupKey, { areaId, price: priceData });
      }
      onSelectionChange?.(next);
      return next;
    });
  }, [onSelectionChange]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!groupedLocations.length) return null;

  const totalTechniques = groupedLocations.reduce(
    (acc, loc) => acc + loc.areas.length,
    0
  );

  const totalSelected = selectedAreas.size;
  const totalPrice = [...selectedAreas.values()]
    .reduce((sum, sel) => sum + (sel.price?.unit_price ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Paintbrush className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Onde deseja personalizar?
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

      {/* Location Cards */}
      <div className="space-y-2">
        {groupedLocations.map((group) => (
          <LocationCard
            key={group.groupKey}
            group={group}
            isExpanded={expandedGroup === group.groupKey}
            selectedAreaId={selectedAreas.get(group.groupKey)?.areaId ?? null}
            quantity={quantity}
            onToggle={() => handleToggle(group.groupKey)}
            onSelectArea={(areaId, priceData) =>
              handleSelectArea(group.groupKey, areaId, priceData)
            }
          />
        ))}
      </div>

      {/* Summary */}
      {totalSelected > 0 ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <span className="text-foreground font-medium">
            {totalSelected} loca{totalSelected !== 1 ? "is" : "l"} selecionado{totalSelected !== 1 ? "s" : ""}
          </span>
          <span className="text-primary font-semibold">
            + R$ {totalPrice.toFixed(2)}/un em gravação
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          Selecione um local e uma técnica para ver o preço de gravação
        </div>
      )}
    </div>
  );
}
