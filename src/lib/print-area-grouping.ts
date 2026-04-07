/**
 * print-area-grouping — Utilitário para agrupar áreas de personalização
 * por componente e localização, facilitando exibição hierárquica no simulador.
 */
import type { PrintAreaWithTechniques, GroupedPrintArea } from "@/types/gravacao";

/**
 * Agrupa áreas de impressão/personalização por componente → localização → técnicas.
 * Áreas sem componente são agrupadas sob "Produto" (default).
 */
export function groupPrintAreasByComponent(
  areas: PrintAreaWithTechniques[]
): GroupedPrintArea[] {
  const componentMap = new Map<string, Map<string, GroupedPrintArea["locations"][number]["techniques"]>>();

  for (const area of areas) {
    const compName = area.component_name || "Produto";
    const compCode = compName.toLowerCase().replace(/\s+/g, "-");
    const locName = area.location_name || area.area_name || "Padrão";
    const locCode = locName.toLowerCase().replace(/\s+/g, "-");

    if (!componentMap.has(compName)) {
      componentMap.set(compName, new Map());
    }
    const locMap = componentMap.get(compName)!;

    if (!locMap.has(locName)) {
      locMap.set(locName, []);
    }

    const techniques = locMap.get(locName)!;

    for (const tech of area.techniques) {
      techniques.push({
        id: area.area_id,
        areaName: area.area_name,
        techniqueCode: tech.code,
        maxWidth: area.max_width ?? null,
        maxHeight: area.max_height ?? null,
        maxColors: tech.max_colors ?? null,
        areaCm2:
          area.max_width && area.max_height
            ? Math.round(area.max_width * area.max_height * 100) / 100
            : null,
        isCurved: area.is_curved,
        isPrimary: area.is_primary,
        servCode: tech.code ?? null,
      });
    }
  }

  const grouped: GroupedPrintArea[] = [];

  for (const [compName, locMap] of componentMap) {
    const locations: GroupedPrintArea["locations"] = [];

    for (const [locName, techniques] of locMap) {
      locations.push({
        locationName: locName,
        locationCode: locName.toLowerCase().replace(/\s+/g, "-"),
        techniques,
      });
    }

    // Sort: primary areas first
    locations.sort((a, b) => {
      const aPrimary = a.techniques.some((t) => t.isPrimary);
      const bPrimary = b.techniques.some((t) => t.isPrimary);
      if (aPrimary && !bPrimary) return -1;
      if (!aPrimary && bPrimary) return 1;
      return 0;
    });

    grouped.push({
      componentName: compName,
      componentCode: compName.toLowerCase().replace(/\s+/g, "-"),
      locations,
    });
  }

  // Sort: "Produto" first, then alphabetical
  grouped.sort((a, b) => {
    if (a.componentName === "Produto") return -1;
    if (b.componentName === "Produto") return 1;
    return a.componentName.localeCompare(b.componentName);
  });

  return grouped;
}

/**
 * Retorna todas as técnicas únicas de todas as áreas agrupadas.
 */
export function getUniqueTechniques(groups: GroupedPrintArea[]): string[] {
  const set = new Set<string>();
  for (const g of groups) {
    for (const loc of g.locations) {
      for (const tech of loc.techniques) {
        set.add(tech.techniqueCode);
      }
    }
  }
  return Array.from(set).sort();
}

/**
 * Filtra áreas agrupadas por técnica específica.
 */
export function filterGroupsByTechnique(
  groups: GroupedPrintArea[],
  techniqueCode: string
): GroupedPrintArea[] {
  return groups
    .map((g) => ({
      ...g,
      locations: g.locations
        .map((loc) => ({
          ...loc,
          techniques: loc.techniques.filter((t) => t.techniqueCode === techniqueCode),
        }))
        .filter((loc) => loc.techniques.length > 0),
    }))
    .filter((g) => g.locations.length > 0);
}

/**
 * Conta o total de áreas de impressão em todos os grupos.
 */
export function countTotalAreas(groups: GroupedPrintArea[]): number {
  let count = 0;
  for (const g of groups) {
    for (const loc of g.locations) {
      count += loc.techniques.length;
    }
  }
  return count;
}
