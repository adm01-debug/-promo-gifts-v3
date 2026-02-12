/**
 * print-area-grouping.ts — Agrupamento de áreas de gravação por local físico
 * 
 * ARQUITETURA DEFINITIVA (v5.9):
 * Agrupa áreas de product_print_areas por component_name + location_name
 * Cada grupo = 1 local físico do produto (ex: "Corpo — Lado A")
 * Cada área dentro do grupo = 1 opção de técnica (ex: Fiber Laser, UV Digital)
 * 
 * PRICING: Usa fn_get_customization_price com p_area_id
 * Cada área TEM seu próprio customization_price_table_id → tabela de preço
 */

import type { PrintAreaV2 } from '@/hooks/useGravacaoPriceV2';
import type { EngravingLocation, AvailableTechnique } from '@/types/domain/simulator-wizard';

/**
 * Agrupa PrintAreaV2[] em EngravingLocation[] por component_name + location_name.
 * 
 * Antes: 9 áreas → 9 cards (1:1)
 * Depois: 9 áreas → 3 cards (agrupados por local físico)
 * 
 * Cada EngravingLocation.availableTechniques contém 1 entry por área do grupo.
 * O preço é calculado via fn_get_customization_price usando area.area_id como p_area_id.
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
        // max_colors: da área ou da tabela vinculada
        const maxColors = area.max_colors;

        // hasPricing = true se a área tem tabela de preço vinculada
        const hasPricing = !!area.customization_price_table_id;

        return {
          id: area.area_id,
          printAreaId: area.area_id, // Usado como p_area_id na RPC
          techniqueId: area.area_id,
          techniqueName: area.area_name,
          techniqueCode: area.area_code,
          maxColors,
          isDefault: area.is_primary,
          isCurved: area.is_curved,
          hasPricing,
          // Dimensões específicas desta área/técnica
          areaMaxWidth: area.max_width,
          areaMaxHeight: area.max_height,
          // Info da tabela de preço (para exibição)
          grupoTecnica: area.grupo_tecnica,
          cobraPorCor: area.cobra_por_cor,
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
