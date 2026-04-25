/**
 * Product detail fetching — fetchById, bySku, categories, colors.
 */
import { logger } from '@/lib/logger';
import { invokeExternalDb, invokeBatchBridge } from './bridge';
import type { InvokeResult, BatchQuery } from './bridge';
import { getCachedByIds, getFreshFromCacheSafe, putInCacheSafe } from './immutableCache';
import {
  type PromobrindProduct,
  PRODUCT_SELECT_FIELDS_WITH_SALE,
  PRODUCT_SELECT_FIELDS_LEGACY,
  PRODUCT_SELECT_FIELDS_DETAIL,
  shouldFallbackSelect,
} from './product-types';

async function fetchProductWithRetry(
  productId: string,
  maxRetries = 2,
): Promise<InvokeResult<PromobrindProduct>> {
  const selectFields = [PRODUCT_SELECT_FIELDS_DETAIL, PRODUCT_SELECT_FIELDS_WITH_SALE, PRODUCT_SELECT_FIELDS_LEGACY];
  let lastError: unknown;
  for (let selectIdx = 0; selectIdx < selectFields.length; selectIdx++) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await invokeExternalDb<PromobrindProduct>({
          table: 'products', operation: 'select',
          filters: { id: productId }, select: selectFields[selectIdx], limit: 1,
        });
      } catch (err) {
        lastError = err;
        if (shouldFallbackSelect(err)) break; // try next select fields
        if (isTransientError(err) && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (!isTransientError(err)) throw err;
      }
    }
  }
  throw lastError;
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /(timeout|statement timeout|canceling statement|schema cache|retrying|ECONNRESET|fetch failed)/i.test(msg);
}

export async function fetchPromobrindProductById(
  productId: string
): Promise<PromobrindProduct | null> {
  const result = await fetchProductWithRetry(productId);

  const product = result.records[0] || null;
  if (!product) return null;

  if (!product.description && product.meta_description) {
    product.description = product.meta_description;
  }

  // Fetch images
  let allProductImages: Array<{
    url_cdn: string; url_original: string | null; filename: string | null;
    image_type: string; is_primary: boolean; is_og_image: boolean;
    applies_to_color: boolean | null; display_order: number;
    alt_text: string | null; title_text: string | null; supplier_code: string | null;
  }> = [];

  try {
    const imagesResult = await invokeExternalDb<typeof allProductImages[0]>({
      table: 'product_images', operation: 'select',
      select: 'url_cdn, url_original, filename, image_type, is_primary, is_og_image, applies_to_color, display_order, alt_text, title_text, supplier_code',
      filters: { product_id: productId, is_active: true },
      orderBy: { column: 'display_order', ascending: true }, limit: 200,
    });
    allProductImages = imagesResult.records;

    if (allProductImages.length > 0) {
      const colorImages = allProductImages.filter(img => img.supplier_code && img.image_type !== 'box').sort((a, b) => a.display_order - b.display_order);
      const generalImages = allProductImages.filter(img => !img.supplier_code && img.image_type !== 'box').sort((a, b) => a.display_order - b.display_order);
      const mainImages = [...colorImages, ...generalImages];
      const primaryImage = mainImages.find(img => img.is_primary) || mainImages[0];
      if (primaryImage) { product.primary_image_url = primaryImage.url_cdn; product.image_url = primaryImage.url_cdn; }
      const ogImage = mainImages.find(img => img.is_og_image) || mainImages.find(img => img.image_type === 'main') || primaryImage;
      if (ogImage) product.og_image_url = ogImage.url_cdn;
      product.images = mainImages.map(img => img.url_cdn);
    }
  } catch (err) {
    logger.warn('Não foi possível buscar imagens da tabela product_images:', err);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Enriquecimento em LOTE — categories + suppliers + product_materials
  // numa única ida ao external-db-bridge (em vez de 3 calls sequenciais),
  // e depois UM batch para todos os material_types referenciados.
  //
  // Antes: até 3 + N requests (1 por material) = N+1.
  // Depois: 1 request + (no máx) 1 request adicional para os material_types.
  // ─────────────────────────────────────────────────────────────────────
  const categoryId = product.category_id || product.main_category_id;
  const needsCategory = !!categoryId && !product.category_name;
  const needsSupplier = !!product.supplier_id;
  const needsMaterials =
    !product.materials || (Array.isArray(product.materials) && product.materials.length === 0);

  // 1) Tenta servir categoria/fornecedor do cache de entidades imutáveis
  if (needsCategory && categoryId) {
    const cached = getFreshFromCacheSafe('categories', categoryId);
    if (cached?.name) product.category_name = cached.name;
  }
  if (needsSupplier && product.supplier_id) {
    const cached = getFreshFromCacheSafe('suppliers', product.supplier_id);
    if (cached?.name) product.supplier_name = cached.name;
  }

  const stillNeedsCategory = !!categoryId && !product.category_name;
  const stillNeedsSupplier = !!product.supplier_id && !product.supplier_name;

  const enrichmentQueries: BatchQuery[] = [];
  const enrichmentSlots: Array<'category' | 'supplier' | 'materials'> = [];

  if (stillNeedsCategory) {
    enrichmentQueries.push({
      table: 'categories', select: 'id, name',
      filters: { id: categoryId as string }, limit: 1,
    });
    enrichmentSlots.push('category');
  }
  if (stillNeedsSupplier) {
    enrichmentQueries.push({
      table: 'suppliers', select: 'id, name, code',
      filters: { id: product.supplier_id as string }, limit: 1,
    });
    enrichmentSlots.push('supplier');
  }
  if (needsMaterials) {
    enrichmentQueries.push({
      table: 'product_materials', select: 'product_id, material_id, part',
      filters: { product_id: productId, is_active: true }, limit: 20,
    });
    enrichmentSlots.push('materials');
  }

  let materialIds: string[] = [];

  if (enrichmentQueries.length > 0) {
    try {
      const batchResults = await invokeBatchBridge(enrichmentQueries);
      enrichmentSlots.forEach((slot, idx) => {
        const result = batchResults[idx];
        if (!result?.success || !result.data) return;
        const records = result.data.records;
        if (slot === 'category') {
          const rec = records[0] as { id?: string; name?: string } | undefined;
          if (rec?.name) {
            product.category_name = rec.name;
            if (rec.id) putInCacheSafe('categories', { id: rec.id, name: rec.name });
          }
        } else if (slot === 'supplier') {
          const rec = records[0] as { id?: string; name?: string; code?: string } | undefined;
          if (rec?.name) {
            product.supplier_name = rec.name;
            if (rec.id) putInCacheSafe('suppliers', { id: rec.id, name: rec.name, code: rec.code });
          }
        } else if (slot === 'materials') {
          const matRecs = records as Array<{ material_id: string }>;
          const seen = new Set<string>();
          for (const m of matRecs) {
            if (m.material_id && !seen.has(m.material_id)) {
              seen.add(m.material_id);
              materialIds.push(m.material_id);
            }
          }
        }
      });
    } catch (err) {
      logger.warn('Não foi possível enriquecer produto em lote (categoria/fornecedor/materiais):', err);
    }
  }

  // Resolve nomes de material_types através do cache em lote (apenas IDs faltantes vão para o bridge).
  if (materialIds.length > 0) {
    try {
      const nameById = await getCachedByIds<{ id: string; name: string }>('material_types', materialIds);
      const materialNames = materialIds
        .map(id => nameById.get(id)?.name)
        .filter((n): n is string => !!n);
      if (materialNames.length > 0) product.materials = materialNames;
    } catch (err) {
      logger.warn('Não foi possível buscar nomes dos material_types em lote:', err);
    }
  }

  // Variants (colors)
  try {
    const variantsResult = await invokeExternalDb<{
      id: string; product_id: string; color_name: string | null; color_hex: string | null;
      color_code: string | null; sku: string | null; stock_quantity: number | null;
      images: string[] | null; selected_thumbnail: string | null;
    }>({
      table: 'product_variants', operation: 'select',
      select: 'id, product_id, color_name, color_hex, color_code, sku, stock_quantity, images, selected_thumbnail',
      filters: { product_id: productId, is_active: true }, limit: 100,
    });

    const uniqueColors: Array<{ name: string; hex: string; code?: string; sku?: string; stock?: number; image?: string; images?: string[] }> = [];
    variantsResult.records.forEach(variant => {
      if (variant.color_name && !uniqueColors.some(c => c.name === variant.color_name)) {
        const byCode = variant.color_code
          ? allProductImages.filter(img => img.supplier_code === variant.color_code).sort((a, b) => a.display_order - b.display_order).map(img => img.url_cdn)
          : [];
        const legacy = variant.images?.length ? variant.images : [];
        const finalImages = byCode.length > 0 ? byCode : legacy;
        const thumb = finalImages[0] || variant.selected_thumbnail || product.primary_image_url || product.image_url || null;
        uniqueColors.push({
          name: variant.color_name, hex: variant.color_hex || '#CCCCCC',
          code: variant.color_code || '', sku: variant.sku || undefined,
          stock: variant.stock_quantity ?? undefined, image: thumb || undefined,
          images: finalImages.length > 0 ? finalImages : undefined,
        });
      }
    });
    if (uniqueColors.length > 0) product.colors = uniqueColors;
  } catch (err) {
    logger.warn('Não foi possível buscar cores das variantes para produto:', productId, err);
  }

  // Videos
  try {
    const videosResult = await invokeExternalDb<{
      id: string; url_stream: string | null; url_hls: string | null; url_thumbnail: string | null;
      url_original: string | null; source_youtube_id: string | null; video_type: string | null;
      display_order: number; is_primary: boolean; title: string | null; cloudflare_status: string | null;
    }>({
      table: 'product_videos', operation: 'select',
      select: 'id, url_stream, url_hls, url_thumbnail, url_original, source_youtube_id, video_type, display_order, is_primary, title, cloudflare_status',
      filters: { product_id: productId, is_active: true },
      orderBy: { column: 'display_order', ascending: true }, limit: 20,
    });
    if (videosResult.records.length > 0) {
      product.product_videos = videosResult.records
        .filter(v => !v.cloudflare_status || v.cloudflare_status === 'ready')
        .map(v => ({
          id: v.id, url_stream: v.url_stream, url_hls: v.url_hls,
          url_thumbnail: v.url_thumbnail, url_original: v.url_original,
          source_youtube_id: v.source_youtube_id, video_type: v.video_type,
          display_order: v.display_order, is_primary: v.is_primary, title: v.title,
        }));
    }
  } catch (err) {
    logger.warn('Não foi possível buscar vídeos do produto:', productId, err);
  }

  // Kit components
  if (product.is_kit) {
    try {
      const kitResult = await invokeExternalDb<{
        id: string; component_name: string | null; component_code: string | null;
        component_product_id: string | null; component_sku: string | null;
        quantity: number | null; display_order: number | null;
        is_optional: boolean | null; is_packaging: boolean | null;
        is_replaceable: boolean | null; allows_personalization: boolean | null;
        material: string | null; primary_image_url: string | null;
        height_mm: number | null; width_mm: number | null; length_mm: number | null;
        weight_g: number | null; notes: string | null;
      }>({
        table: 'product_kit_components', operation: 'select',
        select: 'id, component_name, component_code, component_product_id, component_sku, quantity, display_order, is_optional, is_packaging, is_replaceable, allows_personalization, material, primary_image_url, height_mm, width_mm, length_mm, weight_g, notes',
        filters: { kit_product_id: productId },
        orderBy: { column: 'display_order', ascending: true }, limit: 50,
      });
      if (kitResult.records.length > 0) {
        product.kit_components = kitResult.records;
      }
    } catch (err) {
      logger.warn('Não foi possível buscar componentes do kit:', productId, err);
    }
  }

  return product;
}

export async function fetchPromobrindProductBySku(sku: string): Promise<PromobrindProduct | null> {
  let result: InvokeResult<PromobrindProduct>;
  try {
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products', operation: 'select',
      filters: { sku }, select: PRODUCT_SELECT_FIELDS_WITH_SALE, limit: 1,
    });
  } catch (err) {
    if (!shouldFallbackSelect(err)) throw err;
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products', operation: 'select',
      filters: { sku }, select: PRODUCT_SELECT_FIELDS_LEGACY, limit: 1,
    });
  }
  return result.records[0] || null;
}

export async function fetchPromobrindCategories(): Promise<{ id: string; name: string }[]> {
  try {
    const result = await invokeExternalDb<{ id: string; name: string }>({
      table: 'categories', operation: 'select', select: 'id, name',
      limit: 500, orderBy: { column: 'name', ascending: true }, countMode: 'none',
    });
    // Popula cache de imutáveis: economiza chamadas posteriores em telas de detalhe.
    for (const c of result.records) {
      if (c?.id && c?.name) putInCacheSafe('categories', { id: c.id, name: c.name });
    }
    return result.records;
  } catch {
    const result = await invokeExternalDb<{ category_id: string; main_category_id: string }>({
      table: 'products', operation: 'select',
      filters: { active: true }, select: 'category_id, main_category_id', limit: 1000,
    });
    const uniqueIds = new Set<string>();
    result.records.forEach(p => {
      if (p.category_id) uniqueIds.add(p.category_id);
      if (p.main_category_id) uniqueIds.add(p.main_category_id);
    });
    return Array.from(uniqueIds).map(id => ({ id, name: id }));
  }
}

export async function fetchPromobrindColors(): Promise<{ name: string; hex: string; group?: string }[]> {
  try {
    const result = await invokeExternalDb<{ color_name: string | null; color_hex: string | null; color_code: string | null }>({
      table: 'product_variants', operation: 'select',
      select: 'color_name, color_hex, color_code',
      filters: { is_active: true }, limit: 5000,
    });
    const uniqueColors = new Map<string, { name: string; hex: string; group?: string }>();
    result.records.forEach(variant => {
      if (variant.color_name && !uniqueColors.has(variant.color_name)) {
        uniqueColors.set(variant.color_name, { name: variant.color_name, hex: variant.color_hex || '#CCCCCC' });
      }
    });
    return Array.from(uniqueColors.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } catch (err) {
    logger.warn('Erro ao buscar cores das variantes:', err);
    return [];
  }
}
