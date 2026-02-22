/**
 * Resolve a imagem específica de um produto baseado nos filtros de cor ativos.
 * 
 * Lógica SIMPLES e direta:
 * 1. Percorre product.colors (que já tem group, image, images do enriquecimento)
 * 2. Faz match pelo group slug ou variation slug
 * 3. Retorna color.image (thumbnail da variante daquela cor)
 */

import type { Product, ProductColor } from "@/hooks/useProducts";

export interface ActiveColorFilter {
  groups: string[];     // slugs dos grupos selecionados (ex: ['rosa', 'azul'])
  variations: string[]; // slugs das variações selecionadas (ex: ['azul-marinho'])
}

/**
 * Dado um produto e os filtros de cor ativos, retorna a URL da imagem
 * da cor que corresponde ao filtro, ou undefined para fallback.
 */
export function resolveColorImage(
  product: Product,
  activeColors: ActiveColorFilter | null | undefined
): string | undefined {
  if (!activeColors) return undefined;
  if (!activeColors.groups.length && !activeColors.variations.length) return undefined;
  if (!product.colors?.length) return undefined;

  // Prioridade 1: Variação específica (ex: "azul-marinho")
  if (activeColors.variations.length > 0) {
    for (const variationSlug of activeColors.variations) {
      const slugNormalized = variationSlug.toLowerCase().replace(/-/g, ' ');
      const match = product.colors.find(c => {
        const colorName = c.name.toLowerCase();
        return colorName.includes(slugNormalized) || slugNormalized.includes(colorName);
      });
      if (match) {
        const img = getColorImage(match);
        if (img) return img;
      }
    }
  }

  // Prioridade 2: Grupo de cor (ex: "rosa") — usa color.group detectado
  if (activeColors.groups.length > 0) {
    for (const groupSlug of activeColors.groups) {
      const groupNormalized = groupSlug.toLowerCase().replace(/-/g, ' ');
      const match = product.colors.find(c => {
        const colorGroup = c.group.toLowerCase();
        return colorGroup === groupNormalized || colorGroup.includes(groupNormalized);
      });
      if (match) {
        const img = getColorImage(match);
        if (img) return img;
      }
    }
  }

  return undefined;
}

/**
 * Extrai a melhor imagem de um ProductColor
 */
function getColorImage(color: ProductColor): string | undefined {
  // Prioridade: images[0] > image
  if (color.images?.length) return color.images[0];
  if (color.image) return color.image;
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
  if (!product.colors?.length) return undefined;

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
      const groupNormalized = slug.toLowerCase().replace(/-/g, ' ');
      const color = product.colors.find(c => 
        c.group.toLowerCase() === groupNormalized ||
        c.group.toLowerCase().includes(groupNormalized)
      );
      if (color) return color.name;
    }
  }

  return undefined;
}
