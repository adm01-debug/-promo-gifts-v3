/**
 * useColorEnrichment — Batch-enriches lightweight products with color-specific
 * images and stock when a color filter is active.
 * 
 * Without this, lightweight products have colors: [] and the card cannot
 * show the variant image/stock for the filtered color.
 * 
 * Uses incremental enrichment: keeps a growing cache of results and only
 * fetches data for NEW product IDs that haven't been enriched yet.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useMemo } from 'react';
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

// Cached reference tables (shared across instances)
let cachedColorGroups: Array<{ id: string; slug: string }> | null = null;
let cachedColorVariations: Array<{ id: string; name: string; slug: string; group_id: string; hex_code?: string }> | null = null;

/**
 * Returns a Map<productId, ColorEnrichmentData> for products matching the color filter.
 */
export function useColorEnrichment({ productIds, colorGroups, colorVariations }: UseColorEnrichmentOptions) {
  const hasFilter = colorGroups.length > 0 || colorVariations.length > 0;
  const filterKey = [...colorGroups].sort().join(',') + '|' + [...colorVariations].sort().join(',');

  // Accumulator: track which product IDs have already been enriched for this filter
  const enrichedIdsRef = useRef<Set<string>>(new Set());
  const accumulatedMapRef = useRef<Map<string, ColorEnrichmentData>>(new Map());
  const lastFilterKeyRef = useRef<string>('');

  // Reset cache when filter changes
  if (lastFilterKeyRef.current !== filterKey) {
    enrichedIdsRef.current = new Set();
    accumulatedMapRef.current = new Map();
    lastFilterKeyRef.current = filterKey;
  }

  // Find product IDs that haven't been enriched yet
  const newProductIds = useMemo(() => {
    if (!hasFilter) return [];
    return productIds.filter(id => !enrichedIdsRef.current.has(id));
  }, [productIds, hasFilter, filterKey]);

  // Stable key: use count of new IDs + total count  
  const queryEnabled = hasFilter && newProductIds.length > 0;

  const query = useQuery({
    queryKey: ['color-enrichment-batch', filterKey, newProductIds.length, productIds.length],
    queryFn: async (): Promise<Map<string, ColorEnrichmentData>> => {
      if (newProductIds.length === 0) return accumulatedMapRef.current;

      // Step 1: Load reference tables (cached after first call)
      if (!cachedColorGroups || !cachedColorVariations) {
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

        cachedColorGroups = refResults[0]?.success ? (refResults[0].data?.records || []) as any[] : [];
        cachedColorVariations = refResults[1]?.success ? (refResults[1].data?.records || []) as any[] : [];
      }

      const groupsBySlug = new Map(cachedColorGroups!.map(g => [g.slug, g.id]));
      const variationsBySlug = new Map(cachedColorVariations!.map(v => [v.slug, v]));

      // Resolve target color_ids
      const targetColorIds = new Set<string>();

      for (const slug of colorVariations) {
        const v = variationsBySlug.get(slug);
        if (v) targetColorIds.add(v.id);
      }

      for (const slug of colorGroups) {
        const groupId = groupsBySlug.get(slug);
        if (groupId) {
          for (const v of cachedColorVariations!) {
            if (v.group_id === groupId) targetColorIds.add(v.id);
          }
        }
      }

      if (targetColorIds.size === 0) return accumulatedMapRef.current;

      // Step 2: Fetch variants for NEW products with these color_ids
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

      for (let i = 0; i < newProductIds.length; i += CHUNK) {
        const pidChunk = newProductIds.slice(i, i + CHUNK);
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

      // Step 3: Fetch images for products with variants
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

      // Step 4: Build enrichment for new products
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
            const variantImage = imagesByVariantId.get(v.id) || null;
            const colorImage = v.color_code ? imagesBySupplierCode.get(v.color_code.toUpperCase()) || null : null;
            const isMainImage = v.selected_thumbnail ? primaryImagesByProduct.has(v.selected_thumbnail) : false;
            const validThumb = v.selected_thumbnail && !isMainImage ? v.selected_thumbnail : null;
            bestImage = variantImage || colorImage || validThumb || (v.images?.length ? v.images[0] : null);
            bestColorName = v.color_name;
            bestColorHex = v.color_hex;
          }
        }

        accumulatedMapRef.current.set(productId, {
          image: bestImage,
          stock: totalStock,
          stockStatus: totalStock <= 0 ? 'out-of-stock' : totalStock < 10 ? 'low-stock' : 'in-stock',
          colorName: bestColorName,
          colorHex: bestColorHex,
        });
      }

      // Mark all new product IDs as enriched (even those without variants)
      for (const id of newProductIds) {
        enrichedIdsRef.current.add(id);
      }

      logger.log(`[useColorEnrichment] Enriched ${newProductIds.length} new products (${accumulatedMapRef.current.size} total) for ${colorIdArray.length} color IDs`);
      return new Map(accumulatedMapRef.current);
    },
    enabled: queryEnabled,
    staleTime: 30 * 1000, // Short stale time to allow incremental fetches
    gcTime: 10 * 60 * 1000,
  });

  // Return accumulated map even when query isn't running (for already-enriched products)
  const resultMap = query.data || (accumulatedMapRef.current.size > 0 ? accumulatedMapRef.current : undefined);

  return { data: resultMap, isLoading: query.isLoading };
}
