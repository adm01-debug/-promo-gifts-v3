// Helper para invocar o external-db-bridge (banco Promobrind)
import { supabase } from '@/integrations/supabase/client';

type Operation = 'select' | 'insert' | 'update' | 'delete';

interface InvokeOptions<T = Record<string, unknown>> {
  table: string;
  operation: Operation;
  data?: T;
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  countMode?: 'exact' | 'planned' | 'estimated' | 'none';
}

interface InvokeResult<T> {
  records: T[];
  count: number | null;
}

interface BridgeResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const BOOT_RETRY_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function buildBridgeError(error: unknown): Promise<{ message: string; retryable: boolean }> {
  let baseMessage = 'Erro desconhecido';
  let status: number | undefined;
  let responseBody = '';

  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; context?: Response };

    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      baseMessage = maybeError.message;
    }

    if (maybeError.context instanceof Response) {
      status = maybeError.context.status;
      try {
        responseBody = await maybeError.context.clone().text();
      } catch {
        // ignore body parse failures
      }
    }
  }

  const diagnostic = `${baseMessage} ${responseBody}`.toLowerCase();
  const retryable =
    status === 502 ||
    status === 503 ||
    status === 504 ||
    diagnostic.includes('boot_error') ||
    diagnostic.includes('bad gateway') ||
    diagnostic.includes('function failed to start') ||
    diagnostic.includes('statement timeout') ||
    diagnostic.includes('canceling statement due to statement timeout') ||
    diagnostic.includes('57014');

  const details = responseBody ? `${baseMessage} | ${responseBody}` : baseMessage;
  return { message: `Erro na bridge: ${details}`, retryable };
}

async function invokeBridge<T>(body: Record<string, unknown>): Promise<BridgeResponse<T>> {
  // Guard: non-batch operations MUST have a valid table name
  const op = body.operation as string | undefined;
  if (op !== 'batch' && (!body.table || typeof body.table !== 'string')) {
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    console.error(`[external-db] invokeBridge called without table! operation=${op}, caller=${caller}`, body);
    throw new Error(`invokeBridge: tabela não informada (operation=${op})`);
  }

  for (let attempt = 1; attempt <= BOOT_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', { body });

    if (error) {
      const parsed = await buildBridgeError(error);
      if (parsed.retryable && attempt < BOOT_RETRY_ATTEMPTS) {
        await sleep(250 * attempt);
        continue;
      }
      throw new Error(parsed.message);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Erro desconhecido no banco externo');
    }

    return data as BridgeResponse<T>;
  }

  throw new Error('Erro na bridge: tentativas esgotadas');
}

// ============================================
// BATCH BRIDGE — multiple queries in one HTTP call
// Reduces 5+ edge function invocations to 1
// ============================================
interface BatchQuery {
  table: string;
  operation?: 'select';
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  cacheKey?: string;
}

interface BatchResult {
  success: boolean;
  data?: { records: unknown[]; count: number | null };
  error?: string;
  fromCache?: boolean;
}

/**
 * Executa múltiplas queries SELECT em uma única invocação da edge function.
 * Elimina overhead de auth/conexão duplicada e aproveita cache server-side.
 * Automaticamente divide em sub-batches de no máximo 10 queries para respeitar
 * o limite do edge function.
 */
const BATCH_MAX_QUERIES = 10;

function extractBatchResults(payload: unknown): BatchResult[] {
  if (!payload || typeof payload !== 'object') return [];

  const directResults = (payload as { results?: BatchResult[] }).results;
  if (Array.isArray(directResults)) return directResults;

  const nestedResults = (payload as { data?: { results?: BatchResult[] } }).data?.results;
  if (Array.isArray(nestedResults)) return nestedResults;

  return [];
}

export async function invokeBatchBridge(queries: BatchQuery[]): Promise<BatchResult[]> {
  if (queries.length <= BATCH_MAX_QUERIES) {
    const response = await invokeBridge<{ results: BatchResult[] }>({
      operation: 'batch',
      queries,
    });

    const parsedResults = extractBatchResults(response);
    if (parsedResults.length === 0 && queries.length > 0) {
      throw new Error('Resposta inválida da batch bridge');
    }

    return parsedResults;
  }

  // Split into sub-batches of max 10
  const results: BatchResult[] = [];
  for (let i = 0; i < queries.length; i += BATCH_MAX_QUERIES) {
    const chunk = queries.slice(i, i + BATCH_MAX_QUERIES);
    const response = await invokeBridge<{ results: BatchResult[] }>({
      operation: 'batch',
      queries: chunk,
    });

    const parsedResults = extractBatchResults(response);
    if (parsedResults.length === 0 && chunk.length > 0) {
      throw new Error('Resposta inválida da batch bridge');
    }

    results.push(...parsedResults);
  }
  return results;
}

/**
 * Invoca o external-db-bridge para operações CRUD no banco Promobrind.
 * Esse é o método seguro e padronizado de acessar o banco externo,
 * passando pelo edge function que valida autenticação e permissões.
 */
export async function invokeExternalDb<T>(
  options: InvokeOptions
): Promise<InvokeResult<T>> {
  const response = await invokeBridge<InvokeResult<T> | T>(options as unknown as Record<string, unknown>);
  const payload = response.data;

  // Para operações que retornam um único registro
  if (
    options.operation !== 'select' &&
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    !('records' in payload)
  ) {
    return { records: [payload as T], count: 1 };
  }

  return payload as InvokeResult<T>;
}

/**
 * Versão para operações que retornam um único registro (insert, update)
 */
export async function invokeExternalDbSingle<T>(
  options: InvokeOptions
): Promise<T> {
  const result = await invokeExternalDb<T>(options);
  if (!result.records?.length) {
    throw new Error('Nenhum registro retornado');
  }
  return result.records[0];
}

/**
 * Versão para operações de delete (não retorna dados)
 */
export async function invokeExternalDbDelete(
  table: string,
  id: string
): Promise<void> {
  await invokeBridge<{ success: boolean; deleted_id: string }>({
    table,
    operation: 'delete',
    id,
  });
}

// ============================================
// TIPOS PARA PRODUTOS PROMOBRIND
// Schema validado do banco externo (12/01/2026)
// ============================================

export interface PromobrindProduct {
  id: string;
  name: string;
  sku: string;
  /** Preço de venda final (SSOT para exibição no app) */
  sale_price?: number | null;
  /** @deprecated Use sale_price */
  base_price?: number | null;
  image_url: string | null;        // Campo correto do schema
  images: string[] | null;
  primary_image_url: string | null;
  /** Briefing v3: URL da imagem OG (is_og_image=true, cor individual). Enriquecido em runtime. */
  og_image_url?: string | null;
  category_id: string | null;
  main_category_id: string | null; // Campo correto do schema
  supplier_id: string | null;      // FK para tabela suppliers
  supplier_reference: string | null;
  supplier_name?: string | null;   // Enriquecido em runtime
  description: string | null;
  short_description: string | null;
  meta_description?: string | null; // Fallback para description
  brand: string | null;
  is_active: boolean;
  active: boolean;                 // Alias no schema externo
  stock_quantity?: number | null;
  colors?: any[] | null;
  materials?: string[] | any[] | null; // Pode ser array de strings ou enriquecido
  dimensions?: string | null;
  min_quantity?: number | null;
  
  // Timestamps
  created_at?: string | null;
  updated_at?: string | null;
  
  // Dimensões físicas
  height_cm?: number | null;
  width_cm?: number | null;
  length_cm?: number | null;
  diameter_cm?: number | null;
  weight_g?: number | null;
  capacity_ml?: number | null;
  
  // Campos de embalagem especial
  packing_type?: string | null;             // "Caixa de Presente", "Bolsa", "Estojo"
  packing_classification?: string | null;   // "commercial", "protective", "unknown", null
  has_commercial_packaging?: boolean | null; // Nova flag: true se tem embalagem comercial
  repacking_type?: string | null;           // Tipo de embalagem para personalização
  packaging_context?: string | null;        // "always", "with_customization", "without_customization"
  box_image?: string | null;                // URL completa da imagem
  box_width_mm?: number | null;             // Largura em mm
  box_height_mm?: number | null;            // Altura em mm
  box_length_mm?: number | null;            // Profundidade em mm
  box_weight_kg?: number | null;            // Peso em kg
  box_quantity?: number | null;             // Quantidade por caixa master
  box_volume_cm3?: number | null;           // Volume em cm³
  
  // Vídeos do produto (enriquecido em runtime via product_videos)
  product_videos?: Array<{
    id: string;
    url_stream: string | null;
    url_hls: string | null;
    url_thumbnail: string | null;
    url_original: string | null;
    source_youtube_id: string | null;
    video_type: string | null;
    display_order: number;
    is_primary: boolean;
    title: string | null;
  }> | null;
}

// ============================================
// FUNÇÕES AUXILIARES PARA PRODUTOS
// ============================================

// Select fields que existem no schema Promobrind
// Campos para LISTAGEM (leves, sem JSONB pesado) — usado em buscas paginadas
const PRODUCT_SELECT_FIELDS_WITH_SALE =
  'id, name, sku, sale_price, cost_price, image_url, images, primary_image_url, ' +
  'category_id, main_category_id, supplier_id, supplier_reference, description, ' +
  'short_description, meta_description, brand, is_active, active, stock_quantity, colors, ' +
  'materials, dimensions, min_quantity, created_at, updated_at, ' +
  'is_featured, is_bestseller, is_new, is_on_sale, is_kit, ' +
  'height_cm, width_cm, length_cm, diameter_cm, weight_g, capacity_ml, ' +
  'packing_type, packing_classification, has_commercial_packaging, repacking_type, packaging_context, ' +
  'box_image, box_width_mm, box_height_mm, box_length_mm, box_weight_kg, box_quantity, box_volume_cm3';

const PRODUCT_SELECT_FIELDS_LEGACY =
  'id, name, sku, cost_price, image_url, images, primary_image_url, ' +
  'category_id, main_category_id, supplier_id, supplier_reference, description, ' +
  'short_description, meta_description, brand, is_active, active, stock_quantity, colors, ' +
  'materials, dimensions, min_quantity, created_at, updated_at, ' +
  'is_featured, is_bestseller, is_new, is_on_sale, is_kit, ' +
  'height_cm, width_cm, length_cm, diameter_cm, weight_g, capacity_ml, ' +
  'packing_type, packing_classification, has_commercial_packaging, repacking_type, packaging_context, ' +
  'box_image, box_width_mm, box_height_mm, box_length_mm, box_weight_kg, box_quantity, box_volume_cm3';

// Campos COMPLETOS para edição de produto individual (select: '*')
// Usado apenas ao carregar 1 registro para o formulário de edição
const PRODUCT_SELECT_FIELDS_DETAIL = '*';

function shouldFallbackSelect(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /(sale_price|base_price|does not exist|não existe|undefined column)/i.test(msg);
}

/**
 * Busca produtos do banco Promobrind via bridge
 */
export async function fetchPromobrindProducts(options?: {
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
}): Promise<PromobrindProduct[]>;
export async function fetchPromobrindProducts(options?: {
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
  returnCount?: true;
}): Promise<{ products: PromobrindProduct[]; count: number | null }>;
export async function fetchPromobrindProducts(options?: {
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
  returnCount?: boolean;
}): Promise<PromobrindProduct[] | { products: PromobrindProduct[]; count: number | null }> {
  const filters: Record<string, unknown> = {
    ...(options?.filters?.active === undefined && options?.filters?.is_active === undefined
      ? { active: true }
      : {}),
    ...options?.filters,
  };

  if (options?.search) {
    filters._search = options.search;
  }

  // Se limit foi informado, faz uma única chamada.
  // Caso contrário, pagina automaticamente para buscar tudo.
  const orderBy = options?.orderBy ?? { column: 'name', ascending: true };

  let products: PromobrindProduct[] = [];

  let totalCount: number | null = null;

  const shouldRequestCount = options?.returnCount === true;

  if (typeof options?.limit === 'number' && options.limit > 0) {
    const fetchOffset = options?.offset ?? 0;
    let result: InvokeResult<PromobrindProduct>;
    try {
      result = await invokeExternalDb<PromobrindProduct>({
        table: 'products',
        operation: 'select',
        filters,
        select: PRODUCT_SELECT_FIELDS_WITH_SALE,
        orderBy,
        limit: options.limit,
        offset: fetchOffset,
        countMode: shouldRequestCount ? 'exact' : 'none',
      });
    } catch (err) {
      if (!shouldFallbackSelect(err)) throw err;
      result = await invokeExternalDb<PromobrindProduct>({
        table: 'products',
        operation: 'select',
        filters,
        select: PRODUCT_SELECT_FIELDS_LEGACY,
        orderBy,
        limit: options.limit,
        offset: fetchOffset,
        countMode: shouldRequestCount ? 'exact' : 'none',
      });
    }
    products = result.records;
    totalCount = result.count;
  } else {
    // Paginação: buscamos em páginas de 500 para evitar statement timeouts
    // no banco externo (limite ~8s). Páginas menores = queries mais rápidas.
    const pageSize = 500;
    let offset = 0;
    let loopCount: number | null = null;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    // Segurança: evita loops infinitos caso o count venha nulo/errado.
    const HARD_MAX = 200000;

    while (offset < HARD_MAX) {
      const countMode: 'exact' | 'none' = shouldRequestCount && offset === 0 ? 'exact' : 'none';
      let page: InvokeResult<PromobrindProduct>;
      try {
        page = await invokeExternalDb<PromobrindProduct>({
          table: 'products',
          operation: 'select',
          filters,
          select: PRODUCT_SELECT_FIELDS_WITH_SALE,
          orderBy,
          limit: pageSize,
          offset,
          countMode,
        });
        consecutiveErrors = 0; // Reset on success
      } catch (err: any) {
        const msg = err?.message || '';
        // Statement timeout: retry with same offset
        if (msg.includes('statement timeout') || msg.includes('57014') || msg.includes('canceling statement')) {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.warn(`[external-db] Stopping pagination at offset=${offset} after ${MAX_CONSECUTIVE_ERRORS} consecutive timeouts. Got ${products.length} products so far.`);
            break;
          }
          console.warn(`[external-db] Timeout at offset=${offset}, retrying (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})...`);
          await new Promise(r => setTimeout(r, 1000 * consecutiveErrors));
          continue;
        }
        if (!shouldFallbackSelect(err)) throw err;
        try {
          page = await invokeExternalDb<PromobrindProduct>({
            table: 'products',
            operation: 'select',
            filters,
            select: PRODUCT_SELECT_FIELDS_LEGACY,
            orderBy,
            limit: pageSize,
            offset,
            countMode,
          });
          consecutiveErrors = 0;
        } catch (fallbackErr: any) {
          const fbMsg = fallbackErr?.message || '';
          if (fbMsg.includes('statement timeout') || fbMsg.includes('canceling statement')) {
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              console.warn(`[external-db] Stopping pagination at offset=${offset} after ${MAX_CONSECUTIVE_ERRORS} consecutive timeouts (fallback). Got ${products.length} products so far.`);
              break;
            }
            await new Promise(r => setTimeout(r, 1000 * consecutiveErrors));
            continue;
          }
          throw fallbackErr;
        }
      }

      if (typeof page!.count === 'number') {
        loopCount = page!.count;
      }

      products.push(...page!.records);
      offset += page!.records.length;

      // Paradas
      if (page!.records.length < pageSize) break;
      if (loopCount !== null && products.length >= loopCount) break;
    }
    totalCount = loopCount;
  }

  // Enriquecer produtos: usar BATCH para reduzir 5+ HTTP calls → 1-2
  if (products.length > 0) {
    const productIds = products.map(p => p.id);
    const uniqueSupplierIds = [...new Set(products.map(p => p.supplier_id).filter(Boolean))] as string[];

    const shouldRunHeavyEnrichment = products.length <= 500 || typeof options?.limit === 'number';

    if (!shouldRunHeavyEnrichment) {
      console.info(`[external-db] Skipping heavy enrichment for ${products.length} products to prevent timeouts`);
    }

    // CHUNK product IDs for variant/image queries (max 80 per query to avoid statement timeout)
    const CHUNK_SIZE = 80;
    const idChunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
      idChunks.push(productIds.slice(i, i + CHUNK_SIZE));
    }

    // Build batch queries array
    const batchQueries: BatchQuery[] = [];
    const queryMap: Record<string, number[]> = { variants: [], images: [], suppliers: [], colorVariations: [], colorGroups: [] };

    if (shouldRunHeavyEnrichment) {
      // Variants — one query per chunk
      for (const chunk of idChunks) {
        queryMap.variants.push(batchQueries.length);
        batchQueries.push({
          table: 'product_variants',
          select: 'product_id, color_name, color_hex, color_code, color_id, sku, stock_quantity, images, selected_images, selected_thumbnail',
          filters: { is_active: true, product_id: chunk },
          limit: 1000,
          offset: 0,
        });
      }

      // Images — one query per chunk
      for (const chunk of idChunks) {
        queryMap.images.push(batchQueries.length);
        batchQueries.push({
          table: 'product_images',
          select: 'product_id, url_cdn, url_original, filename, image_type, is_primary, is_og_image, applies_to_color, display_order, alt_text, title_text, supplier_code, variant_id',
          filters: { is_active: true, product_id: chunk },
          limit: 1000,
          offset: 0,
        });
      }

      // Color variations — cached server-side (small table, ~80 records)
      queryMap.colorVariations.push(batchQueries.length);
      batchQueries.push({
        table: 'color_variations',
        select: 'id, name, slug, group_id',
        filters: { is_active: true },
        limit: 500,
        offset: 0,
        cacheKey: 'ref:color_variations',
      });

      // Color groups — cached server-side (very small, ~15 records)
      queryMap.colorGroups.push(batchQueries.length);
      batchQueries.push({
        table: 'color_groups',
        select: 'id, name, slug',
        filters: { is_active: true },
        limit: 100,
        offset: 0,
        cacheKey: 'ref:color_groups',
      });
    }

    // Suppliers
    if (uniqueSupplierIds.length > 0) {
      queryMap.suppliers.push(batchQueries.length);
      batchQueries.push({
        table: 'suppliers',
        select: 'id, name, code',
        filters: { id: uniqueSupplierIds },
        limit: Math.max(uniqueSupplierIds.length, 1),
        offset: 0,
      });
    }

    // Execute all queries in ONE HTTP call
    let batchResults: BatchResult[] = [];
    try {
      batchResults = await invokeBatchBridge(batchQueries);
    } catch (err) {
      console.warn('[external-db] Batch enrichment failed, products will have basic data:', err);
    }

    // Extract results
    const variantsRecords: any[] = [];
    for (const idx of queryMap.variants) {
      const r = batchResults[idx];
      if (r?.success && r.data?.records) variantsRecords.push(...r.data.records);
    }

    const imagesRecords: any[] = [];
    for (const idx of queryMap.images) {
      const r = batchResults[idx];
      if (r?.success && r.data?.records) imagesRecords.push(...r.data.records);
    }

    const suppliersResult = { records: [] as { id: string; name: string; code: string }[] };
    for (const idx of queryMap.suppliers) {
      const r = batchResults[idx];
      if (r?.success && r.data?.records) suppliersResult.records.push(...(r.data.records as any[]));
    }

    const colorVariationsRecords = { records: [] as { id: string; name: string; slug: string; group_id: string }[] };
    for (const idx of queryMap.colorVariations) {
      const r = batchResults[idx];
      if (r?.success && r.data?.records) colorVariationsRecords.records = r.data.records as any[];
    }

    const colorGroupsRecords = { records: [] as { id: string; name: string; slug: string }[] };
    for (const idx of queryMap.colorGroups) {
      const r = batchResults[idx];
      if (r?.success && r.data?.records) colorGroupsRecords.records = r.data.records as any[];
    }
    
    // Mapear fornecedores por ID
    const suppliersMap = new Map<string, string>();
    suppliersResult.records.forEach(s => {
      suppliersMap.set(s.id, s.name);
    });

    // Mapear color_variations: id → { slug, group_id }
    const colorVariationMap = new Map<string, { name: string; slug: string; group_id: string }>();
    (colorVariationsRecords as any)?.records?.forEach?.((v: any) => {
      colorVariationMap.set(v.id, { name: v.name, slug: v.slug, group_id: v.group_id });
    });

    // Mapear color_groups: id → { name, slug }
    const colorGroupMap = new Map<string, { name: string; slug: string }>();
    (colorGroupsRecords as any)?.records?.forEach?.((g: any) => {
      colorGroupMap.set(g.id, { name: g.name, slug: g.slug });
    });
    
    // Agrupar imagens por produto (com metadados expandidos — Briefing v3)
    const imagesByProduct = new Map<string, Array<{
      url: string;
      urlOriginal: string | null;
      filename: string | null;
      type: string;
      isPrimary: boolean;
      isOgImage: boolean;
      appliesToColor: boolean | null;
      order: number;
      supplierCode: string | null;
      altText: string | null;
      titleText: string | null;
      variantId: string | null;
    }>>();
    const productIdSet = new Set(productIds);
    
    imagesRecords.forEach((img: any) => {
      if (!productIdSet.has(img.product_id)) return;
      
      if (!imagesByProduct.has(img.product_id)) {
        imagesByProduct.set(img.product_id, []);
      }
      imagesByProduct.get(img.product_id)!.push({
        url: img.url_cdn,
        urlOriginal: img.url_original || null,
        filename: img.filename || null,
        type: img.image_type,
        isPrimary: img.is_primary,
        isOgImage: img.is_og_image || false,
        appliesToColor: img.applies_to_color ?? null,
        order: img.display_order,
        supplierCode: img.supplier_code || null,
        altText: img.alt_text || null,
        titleText: img.title_text || null,
        variantId: img.variant_id || null,
      });
    });
    
    // Agrupar cores por produto
    // VÍNCULO: product_images.supplier_code = product_variants.color_code
    const colorsByProduct = new Map<string, Array<{ 
      name: string; 
      hex: string; 
      code: string;
      sku?: string;
      stock?: number;
      image?: string;
      images?: string[];
      groupSlug?: string;
      groupName?: string;
      variationSlug?: string;
    }>>();
    
    variantsRecords.forEach(variant => {
      if (!variant.color_name || !productIds.includes(variant.product_id)) return;
      
      if (!colorsByProduct.has(variant.product_id)) {
        colorsByProduct.set(variant.product_id, []);
      }
      
      const colors = colorsByProduct.get(variant.product_id)!;
      // Evitar duplicatas por nome de cor
      if (!colors.some(c => c.name === variant.color_name)) {
        const productImgs = imagesByProduct.get(variant.product_id) || [];
        
        // PRIORIDADE 1: Imagens via variant_id (mais confiável — XBZ e outros sem color_code)
        const variantImagesByVariantId = productImgs
          .filter(img => img.variantId === variant.id && !img.isPrimary && !img.isOgImage)
          .sort((a, b) => a.order - b.order)
          .map(img => img.url);
        
        // PRIORIDADE 2: Imagens via supplier_code = color_code
        const variantImagesByCode = variant.color_code
          ? productImgs
              .filter(img => img.supplierCode === variant.color_code && !img.isPrimary && !img.isOgImage)
              .sort((a, b) => a.order - b.order)
              .map(img => img.url)
          : [];
        
        // PRIORIDADE 3: variant_id match incluindo primárias (se não houver nenhuma outra)
        const variantImagesAllById = variantImagesByVariantId.length === 0
          ? productImgs
              .filter(img => img.variantId === variant.id)
              .sort((a, b) => a.order - b.order)
              .map(img => img.url)
          : [];
        
        // PRIORIDADE 4: Campos legados da tabela product_variants (fallback)
        const legacyImages = variant.selected_images?.length 
          ? variant.selected_images 
          : variant.images?.length 
            ? variant.images 
            : [];
        
        const finalImages = variantImagesByVariantId.length > 0 
          ? variantImagesByVariantId 
          : variantImagesByCode.length > 0
            ? variantImagesByCode
            : variantImagesAllById.length > 0
              ? variantImagesAllById
              : legacyImages;
        
        // SEM fallback para imagem primária do produto — color.image deve ser APENAS da cor específica
        const thumbnailImage = finalImages[0] || variant.selected_thumbnail || null;
        
        // Resolver grupo e variação via hierarquia do banco: color_id → color_variations → color_groups
        let groupSlug: string | undefined;
        let groupName: string | undefined;
        let variationSlug: string | undefined;
        
        if (variant.color_id) {
          const variation = colorVariationMap.get(variant.color_id);
          if (variation) {
            variationSlug = variation.slug;
            const group = colorGroupMap.get(variation.group_id);
            if (group) {
              groupSlug = group.slug;
              groupName = group.name;
            }
          }
        }
        
        colors.push({
          name: variant.color_name,
          hex: variant.color_hex || '#CCCCCC',
          code: variant.color_code || '',
          sku: variant.sku || undefined,
          stock: variant.stock_quantity ?? undefined,
          image: thumbnailImage || undefined,
          images: finalImages.length > 0 ? finalImages : undefined,
          groupSlug,
          groupName,
          variationSlug,
        });
      }
    });

    // Enriquecer produtos com cores, nomes de fornecedores e IMAGENS
    products.forEach(product => {
      // Imagens da tabela product_images (prioridade sobre campos legados)
      const productImages = imagesByProduct.get(product.id);
      if (productImages && productImages.length > 0) {
        // Ordenar por display_order
        productImages.sort((a, b) => a.order - b.order);
        
        // Imagens de cor (sem box)
        const colorImages = productImages.filter(img => img.supplierCode && img.type !== 'box');
        const generalImages = productImages.filter(img => !img.supplierCode && img.type !== 'box');
        const mainImages = [...colorImages, ...generalImages];
        
        // Definir primary_image_url (prioridade: is_primary, depois primeira)
        const primaryImage = mainImages.find(img => img.isPrimary) || mainImages[0];
        if (primaryImage) {
          product.primary_image_url = primaryImage.url;
          product.image_url = primaryImage.url;
        }
        
        // Briefing v3: og_image_url = is_og_image (MAIN, cor individual) para cards e OG tags
        const ogImage = mainImages.find(img => img.isOgImage) 
          || mainImages.find(img => img.type === 'main')
          || primaryImage;
        if (ogImage) {
          product.og_image_url = ogImage.url;
        }
        
        // Definir array de imagens
        product.images = mainImages.map(img => img.url);
      }
      
      // Cores das variantes
      const variantColors = colorsByProduct.get(product.id);
      if (variantColors && variantColors.length > 0) {
        product.colors = variantColors;
      }
      
      // Nome do fornecedor
      if (product.supplier_id && suppliersMap.has(product.supplier_id)) {
        product.supplier_name = suppliersMap.get(product.supplier_id);
      }
    });
  }

  if (options?.returnCount) {
    return { products, count: totalCount };
  }
  return products;
}

// ============================================
// LIGHTWEIGHT PRODUCT FETCH (sem enriquecimento)
// Para seletores de produto que não precisam de cores/imagens/variantes completas
// ============================================

const PRODUCT_SELECT_LIGHTWEIGHT = 'id, name, sku, sale_price, cost_price, image_url, primary_image_url, supplier_id, category_id, main_category_id, brand, is_active, active, stock_quantity, min_quantity';

export interface LightweightProduct {
  id: string;
  name: string;
  sku: string;
  sale_price?: number | null;
  cost_price?: number | null;
  image_url: string | null;
  primary_image_url: string | null;
  supplier_id: string | null;
  category_id: string | null;
  main_category_id: string | null;
  brand: string | null;
  is_active: boolean;
  active: boolean;
  stock_quantity?: number | null;
  min_quantity?: number | null;
}

/**
 * Busca produtos com campos mínimos (sem enriquecimento de cores/imagens/variantes).
 * ~10x mais rápido que fetchPromobrindProducts para catálogos grandes.
 */
export async function fetchPromobrindProductsLightweight(options?: {
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
}): Promise<LightweightProduct[]> {
  const filters: Record<string, unknown> = {
    active: true,
    ...options?.filters,
  };

  if (options?.search) {
    filters._search = options.search;
  }

  const orderBy = options?.orderBy ?? { column: 'name', ascending: true };
  let products: LightweightProduct[] = [];

  if (typeof options?.limit === 'number' && options.limit > 0) {
    const result = await invokeExternalDb<LightweightProduct>({
      table: 'products',
      operation: 'select',
      filters,
      select: PRODUCT_SELECT_LIGHTWEIGHT,
      orderBy,
      limit: options.limit,
      offset: options?.offset ?? 0,
      countMode: 'none',
    });
    products = result.records;
  } else {
    const pageSize = 1000;
    let offset = 0;
    const HARD_MAX = 200000;

    while (offset < HARD_MAX) {
      const page = await invokeExternalDb<LightweightProduct>({
        table: 'products',
        operation: 'select',
        filters,
        select: PRODUCT_SELECT_LIGHTWEIGHT,
        orderBy,
        limit: pageSize,
        offset,
        countMode: 'none',
      });

      products.push(...page.records);
      offset += page.records.length;
      if (page.records.length < pageSize) break;
    }
  }

  return products;
}

/**
 * Busca um produto específico pelo ID (com enriquecimento de cores das variantes)
 */
export async function fetchPromobrindProductById(
  productId: string
): Promise<PromobrindProduct | null> {
  // Usar select: '*' para detalhe individual — 1 registro é rápido e garante
  // que todos os campos novos (fiscal, SEO, comercial, flags) estejam disponíveis.
  let result: InvokeResult<PromobrindProduct>;
  try {
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products',
      operation: 'select',
      filters: { id: productId },
      select: PRODUCT_SELECT_FIELDS_DETAIL,
      limit: 1,
    });
  } catch (err) {
    // Fallback para campos explícitos se '*' falhar
    if (!shouldFallbackSelect(err)) throw err;
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products',
      operation: 'select',
      filters: { id: productId },
      select: PRODUCT_SELECT_FIELDS_WITH_SALE,
      limit: 1,
    });
  }

  const product = result.records[0] || null;
  
  // SEMPRE buscar variantes para enriquecer cores com hex, stock e imagens
  // O campo colors da tabela products contém apenas strings ["Azul", "Preto"]
  // Precisamos dos dados completos das variantes
  if (product) {
    // Se description está vazio, usar meta_description como fallback
    if (!product.description && product.meta_description) {
      product.description = product.meta_description;
    }

    // Buscar imagens da tabela product_images
    // ARQUITETURA: product_images.supplier_code corresponde a product_variants.color_code
    // Imagens com supplier_code = null são gerais (box, set, etc.)
    // Briefing v3: expandido com is_og_image, title_text, url_original, filename, applies_to_color
    let allProductImages: Array<{
      url_cdn: string;
      url_original: string | null;
      filename: string | null;
      image_type: string;
      is_primary: boolean;
      is_og_image: boolean;
      applies_to_color: boolean | null;
      display_order: number;
      alt_text: string | null;
      title_text: string | null;
      supplier_code: string | null;
    }> = [];
    try {
      const imagesResult = await invokeExternalDb<{
        url_cdn: string;
        url_original: string | null;
        filename: string | null;
        image_type: string;
        is_primary: boolean;
        is_og_image: boolean;
        applies_to_color: boolean | null;
        display_order: number;
        alt_text: string | null;
        title_text: string | null;
        supplier_code: string | null;
      }>({
        table: 'product_images',
        operation: 'select',
        select: 'url_cdn, url_original, filename, image_type, is_primary, is_og_image, applies_to_color, display_order, alt_text, title_text, supplier_code',
        filters: { product_id: productId, is_active: true },
        orderBy: { column: 'display_order', ascending: true },
        limit: 200,
      });

      allProductImages = imagesResult.records;

      if (allProductImages.length > 0) {
        // Imagens gerais do produto (sem supplier_code OU tipo box/set) = galeria principal
        // Também incluir todas as imagens de cor na galeria geral para navegação
        const allColorImages = allProductImages
          .filter(img => img.supplier_code && img.image_type !== 'box')
          .sort((a, b) => a.display_order - b.display_order);
        
        const generalImages = allProductImages
          .filter(img => !img.supplier_code && img.image_type !== 'box')
          .sort((a, b) => a.display_order - b.display_order);
        
        // Galeria principal = todas as imagens de cor + gerais (sem box)
        const mainImages = [...allColorImages, ...generalImages];
        
        // Definir primary_image_url (prioridade: is_primary, depois primeira)
        const primaryImage = mainImages.find(img => img.is_primary) || mainImages[0];
        if (primaryImage) {
          product.primary_image_url = primaryImage.url_cdn;
          product.image_url = primaryImage.url_cdn;
        }
        
        // Briefing v3: og_image_url = is_og_image (MAIN, cor individual) para cards e OG tags
        const ogImage = mainImages.find(img => img.is_og_image)
          || mainImages.find(img => img.image_type === 'main')
          || primaryImage;
        if (ogImage) {
          product.og_image_url = ogImage.url_cdn;
        }
        
        // Definir array de imagens gerais (todas as fotos de cores + gerais)
        product.images = mainImages.map(img => img.url_cdn);
      }
    } catch (err) {
      console.warn('Não foi possível buscar imagens da tabela product_images:', err);
    }

    // Buscar nome do fornecedor se tiver supplier_id
    if (product.supplier_id) {
      try {
        const supplierResult = await invokeExternalDb<{ id: string; name: string; code: string }>({
          table: 'suppliers',
          operation: 'select',
          select: 'id, name, code',
          filters: { id: product.supplier_id },
          limit: 1,
          countMode: 'none',
        });
        if (supplierResult.records[0]) {
          product.supplier_name = supplierResult.records[0].name;
        }
      } catch (err) {
        console.warn('Não foi possível buscar nome do fornecedor:', err);
      }
    }

    // Buscar materiais da tabela product_materials + material_types
    // Se o array materials está vazio, enriquecer com dados relacionais
    if (!product.materials || (Array.isArray(product.materials) && product.materials.length === 0)) {
      try {
        const materialsResult = await invokeExternalDb<{
          product_id: string;
          material_id: string;
          part: string | null;
        }>({
          table: 'product_materials',
          operation: 'select',
          select: 'product_id, material_id, part',
          filters: { product_id: productId, is_active: true },
          limit: 20,
        });

        if (materialsResult.records.length > 0) {
          // Buscar nomes dos materiais
          const materialIds = materialsResult.records.map(m => m.material_id);
          const materialNames: string[] = [];

          for (const materialId of materialIds) {
            try {
              const typeResult = await invokeExternalDb<{ id: string; name: string }>({
                table: 'material_types',
                operation: 'select',
                select: 'id, name',
                filters: { id: materialId },
                limit: 1,
              });
              if (typeResult.records[0]?.name) {
                materialNames.push(typeResult.records[0].name);
              }
            } catch {
              // Ignora erro individual
            }
          }

          if (materialNames.length > 0) {
            product.materials = materialNames;
          }
        }
      } catch (err) {
        console.warn('Não foi possível buscar materiais do produto:', err);
      }
    }

    try {
      const variantsResult = await invokeExternalDb<{
        id: string;
        product_id: string;
        color_name: string | null;
        color_hex: string | null;
        color_code: string | null;
        sku: string | null;
        stock_quantity: number | null;
        images: string[] | null;
        selected_images: string[] | null;
        selected_thumbnail: string | null;
      }>({
        table: 'product_variants',
        operation: 'select',
        select: 'id, product_id, color_name, color_hex, color_code, sku, stock_quantity, images, selected_images, selected_thumbnail',
        filters: { product_id: productId, is_active: true },
        limit: 100,
      });

      // Extrair cores únicas das variantes
      // VÍNCULO: product_images.supplier_code = product_variants.color_code
      const uniqueColors: Array<{ 
        name: string; 
        hex: string; 
        code?: string;
        sku?: string;
        stock?: number;
        image?: string;
        images?: string[];
      }> = [];
      
      variantsResult.records.forEach(variant => {
        if (variant.color_name && !uniqueColors.some(c => c.name === variant.color_name)) {
          // PRIORIDADE 1: Imagens da tabela product_images vinculadas via supplier_code = color_code
          const variantImagesByColorCode = variant.color_code
            ? allProductImages
                .filter(img => img.supplier_code === variant.color_code)
                .sort((a, b) => a.display_order - b.display_order)
                .map(img => img.url_cdn)
            : [];
          
          // PRIORIDADE 2: Campos legados da tabela product_variants (fallback)
          const legacyImages = variant.selected_images?.length 
            ? variant.selected_images 
            : variant.images?.length 
              ? variant.images 
              : [];
          
          // Usar imagens por color_code se disponíveis, senão legadas
          const finalImages = variantImagesByColorCode.length > 0 
            ? variantImagesByColorCode 
            : legacyImages;
          
          // Thumbnail: primeira imagem da variante, ou fallback para imagem principal do produto
          const thumbnailImage = finalImages[0] 
            || variant.selected_thumbnail 
            || product.primary_image_url 
            || product.image_url 
            || null;
          
          uniqueColors.push({
            name: variant.color_name,
            hex: variant.color_hex || '#CCCCCC',
            code: variant.color_code || '',
            sku: variant.sku || undefined,
            stock: variant.stock_quantity ?? undefined,
            image: thumbnailImage || undefined,
            images: finalImages.length > 0 ? finalImages : undefined,
          });
        }
      });

      if (uniqueColors.length > 0) {
        product.colors = uniqueColors;
      }
    } catch (err) {
      console.warn('Não foi possível buscar cores das variantes para produto:', productId, err);
    }

    // Buscar vídeos da tabela product_videos
    try {
      const videosResult = await invokeExternalDb<{
        id: string;
        url_stream: string | null;
        url_hls: string | null;
        url_thumbnail: string | null;
        url_original: string | null;
        source_youtube_id: string | null;
        video_type: string | null;
        display_order: number;
        is_primary: boolean;
        title: string | null;
        cloudflare_status: string | null;
      }>({
        table: 'product_videos',
        operation: 'select',
        select: 'id, url_stream, url_hls, url_thumbnail, url_original, source_youtube_id, video_type, display_order, is_primary, title, cloudflare_status',
        filters: { product_id: productId, is_active: true },
        orderBy: { column: 'display_order', ascending: true },
        limit: 20,
      });

      if (videosResult.records.length > 0) {
        // Filtrar apenas vídeos prontos (cloudflare_status = 'ready' ou null para YouTube direto)
        product.product_videos = videosResult.records
          .filter(v => !v.cloudflare_status || v.cloudflare_status === 'ready')
          .map(v => ({
            id: v.id,
            url_stream: v.url_stream,
            url_hls: v.url_hls,
            url_thumbnail: v.url_thumbnail,
            url_original: v.url_original,
            source_youtube_id: v.source_youtube_id,
            video_type: v.video_type,
            display_order: v.display_order,
            is_primary: v.is_primary,
            title: v.title,
          }));
      }
    } catch (err) {
      console.warn('Não foi possível buscar vídeos do produto:', productId, err);
    }
  }

  return product;
}

/**
 * Busca produtos por SKU
 */
export async function fetchPromobrindProductBySku(
  sku: string
): Promise<PromobrindProduct | null> {
  let result: InvokeResult<PromobrindProduct>;
  try {
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products',
      operation: 'select',
      filters: { sku },
      select: PRODUCT_SELECT_FIELDS_WITH_SALE,
      limit: 1,
    });
  } catch (err) {
    if (!shouldFallbackSelect(err)) throw err;
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products',
      operation: 'select',
      filters: { sku },
      select: PRODUCT_SELECT_FIELDS_LEGACY,
      limit: 1,
    });
  }

  return result.records[0] || null;
}

/**
 * Busca categorias únicas dos produtos Promobrind
 * Nota: O schema externo usa main_category_id, não category_name
 */
export async function fetchPromobrindCategories(): Promise<{ id: string; name: string }[]> {
  // Tenta buscar da tabela categories se existir, senão extrai dos produtos
  try {
    const result = await invokeExternalDb<{ id: string; name: string }>({
      table: 'categories',
      operation: 'select',
      select: 'id, name',
      limit: 500,
      orderBy: { column: 'name', ascending: true },
      countMode: 'none',
    });
    return result.records;
  } catch {
    // Fallback: extrair IDs únicos de category_id dos produtos
    const result = await invokeExternalDb<{ category_id: string; main_category_id: string }>({
      table: 'products',
      operation: 'select',
      filters: { active: true },
      select: 'category_id, main_category_id',
      limit: 1000,
    });

    const uniqueIds = new Set<string>();
    result.records.forEach((p) => {
      if (p.category_id) uniqueIds.add(p.category_id);
      if (p.main_category_id) uniqueIds.add(p.main_category_id);
    });

    return Array.from(uniqueIds).map(id => ({ id, name: id }));
  }
}

/**
 * Busca cores únicas das variantes de produtos Promobrind
 * (A tabela products.colors geralmente está vazia, então usamos product_variants)
 */
export async function fetchPromobrindColors(): Promise<{ name: string; hex: string; group?: string }[]> {
  try {
    // Buscar cores diretamente das variantes de produtos (fonte mais confiável)
    const result = await invokeExternalDb<{
      color_name: string | null;
      color_hex: string | null;
      color_code: string | null;
    }>({
      table: 'product_variants',
      operation: 'select',
      select: 'color_name, color_hex, color_code',
      filters: { is_active: true },
      limit: 5000,
    });

    const uniqueColors = new Map<string, { name: string; hex: string; group?: string }>();
    
    result.records.forEach((variant) => {
      if (variant.color_name && !uniqueColors.has(variant.color_name)) {
        uniqueColors.set(variant.color_name, {
          name: variant.color_name,
          hex: variant.color_hex || '#CCCCCC',
        });
      }
    });

    return Array.from(uniqueColors.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );
  } catch (err) {
    console.warn('Erro ao buscar cores das variantes:', err);
    return [];
  }
}

/**
 * Helper para obter URL da imagem do produto
 */
export function getProductImageUrl(product: PromobrindProduct): string | null {
  return product.primary_image_url || product.image_url || (product.images?.[0] ?? null);
}

/**
 * Helper para obter preço do produto (fallback 0)
 */
export function getProductPrice(product: PromobrindProduct): number {
  // Preferir sempre o preço de venda. Se não existir no schema/registro,
  // fazer fallback para base_price (compatibilidade) e por fim 0.
  return product.sale_price ?? product.base_price ?? 0;
}

/**
 * Helper para obter estoque
 */
export function getProductStock(product: PromobrindProduct): number {
  return product.stock_quantity || 0;
}

// ============================================
// TIPOS PARA ÁREAS DE IMPRESSÃO PROMOBRIND
// ============================================

export interface PromobrindPrintArea {
  id: string;
  product_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  location_name: string | null;
  max_width_cm: number | null;
  max_height_cm: number | null;
  max_area_cm2: number | null;
  is_curved: boolean;
  technique_id: string | null;
  technique_code: string | null;
  technique_name: string | null;
  max_colors: number | null;
  is_default: boolean;
  area_image_url: string | null;
}

// Interface flexível para técnicas do BD externo (aceita qualquer estrutura)
export interface PromobrindTechnique {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  // Campos do BD externo (podem variar)
  setup_price?: number | null;
  handling_price?: number | null;
  base_cost_multiplier?: number | null;
  requires_color_count?: boolean;
  min_colors?: number;
  max_colors?: number | null;
  price_by_color?: boolean;
  price_by_area?: boolean;
  is_active?: boolean;
  display_order?: number;
  // Campos derivados para compatibilidade com código existente
  setup_cost?: number | null;
  unit_cost?: number | null;
  min_quantity?: number | null;
  estimated_days?: number | null;
  // Permitir campos extras
  [key: string]: unknown;
}

export interface PromobrindPriceTable {
  id: string;
  table_code: string;
  table_code_option: string;
  customization_type_name: string;
  technique_code: string | null;
  min_quantity: number;
  max_quantity: number | null;
  min_colors: number | null;
  max_colors: number | null;
  max_area_width_cm: number | null;
  max_area_height_cm: number | null;
  unit_price: number;
  setup_price: number | null;
  handling_price: number | null;
  sla_days: number | null;
  is_active: boolean;
  // Aliases para compatibilidade
  code_option?: string;
  technique_name?: string;
}

// ============================================
// FUNÇÕES PARA ÁREAS DE IMPRESSÃO
// ============================================

/**
 * Busca áreas de impressão de um produto do BD Promobrind
 * Usa RPC fn_get_product_print_areas que retorna áreas + técnicas resolvidas em UMA chamada
 */
export async function fetchPromobrindPrintAreas(
  productId: string
): Promise<PromobrindPrintArea[]> {
  // Buscar áreas do campo JSONB products.personalization_areas
  // (tabela product_print_areas NÃO existe no BD externo)
  const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');
  const areas = await fetchPrintAreasFromProduct(productId);
  if (!areas.length) return [];

  // Buscar técnicas ativas
  const techResult = await invokeExternalDb<any>({
    table: 'tabela_preco_gravacao_oficial',
    operation: 'select',
    filters: { ativo: true },
    limit: 100,
  });

  const techById = new Map((techResult.records || []).map((t: any) => [t.id, t]));

  const result: PromobrindPrintArea[] = [];

  for (const area of areas) {
    const allowedIds = area.allowed_technique_ids || [];

    if (allowedIds.length === 0) {
      result.push({
        id: area.id,
        product_id: productId,
        area_code: area.area_code || '',
        area_name: area.area_name || area.location_name || '',
        component_name: area.component_name,
        location_name: area.location_name,
        max_width_cm: area.max_width,
        max_height_cm: area.max_height,
        max_area_cm2: null,
        is_curved: area.is_curved ?? false,
        technique_id: undefined,
        technique_code: undefined,
        technique_name: undefined,
        max_colors: undefined,
        is_default: area.is_primary ?? false,
        area_image_url: undefined,
      });
    } else {
      for (const tid of allowedIds) {
        const tech = techById.get(tid);
        result.push({
          id: area.id,
          product_id: productId,
          area_code: area.area_code || '',
          area_name: area.area_name || area.location_name || '',
          component_name: area.component_name,
          location_name: area.location_name,
          max_width_cm: area.max_width,
          max_height_cm: area.max_height,
          max_area_cm2: null,
          is_curved: area.is_curved ?? false,
          technique_id: tech?.id || tid,
          technique_code: tech?.codigo,
          technique_name: tech?.nome,
          max_colors: tech?.max_cores,
          is_default: area.is_primary ?? false,
          area_image_url: undefined,
        });
      }
    }
  }

  return result;
}

// ============================================
// FUNÇÕES PARA TÉCNICAS DE PERSONALIZAÇÃO
// ============================================

// Buscar todos os campos disponíveis sem especificar select (evita erro de colunas inexistentes)
// No BD externo, a fonte de verdade para técnicas é `tecnica_gravacao`.
const TECHNIQUE_SELECT_FIELDS = '*';

/**
 * Busca técnicas de personalização ativas do BD Promobrind
 */
export async function fetchPromobrindTechniques(options?: {
  ids?: string[];
  codes?: string[];
  limit?: number;
}): Promise<PromobrindTechnique[]> {
  const filters: Record<string, unknown> = { ativo: true };
  
  if (options?.ids?.length) {
    filters.id = options.ids;
  }
  if (options?.codes?.length) {
    filters.codigo = options.codes;
  }

  const result = await invokeExternalDb<PromobrindTechnique>({
    table: 'tecnica_gravacao',
    operation: 'select',
    filters,
    select: TECHNIQUE_SELECT_FIELDS,
    limit: options?.limit || 100,
    orderBy: { column: 'ordem_exibicao', ascending: true },
  });
  
  // Mapear campos (schema PT-BR) para o shape usado no app
  return result.records.map((t: any) => {
    const maxCoresRaw = t.max_cores ?? t.max_colors;
    const maxCores =
      typeof maxCoresRaw === 'number'
        ? maxCoresRaw
        : typeof maxCoresRaw === 'string'
          ? Number(maxCoresRaw)
          : null;

    return {
      ...t,
      code: t.codigo ?? t.code,
      name: t.nome ?? t.name,
      description: t.descricao ?? t.description ?? null,
      requires_color_count: t.permite_cores ?? t.requires_color_count ?? null,
      max_colors: Number.isFinite(maxCores as number) ? (maxCores as number) : null,
      price_by_color: t.cobra_por_cor ?? t.price_by_color ?? null,
      price_by_area: t.cobra_por_area ?? t.price_by_area ?? null,
      is_active: t.ativo ?? t.is_active ?? true,
      estimated_days: t.tempo_producao_dias ?? t.estimated_days ?? null,
      display_order: t.ordem_exibicao ?? t.display_order ?? null,
      // Custos não estão na tabela mestre; vêm das tabelas de faixa/preço
      setup_price: null,
      handling_price: null,
      setup_cost: null,
      unit_cost: null,
      min_quantity: null,
    } as PromobrindTechnique;
  });
}

/**
 * Busca uma técnica específica pelo ID
 */
export async function fetchPromobrindTechniqueById(
  techniqueId: string
): Promise<PromobrindTechnique | null> {
  const result = await invokeExternalDb<PromobrindTechnique>({
    table: 'tecnica_gravacao',
    operation: 'select',
    filters: { id: techniqueId },
    select: TECHNIQUE_SELECT_FIELDS,
    limit: 1,
  });
  
  const tech = result.records[0];
  if (!tech) return null;
  
  // Mapear campos para compatibilidade
  const t: any = tech;
  const maxCoresRaw = t.max_cores ?? t.max_colors;
  const maxCores =
    typeof maxCoresRaw === 'number'
      ? maxCoresRaw
      : typeof maxCoresRaw === 'string'
        ? Number(maxCoresRaw)
        : null;

  return {
    ...tech,
    code: t.codigo ?? t.code,
    name: t.nome ?? t.name,
    description: t.descricao ?? t.description ?? null,
    requires_color_count: t.permite_cores ?? t.requires_color_count ?? null,
    max_colors: Number.isFinite(maxCores as number) ? (maxCores as number) : null,
    price_by_color: t.cobra_por_cor ?? t.price_by_color ?? null,
    price_by_area: t.cobra_por_area ?? t.price_by_area ?? null,
    is_active: t.ativo ?? t.is_active ?? true,
    estimated_days: t.tempo_producao_dias ?? t.estimated_days ?? null,
    display_order: t.ordem_exibicao ?? t.display_order ?? null,
    setup_price: null,
    handling_price: null,
    setup_cost: null,
    unit_cost: null,
    min_quantity: null,
  };
}

// ============================================
// FUNÇÕES PARA TABELAS DE PREÇO
// ============================================

// Buscar todos os campos sem especificar select (evita erro de colunas inexistentes)
const PRICE_TABLE_SELECT_FIELDS = '*';

/**
 * Busca tabelas de preço para uma técnica
 */
export async function fetchPromobrindPriceTables(options?: {
  techniqueName?: string;
  techniqueCode?: string;
  quantity?: number;
  colors?: number;
  width?: number;
  height?: number;
}): Promise<PromobrindPriceTable[]> {
  const filters: Record<string, unknown> = { is_active: true };
  
  // Usar nomes corretos das colunas do BD
  if (options?.techniqueName) {
    filters.customization_type_name = options.techniqueName;
  }
  if (options?.techniqueCode) {
    filters.table_code = options.techniqueCode;
  }

  const result = await invokeExternalDb<Record<string, unknown>>({
    table: 'customization_price_tables',
    operation: 'select',
    filters,
    select: PRICE_TABLE_SELECT_FIELDS,
    limit: 500,
    orderBy: { column: 'tier_1_min_qty', ascending: true },
  });

  // Mapear campos do BD para interface
  let tables: PromobrindPriceTable[] = result.records.map(r => ({
    id: r.id as string,
    table_code: r.table_code as string,
    table_code_option: r.table_code_option as string,
    customization_type_name: r.customization_type_name as string,
    technique_code: (r.serv_code || r.table_code) as string | null,
    min_quantity: (r.tier_1_min_qty as number) || 1,
    max_quantity: (r.tier_15_min_qty as number) || null,
    min_colors: null,
    max_colors: (r.max_colors as number) || null,
    max_area_width_cm: (r.max_area_width_cm as number) || null,
    max_area_height_cm: (r.max_area_height_cm as number) || null,
    unit_price: (r.tier_1_unit_price as number) || 0,
    setup_price: (r.setup_price as number) || null,
    handling_price: (r.handling_price as number) || null,
    sla_days: (r.tier_1_sla_days as number) || null,
    is_active: r.is_active as boolean,
    // Aliases para compatibilidade
    code_option: r.table_code_option as string,
    technique_name: r.customization_type_name as string,
  }));
  
  // Filtrar por parâmetros opcionais
  if (options?.quantity) {
    tables = tables.filter(t => 
      t.min_quantity <= options.quantity! && 
      (t.max_quantity === null || t.max_quantity >= options.quantity!)
    );
  }
  if (options?.colors) {
    tables = tables.filter(t => 
      (t.min_colors === null || t.min_colors <= options.colors!) && 
      (t.max_colors === null || t.max_colors >= options.colors!)
    );
  }
  if (options?.width) {
    tables = tables.filter(t => 
      (t.max_area_width_cm === null || t.max_area_width_cm >= options.width!)
    );
  }
  if (options?.height) {
    tables = tables.filter(t => 
      (t.max_area_height_cm === null || t.max_area_height_cm >= options.height!)
    );
  }

  return tables;
}

/**
 * Encontra a melhor tabela de preço para os parâmetros dados
 */
export async function findBestPriceTable(options: {
  techniqueName?: string;
  techniqueCode?: string;
  quantity: number;
  colors?: number;
  width?: number;
  height?: number;
}): Promise<PromobrindPriceTable | null> {
  const tables = await fetchPromobrindPriceTables(options);
  
  // Retorna a primeira tabela que corresponde (já ordenada por min_quantity)
  return tables[0] || null;
}
