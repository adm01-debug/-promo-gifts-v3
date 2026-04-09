/**
 * useColorEnrichment — Batch-enriches lightweight products with color-specific
 * images and stock when a color filter is active.
 * 
 * Without this, lightweight products have colors: [] and the card cannot
 * show the variant image/stock for the filtered color.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeBatchBridge } from '@/lib/external-db';
import type { Product } from '@/types/product-catalog';
import { logger } from '@/lib/logger';

interface ColorEnrichmentData {
  image: string | null;
  stock: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  colorName: string | null;
  colorHex: string | null;
}

interface UseColorEnrichmentOptions {
  /** Product IDs to enrich (should be the visible/filtered set) */
  productIds: string[];
  /** Active color group slugs */
  colorGroups: string[];
  /** Active color variation slugs */
  colorVariations: string[];
}

/**
 * Returns a Map<productId, ColorEnrichmentData> for products matching the color filter.
 */
export function useColorEnrichment({ productIds, colorGroups, colorVariations }: UseColorEnrichmentOptions) {
  const hasFilter = colorGroups.length > 0 || colorVariations.length > 0;
  const idsKey = productIds.slice(0, 200).join(','); // cap key length
  const filterKey = [...colorGroups].sort().join(',') + '|' + [...colorVariations].sort().join(',');

  return useQuery({
    queryKey: ['color-enrichment', filterKey, idsKey, productIds.length],
    queryFn: async (): Promise<Map<string, ColorEnrichmentData>> => {
      if (!hasFilter || productIds.length === 0) return new Map();

      const enrichmentMap = new Map<string, ColorEnrichmentData>();

      // Step 1: Resolve color_ids from slugs
      const refResults = await invokeBatchBridge([
        {
          table: 'color_groups',
          operation: 'select' as const,
          select: 'id, slug',
          filters: { is_active: true },
          limit: 200,
          offset: 0,
          cacheKey: 'ref:color_groups',
        },
        {
          table: 'color_variations',
          operation: 'select' as const,
          select: 'id, name, slug, group_id, hex_code',
          filters: { is_active: true },
          limit: 500,
          offset: 0,
          cacheKey: 'ref:color_variations',
        },
      ]);

      const groupsData = refResults[0]?.success ? (refResults[0].data?.records || []) as Array<{ id: string; slug: string }> : [];
      const variationsData = refResults[1]?.success ? (refResults[1].data?.records || []) as Array<{ id: string; name: string; slug: string; group_id: string; hex_code?: string }> : [];

      const groupsBySlug = new Map(groupsData.map(g => [g.slug, g.id]));
      const variationsBySlug = new Map(variationsData.map(v => [v.slug, v]));
      const variationsById = new Map(variationsData.map(v => [v.id, v]));

      // Resolve target color_ids
      const targetColorIds = new Set<string>();

      for (const slug of colorVariations) {
        const v = variationsBySlug.get(slug);
        if (v) targetColorIds.add(v.id);
      }

      for (const slug of colorGroups) {
        const groupId = groupsBySlug.get(slug);
        if (groupId) {
          for (const v of variationsData) {
            if (v.group_id === groupId) targetColorIds.add(v.id);
          }
        }
      }

      if (targetColorIds.size === 0) return enrichmentMap;

      // Step 2: Fetch variants for these products with these color_ids
      const colorIdArray = [...targetColorIds];
      const CHUNK = 100;
      const allVariants: Array<{
        product_id: string;
        color_id: string | null;
        color_name: string | null;
        color_hex: string | null;
        color_code: string | null;
        stock_quantity: number | null;
        selected_thumbnail: string | null;
        images: string[] | null;
        id: string;
      }> = [];

      // Chunk product IDs
      for (let i = 0; i < productIds.length; i += CHUNK) {
        const pidChunk = productIds.slice(i, i + CHUNK);
        const results = await invokeBatchBridge([{
          table: 'product_variants',
          operation: 'select' as const,
          select: 'id, product_id, color_id, color_name, color_hex, color_code, stock_quantity, selected_thumbnail, images',
          filters: { is_active: true, product_id: pidChunk, color_id: colorIdArray },
          limit: 2000,
          offset: 0,
        }]);

        if (results[0]?.success && results[0].data?.records) {
          allVariants.push(...(results[0].data.records as any[]));
        }
      }

      if (allVariants.length === 0) return enrichmentMap;

      // Step 3: Fetch product_images for these products to resolve variant thumbnails
      const productIdsWithVariants = [...new Set(allVariants.map(v => v.product_id))];
      const allImages: Array<{
        product_id: string;
        variant_id: string | null;
        supplier_code: string | null;
        url_cdn: string | null;
        is_og_image: boolean | null;
        is_primary: boolean | null;
        image_type: string | null;
      }> = [];

      for (let i = 0; i < productIdsWithVariants.length; i += CHUNK) {
        const pidChunk = productIdsWithVariants.slice(i, i + CHUNK);
        const results = await invokeBatchBridge([{
          table: 'product_images',
          operation: 'select' as const,
          select: 'product_id, variant_id, supplier_code, url_cdn, is_og_image, is_primary, image_type',
          filters: { product_id: pidChunk },
          limit: 2000,
          offset: 0,
        }]);

        if (results[0]?.success && results[0].data?.records) {
          allImages.push(...(results[0].data.records as any[]));
        }
      }

      // Build image lookup maps
      const imagesByVariantId = new Map<string, string>();
      const imagesBySupplierCode = new Map<string, string>();
      const primaryImagesByProduct = new Set<string>();

      for (const img of allImages) {
        if (!img.url_cdn || img.image_type === 'box') continue;

        if ((img.is_primary || img.is_og_image) && img.url_cdn) {
          primaryImagesByProduct.add(img.url_cdn);
        }

        if (img.variant_id) {
          if (!imagesByVariantId.has(img.variant_id) || img.is_og_image) {
            imagesByVariantId.set(img.variant_id, img.url_cdn);
          }
        }

        if (img.supplier_code) {
          const code = img.supplier_code.toUpperCase();
          if (!imagesBySupplierCode.has(code) || img.is_og_image) {
            imagesBySupplierCode.set(code, img.url_cdn);
          }
        }
      }

      // Step 4: Build enrichment map — aggregate by product
      const variantsByProduct = new Map<string, typeof allVariants>();
      for (const v of allVariants) {
        if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
        variantsByProduct.get(v.product_id)!.push(v);
      }

      for (const [productId, variants] of variantsByProduct) {
        let totalStock = 0;
        let bestImage: string | null = null;
        let bestColorName: string | null = null;
        let bestColorHex: string | null = null;

        for (const v of variants) {
          totalStock += v.stock_quantity ?? 0;

          if (!bestImage) {
            // Priority: variantImage > colorImage > selected_thumbnail (non-primary)
            const variantImage = imagesByVariantId.get(v.id) || null;
            const colorImage = v.color_code ? imagesBySupplierCode.get(v.color_code.toUpperCase()) || null : null;
            const isMainImage = v.selected_thumbnail ? primaryImagesByProduct.has(v.selected_thumbnail) : false;
            const validThumb = v.selected_thumbnail && !isMainImage ? v.selected_thumbnail : null;

            bestImage = variantImage || colorImage || validThumb || (v.images?.length ? v.images[0] : null);
            bestColorName = v.color_name;
            bestColorHex = v.color_hex;
          }
        }

        enrichmentMap.set(productId, {
          image: bestImage,
          stock: totalStock,
          stockStatus: totalStock <= 0 ? 'out-of-stock' : totalStock < 10 ? 'low-stock' : 'in-stock',
          colorName: bestColorName,
          colorHex: bestColorHex,
        });
      }

      logger.log(`[useColorEnrichment] Enriched ${enrichmentMap.size} products with color data for ${colorIdArray.length} color IDs`);
      return enrichmentMap;
    },
    enabled: hasFilter && productIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
