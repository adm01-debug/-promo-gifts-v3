/**
 * Resolve a imagem específica de um produto baseado nos filtros de cor ativos.
 * 
 * Lógica:
 * 1. Se há variações de cor filtradas → busca a variante que bate com o slug da variação
 * 2. Se há grupos de cor filtrados → busca a variante cujo grupo corresponde
 * 3. Se encontra uma variante com imagem → retorna a imagem
 * 4. Fallback → retorna undefined (usa imagem padrão do produto)
 */

import type { Product, ProductColor } from "@/hooks/useProducts";

export interface ActiveColorFilter {
  groups: string[];     // slugs dos grupos selecionados (ex: ['rosa', 'azul'])
  variations: string[]; // slugs das variações selecionadas (ex: ['azul-marinho'])
}

/**
 * Dado um produto e os filtros de cor ativos, retorna a URL da imagem
 * da variante que corresponde à cor filtrada, ou undefined para fallback.
 */
export function resolveColorImage(
  product: Product,
  activeColors: ActiveColorFilter | null | undefined
): string | undefined {
  if (!activeColors) return undefined;
  if (!activeColors.groups.length && !activeColors.variations.length) return undefined;
  if (!product.variations?.length) return undefined;

  // Build lookup: color name → variation (with image)
  const variationByColorName = new Map<string, any>();
  for (const v of product.variations) {
    if (v.color?.name) {
      variationByColorName.set(v.color.name.toLowerCase(), v);
    }
  }

  // Also build lookup by group using product.colors
  const colorNamesByGroup = new Map<string, string[]>();
  for (const c of product.colors) {
    const group = c.group.toLowerCase();
    if (!colorNamesByGroup.has(group)) colorNamesByGroup.set(group, []);
    colorNamesByGroup.get(group)!.push(c.name.toLowerCase());
  }

  // Prioridade 1: Variação específica (ex: "azul-marinho")
  if (activeColors.variations.length > 0) {
    for (const variationSlug of activeColors.variations) {
      const slugNormalized = variationSlug.toLowerCase().replace(/-/g, ' ');
      // Try exact match first
      for (const [colorName, variation] of variationByColorName) {
        if (colorName.includes(slugNormalized) || slugNormalized.includes(colorName)) {
          const img = getVariationImage(variation);
          if (img) return img;
        }
      }
    }
  }

  // Prioridade 2: Grupo de cor (ex: "rosa") — find first color in that group with an image
  if (activeColors.groups.length > 0) {
    for (const groupSlug of activeColors.groups) {
      const groupNormalized = groupSlug.toLowerCase().replace(/-/g, ' ');
      
      // Use the colors-by-group mapping to find color names in this group
      const colorsInGroup = colorNamesByGroup.get(groupNormalized) || [];
      
      // Try each color in the group
      for (const colorName of colorsInGroup) {
        const variation = variationByColorName.get(colorName);
        if (variation) {
          const img = getVariationImage(variation);
          if (img) return img;
        }
      }

      // Fallback: try fuzzy match on variation color names
      for (const [colorName, variation] of variationByColorName) {
        if (colorName.includes(groupNormalized) || groupNormalized.includes(colorName)) {
          const img = getVariationImage(variation);
          if (img) return img;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extrai a melhor imagem de uma variação
 */
function getVariationImage(variation: any): string | undefined {
  // Prioridade: images array > image singular
  if (variation.images?.length > 0) {
    const img = variation.images[0];
    return typeof img === 'string' ? img : (img?.url || img?.src || img?.image_url);
  }
  if (variation.image) {
    return typeof variation.image === 'string' ? variation.image : variation.image.url;
  }
  return undefined;
}

/**
 * Retorna o nome da cor que está sendo filtrada para o badge
 */
export function getActiveColorName(
  product: Product,
  activeColors: ActiveColorFilter | null | undefined
): string | undefined {
  if (!activeColors) return undefined;
  if (!activeColors.groups.length && !activeColors.variations.length) return undefined;

  // Prioridade: variação > grupo
  if (activeColors.variations.length > 0) {
    for (const slug of activeColors.variations) {
      const slugNormalized = slug.toLowerCase().replace(/-/g, ' ');
      const color = product.colors.find(c => 
        c.name.toLowerCase().includes(slugNormalized) || slugNormalized.includes(c.name.toLowerCase())
      );
      if (color) return color.name;
    }
  }

  if (activeColors.groups.length > 0) {
    for (const slug of activeColors.groups) {
      const slugNormalized = slug.toLowerCase().replace(/-/g, ' ');
      const color = product.colors.find(c => 
        c.name.toLowerCase().includes(slugNormalized) || 
        c.group.toLowerCase().includes(slugNormalized) ||
        slugNormalized.includes(c.name.toLowerCase())
      );
      if (color) return color.name;
    }
  }

  return undefined;
}
