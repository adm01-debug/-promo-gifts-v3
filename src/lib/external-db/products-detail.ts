/**
 * Product detail fetching — fetchById, bySku, categories, colors.
 */
import { logger } from '@/lib/logger';
import { invokeExternalDb } from './bridge';
import type { InvokeResult } from './bridge';
import {
  PromobrindProduct,
  PRODUCT_SELECT_FIELDS_WITH_SALE,
  PRODUCT_SELECT_FIELDS_LEGACY,
  PRODUCT_SELECT_FIELDS_DETAIL,
  shouldFallbackSelect,
} from './product-types';

export async function fetchPromobrindProductById(
  productId: string
): Promise<PromobrindProduct | null> {
  let result: InvokeResult<PromobrindProduct>;
  try {
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products', operation: 'select',
      filters: { id: productId }, select: PRODUCT_SELECT_FIELDS_DETAIL, limit: 1,
    });
  } catch (err) {
    if (!shouldFallbackSelect(err)) throw err;
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products', operation: 'select',
      filters: { id: productId }, select: PRODUCT_SELECT_FIELDS_WITH_SALE, limit: 1,
    });
  }

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

  // Supplier name
  if (product.supplier_id) {
    try {
      const supplierResult = await invokeExternalDb<{ id: string; name: string; code: string }>({
        table: 'suppliers', operation: 'select', select: 'id, name, code',
        filters: { id: product.supplier_id }, limit: 1, countMode: 'none',
      });
      if (supplierResult.records[0]) product.supplier_name = supplierResult.records[0].name;
    } catch (err) {
      logger.warn('Não foi possível buscar nome do fornecedor:', err);
    }
  }

  // Materials enrichment
  if (!product.materials || (Array.isArray(product.materials) && product.materials.length === 0)) {
    try {
      const materialsResult = await invokeExternalDb<{ product_id: string; material_id: string; part: string | null }>({
        table: 'product_materials', operation: 'select',
        select: 'product_id, material_id, part',
        filters: { product_id: productId, is_active: true }, limit: 20,
      });
      if (materialsResult.records.length > 0) {
        const materialNames: string[] = [];
        for (const mat of materialsResult.records) {
          try {
            const typeResult = await invokeExternalDb<{ id: string; name: string }>({
              table: 'material_types', operation: 'select', select: 'id, name',
              filters: { id: mat.material_id }, limit: 1,
            });
            if (typeResult.records[0]?.name) materialNames.push(typeResult.records[0].name);
          } catch { /* ignore individual */ }
        }
        if (materialNames.length > 0) product.materials = materialNames;
      }
    } catch (err) {
      logger.warn('Não foi possível buscar materiais do produto:', err);
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
      select: 'id, product_id, color_name, color_hex, color_code, sku, stock_quantity, images, selected_images, selected_thumbnail',
      filters: { product_id: productId, is_active: true }, limit: 100,
    });

    const uniqueColors: Array<{ name: string; hex: string; code?: string; sku?: string; stock?: number; image?: string; images?: string[] }> = [];
    variantsResult.records.forEach(variant => {
      if (variant.color_name && !uniqueColors.some(c => c.name === variant.color_name)) {
        const byCode = variant.color_code
          ? allProductImages.filter(img => img.supplier_code === variant.color_code).sort((a, b) => a.display_order - b.display_order).map(img => img.url_cdn)
          : [];
        const legacy = variant.selected_images?.length ? variant.selected_images : variant.images?.length ? variant.images : [];
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
        filters: { kit_product_id: productId, is_active: true },
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
