/**
 * print-area-grouping.ts — Agrupamento de áreas de gravação por local físico
 * 
 * LÓGICA: Agrupa áreas de product_print_areas por component_name + location_name
 * Cada grupo = 1 local físico do produto (ex: "Corpo — Lado A")
 * Cada área dentro do grupo = 1 opção de técnica (ex: Fiber Laser, UV Digital)
 * 
 * PRICING: Usa fn_get_customization_price (v1) com area_id
 * NÃO depende de techniques[] da v2 (pode estar vazio para áreas novas)
 */

import type { PrintAreaV2 } from '@/hooks/useGravacaoPriceV2';
import type { EngravingLocation, AvailableTechnique } from '@/types/domain/simulator-wizard';

/**
 * Agrupa PrintAreaV2[] (retorno de fn_get_product_print_areas_v2)
 * em EngravingLocation[] agrupados por component_name + location_name.
 * 
 * Antes: 9 áreas → 9 cards (1:1)
 * Depois: 9 áreas → 3 cards (agrupados por local físico)
 * 
 * Cada EngravingLocation.availableTechniques contém 1 entry por área do grupo.
 */
export function groupPrintAreasToLocations(areas: PrintAreaV2[]): EngravingLocation[] {
  if (!areas.length) return [];

  const groups = new Map<string, {
    areas: PrintAreaV2[];
    displayOrder: number;
  }>();

  for (const area of areas) {
    const componentName = area.component_name || 'Principal';
    const locationName = area.location_name || area.area_name;
    const key = `${componentName}|${locationName}`;

    if (!groups.has(key)) {
      groups.set(key, { areas: [], displayOrder: area.display_order });
    }
    const group = groups.get(key)!;
    group.areas.push(area);
    group.displayOrder = Math.min(group.displayOrder, area.display_order);
  }

  return [...groups.entries()]
    .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
    .map(([key, group]) => {
      const [componentName, locationName] = key.split('|');
      const maxWidth = Math.max(...group.areas.map(a => a.max_width));
      const maxHeight = Math.max(...group.areas.map(a => a.max_height));
      const isPrimary = group.areas.some(a => a.is_primary);
      const firstArea = group.areas[0];

      const availableTechniques: AvailableTechnique[] = group.areas.map(area => {
        // Tentar obter max_colors de techniques[] se disponível
        let maxColors: number | null = null;
        let techniqueId = area.area_id;

        if (area.techniques.length > 0) {
          const tech = area.techniques[0];
          techniqueId = tech.id;
          const firstVariant = tech.variantes?.[0];
          if (firstVariant) {
            maxColors = firstVariant.max_colors;
          }
        }

        return {
          id: area.area_id,
          printAreaId: area.area_id,
          techniqueId,
          techniqueName: area.area_name,
          techniqueCode: area.area_code,
          maxColors,
          isDefault: area.is_primary,
          isCurved: area.is_curved,
          hasPricing: true, // v1 funciona para todas as áreas
          // Dimensões específicas desta área/técnica
          areaMaxWidth: area.max_width,
          areaMaxHeight: area.max_height,
        };
      });

      return {
        id: key,
        componentId: key,
        componentCode: firstArea.component_code || firstArea.area_code.split('-')[0] || 'COMP',
        componentName,
        locationCode: firstArea.location_code || firstArea.area_code,
        locationName,
        maxWidthCm: maxWidth,
        maxHeightCm: maxHeight,
        maxAreaCm2: null,
        areaImageUrl: null,
        isFromGroup: false,
        availableTechniques,
      };
    });
}
