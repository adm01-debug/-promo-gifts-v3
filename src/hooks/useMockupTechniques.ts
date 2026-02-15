/**
 * useMockupTechniques — Filter techniques by product's REAL print areas
 * 
 * Fetches personalization_areas from the external DB via fetchPrintAreasFromProduct,
 * extracts technique names from area_name ("Location — Technique"),
 * and returns only matching techniques + their dimension limits.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPrintAreasFromProduct, type PrintAreaFromProduct } from "@/lib/fetch-print-areas";

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

export interface TechniqueWithLimits extends Technique {
  /** Max width in cm from the print area */
  maxWidth: number | null;
  /** Max height in cm from the print area */
  maxHeight: number | null;
  /** Area name from the product (e.g., "Lado A — Laser") */
  areaName: string | null;
  /** Location extracted from area_name */
  locationName: string | null;
}

/**
 * Fetches product print areas from external DB.
 */
export function useProductPrintAreas(productId: string | undefined) {
  return useQuery({
    queryKey: ['mockup-print-areas', productId],
    queryFn: () => fetchPrintAreasFromProduct(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Known mapping of technique name fragments to technique codes/names
 * to improve fuzzy matching between area_name and personalization_techniques.
 */
const TECHNIQUE_ALIASES: Record<string, string[]> = {
  'laser': ['fiber laser', 'laser fibra', 'co2 laser', 'laser co2', 'laser uv'],
  'serigrafia': ['silk', 'serigrafia têxtil', 'serigrafia vinílica', 'serigrafia vinil'],
  'uv digital': ['uv digital', 'impressão uv'],
  'sublimação': ['sublimacao', 'sublimação'],
  'bordado': ['bordado'],
  'tampografia': ['tampografia'],
  'hot stamping': ['hot stamping'],
  'transfer': ['transfer', 'dtf'],
  'adesivo': ['adesivo resinado', 'adesivo vinil'],
  'filme de recorte': ['filme de recorte', 'recorte'],
  'etiqueta': ['etiqueta'],
  'decalque': ['decalque'],
  'emborrachado': ['emborrachado'],
};

/**
 * Filters techniques list to only those compatible with the product's print areas.
 * Returns TechniqueWithLimits[] including dimension constraints.
 */
export function useFilteredTechniques(
  techniques: Technique[],
  selectedProduct: { id: string } | null
): TechniqueWithLimits[] {
  const { data: printAreas } = useProductPrintAreas(selectedProduct?.id);

  return useMemo(() => {
    // No product or no techniques -> return all without limits
    if (!selectedProduct || !techniques.length) {
      return techniques.map(t => ({
        ...t,
        maxWidth: null,
        maxHeight: null,
        areaName: null,
        locationName: null,
      }));
    }

    // No print areas loaded yet or empty -> return empty (forces user to wait)
    if (!printAreas || printAreas.length === 0) {
      return [];
    }

    // Extract technique terms from area_name: "Location — Technique"
    const areasByTechnique = new Map<string, PrintAreaFromProduct>();
    for (const area of printAreas) {
      if (!area.is_active) continue;
      const areaName = area.area_name || '';
      const parts = areaName.split(' — ');
      if (parts.length > 1) {
        const techPart = parts[1].trim().toLowerCase();
        // Store with the best (largest) dimensions
        const existing = areasByTechnique.get(techPart);
        if (!existing || (area.max_width * area.max_height) > (existing.max_width * existing.max_height)) {
          areasByTechnique.set(techPart, area);
        }
      }
    }

    if (areasByTechnique.size === 0) {
      return [];
    }

    // Match techniques against extracted area technique names
    const filtered: TechniqueWithLimits[] = [];
    const matchedAreaKeys = new Set<string>();

    for (const technique of techniques) {
      const tName = technique.name.toLowerCase();
      const tCode = (technique.code || '').toLowerCase();

      let bestMatch: { area: PrintAreaFromProduct; areaKey: string } | null = null;

      for (const [areaKey, area] of areasByTechnique.entries()) {
        // Direct substring match
        if (
          tName.includes(areaKey) || areaKey.includes(tName) ||
          (tCode && (areaKey.includes(tCode) || tCode.includes(areaKey)))
        ) {
          bestMatch = { area, areaKey };
          break;
        }

        // Check via aliases
        for (const [baseKey, aliases] of Object.entries(TECHNIQUE_ALIASES)) {
          const areaMatchesBase = areaKey.includes(baseKey) || aliases.some(a => areaKey.includes(a));
          const techMatchesBase = tName.includes(baseKey) || aliases.some(a => tName.includes(a));
          if (areaMatchesBase && techMatchesBase) {
            // More specific match: check if the specific variant matches
            // e.g., "Fiber Laser | Plana" should match area "Laser" but also area "Fiber Laser"
            bestMatch = { area, areaKey };
            break;
          }
        }
        if (bestMatch) break;
      }

      if (bestMatch) {
        const locationParts = bestMatch.area.area_name?.split(' — ');
        filtered.push({
          ...technique,
          maxWidth: bestMatch.area.max_width || null,
          maxHeight: bestMatch.area.max_height || null,
          areaName: bestMatch.area.area_name || null,
          locationName: locationParts?.[0]?.trim() || null,
        });
        matchedAreaKeys.add(bestMatch.areaKey);
      }
    }

    // If filtering yields nothing (data mismatch), return all as fallback
    if (filtered.length === 0) {
      return techniques.map(t => ({
        ...t,
        maxWidth: null,
        maxHeight: null,
        areaName: null,
        locationName: null,
      }));
    }

    return filtered;
  }, [techniques, selectedProduct, printAreas]);
}
