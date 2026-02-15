/**
 * useMockupTechniques — Filter techniques by product's print areas
 * 
 * Loads the product's personalization_areas from external DB 
 * and returns only techniques compatible with the selected product.
 */

import { useMemo } from "react";

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

interface ProductLike {
  id: string;
  personalization_areas?: any[];
  [key: string]: any;
}

/**
 * Filters techniques list to only those compatible with the product.
 * If no product is selected or product has no print area data, returns all techniques.
 */
export function useFilteredTechniques(
  techniques: Technique[],
  selectedProduct: ProductLike | null
): Technique[] {
  return useMemo(() => {
    if (!selectedProduct || !techniques.length) return techniques;

    // Check if product has personalization_areas with technique info
    const areas = selectedProduct.personalization_areas;
    if (!areas || !Array.isArray(areas) || areas.length === 0) {
      return techniques; // No area data — show all
    }

    // Collect all technique codes/names from product's areas
    const areaTerms = new Set<string>();
    for (const area of areas) {
      // area_name format: "Location — Technique"
      const areaName = area.area_name || area.name || "";
      const parts = areaName.split(" — ");
      if (parts.length > 1) {
        areaTerms.add(parts[1].toLowerCase().trim());
      }
      // Also add any technique references
      if (area.technique_code) areaTerms.add(area.technique_code.toLowerCase());
      if (area.technique_name) areaTerms.add(area.technique_name.toLowerCase());
      // allowed_technique_ids
      if (Array.isArray(area.allowed_technique_ids)) {
        area.allowed_technique_ids.forEach((id: string) => areaTerms.add(id));
      }
    }

    if (areaTerms.size === 0) return techniques;

    // Filter techniques that match any area term
    const filtered = techniques.filter((t) => {
      const name = t.name.toLowerCase();
      const code = (t.code || "").toLowerCase();
      
      return Array.from(areaTerms).some(term => {
        // Match by ID (UUID)
        if (term === t.id) return true;
        // Match by code substring
        if (code && term.includes(code)) return true;
        if (code && code.includes(term)) return true;
        // Match by name substring
        if (name.includes(term)) return true;
        if (term.includes(name)) return true;
        return false;
      });
    });

    // If filtering yields nothing (data mismatch), show all as fallback
    return filtered.length > 0 ? filtered : techniques;
  }, [techniques, selectedProduct]);
}
