/**
 * useMockupTechniques — Filter techniques by product using fn_get_product_customization_options RPC
 * 
 * When a product is selected, fetches its REAL customization options from the external DB
 * and returns ONLY the techniques that are configured for that product.
 * NO FALLBACKS — if the product has no techniques, returns empty.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { invokeExternalRpc } from "@/lib/external-rpc";

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

export interface TechniqueWithLimits extends Technique {
  /** Max width in cm */
  maxWidth: number | null;
  /** Max height in cm */
  maxHeight: number | null;
  /** Area name (e.g., "Lado A — Fiber Laser | Plana") */
  areaName: string | null;
  /** Location name (e.g., "Lado A") */
  locationName: string | null;
}

/** Shape of each option inside a location from the RPC */
interface CustomizationOption {
  technique_id: string;
  tecnica_nome: string;
  codigo_tabela: string;
  grupo_tecnica: string;
  max_width: number;
  max_height: number;
  efetiva_largura_max: number;
  efetiva_altura_max: number;
  max_cores: number;
  cobra_por_cor: boolean;
  custo_setup: number;
  is_curved: boolean;
  usa_dimensao: boolean;
  variacao_label: string;
  shape: string;
}

interface CustomizationLocation {
  location_code: string;
  location_name: string;
  location_order: number;
  options: CustomizationOption[];
}

interface CustomizationResponse {
  product_id: string;
  locations: CustomizationLocation[];
}

/**
 * Fetches product customization options from external DB via RPC.
 */
export function useProductCustomizationOptionsForMockup(productId: string | undefined) {
  return useQuery({
    queryKey: ['mockup-customization-options', productId],
    queryFn: () => invokeExternalRpc<CustomizationResponse>(
      'fn_get_product_customization_options',
      { p_product_id: productId! }
    ),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Filters techniques to ONLY those available for the selected product.
 * Uses fn_get_product_customization_options RPC — NO FALLBACKS.
 * 
 * Returns unique techniques with dimension limits from the best (largest) area.
 */
export function useFilteredTechniques(
  techniques: Technique[],
  selectedProduct: { id: string } | null
): TechniqueWithLimits[] {
  const { data: customizationData } = useProductCustomizationOptionsForMockup(selectedProduct?.id);

  return useMemo(() => {
    // No product selected -> return all techniques without limits
    if (!selectedProduct || !techniques.length) {
      return techniques.map(t => ({
        ...t,
        maxWidth: null,
        maxHeight: null,
        areaName: null,
        locationName: null,
      }));
    }

    // No customization data yet (loading) -> return empty to avoid showing wrong list
    if (!customizationData?.locations) {
      return [];
    }

    // Extract all unique techniques from all locations
    // Use a map keyed by tecnica_nome to deduplicate, keeping the best dimensions
    const techniqueMap = new Map<string, {
      option: CustomizationOption;
      locationName: string;
    }>();

    for (const location of customizationData.locations) {
      for (const option of location.options) {
        const key = option.tecnica_nome;
        const existing = techniqueMap.get(key);
        
        const area = option.efetiva_largura_max * option.efetiva_altura_max;
        const existingArea = existing 
          ? existing.option.efetiva_largura_max * existing.option.efetiva_altura_max 
          : 0;
        
        if (!existing || area > existingArea) {
          techniqueMap.set(key, {
            option,
            locationName: location.location_name,
          });
        }
      }
    }

    if (techniqueMap.size === 0) {
      return [];
    }

    // Build the result — use technique_id from the RPC as the ID
    const result: TechniqueWithLimits[] = [];
    
    for (const [techName, { option, locationName }] of techniqueMap.entries()) {
      result.push({
        id: option.technique_id,
        name: option.tecnica_nome,
        code: option.codigo_tabela || null,
        maxWidth: option.efetiva_largura_max || null,
        maxHeight: option.efetiva_altura_max || null,
        areaName: `${locationName} — ${option.tecnica_nome}`,
        locationName,
      });
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [techniques, selectedProduct, customizationData]);
}
