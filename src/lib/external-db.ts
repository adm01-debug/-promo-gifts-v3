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
}

interface InvokeResult<T> {
  records: T[];
  count: number;
}

/**
 * Invoca o external-db-bridge para operações CRUD no banco Promobrind.
 * Esse é o método seguro e padronizado de acessar o banco externo,
 * passando pelo edge function que valida autenticação e permissões.
 */
export async function invokeExternalDb<T>(
  options: InvokeOptions
): Promise<InvokeResult<T>> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: options,
  });

  if (error) {
    throw new Error(`Erro na bridge: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro desconhecido no banco externo');
  }

  // Para operações que retornam um único registro
  if (options.operation !== 'select' && data.data && !Array.isArray(data.data)) {
    return { records: [data.data as T], count: 1 };
  }

  return data.data as InvokeResult<T>;
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
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table, operation: 'delete', id },
  });

  if (error) {
    throw new Error(`Erro na bridge: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro ao excluir registro');
  }
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
  /** Preço base (custo do fornecedor) */
  base_price: number | null;
  image_url: string | null;        // Campo correto do schema
  images: string[] | null;
  primary_image_url: string | null;
  category_id: string | null;
  main_category_id: string | null; // Campo correto do schema
  supplier_reference: string | null;
  description: string | null;
  short_description: string | null;
  brand: string | null;
  is_active: boolean;
  active: boolean;                 // Alias no schema externo
  stock_quantity?: number | null;
  colors?: any[] | null;
  materials?: string | null;       // É string no schema, não array
  dimensions?: string | null;
  min_quantity?: number | null;
}

// ============================================
// FUNÇÕES AUXILIARES PARA PRODUTOS
// ============================================

// Select fields que existem no schema Promobrind
// Observação: alguns schemas/views legados podem não ter `sale_price`.
// Para evitar tela branca, fazemos fallback automático para o select antigo.
const PRODUCT_SELECT_FIELDS_WITH_SALE =
  'id, name, sku, sale_price, base_price, image_url, images, primary_image_url, ' +
  'category_id, main_category_id, supplier_reference, description, ' +
  'short_description, brand, is_active, active, stock_quantity, colors, ' +
  'materials, dimensions, min_quantity';

const PRODUCT_SELECT_FIELDS_LEGACY =
  'id, name, sku, base_price, image_url, images, primary_image_url, ' +
  'category_id, main_category_id, supplier_reference, description, ' +
  'short_description, brand, is_active, active, stock_quantity, colors, ' +
  'materials, dimensions, min_quantity';

function shouldFallbackSalePriceSelect(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /sale_price/i.test(msg) && /(does not exist|não existe)/i.test(msg);
}

/**
 * Busca produtos do banco Promobrind via bridge
 */
export async function fetchPromobrindProducts(options?: {
  search?: string;
  limit?: number;
  filters?: Record<string, unknown>;
}): Promise<PromobrindProduct[]> {
  const filters: Record<string, unknown> = {
    active: true,  // Campo correto no schema externo
    ...options?.filters,
  };

  if (options?.search) {
    filters.name = options.search;
  }

  // Se limit foi informado, faz uma única chamada.
  // Caso contrário, pagina automaticamente para buscar tudo.
  const orderBy = { column: 'name', ascending: true } as const;

  let products: PromobrindProduct[] = [];

  if (typeof options?.limit === 'number' && options.limit > 0) {
    let result: InvokeResult<PromobrindProduct>;
    try {
      result = await invokeExternalDb<PromobrindProduct>({
        table: 'products',
        operation: 'select',
        filters,
        select: PRODUCT_SELECT_FIELDS_WITH_SALE,
        orderBy,
        limit: options.limit,
        offset: 0,
      });
    } catch (err) {
      if (!shouldFallbackSalePriceSelect(err)) throw err;
      result = await invokeExternalDb<PromobrindProduct>({
        table: 'products',
        operation: 'select',
        filters,
        select: PRODUCT_SELECT_FIELDS_LEGACY,
        orderBy,
        limit: options.limit,
        offset: 0,
      });
    }
    products = result.records;
  } else {
    // Paginação: o backend aplica default 500; aqui buscamos em páginas maiores
    // para suportar catálogos grandes (10k+). Mantemos pageSize = 1000 para evitar timeouts.
    const pageSize = 1000;
    let offset = 0;
    let totalCount: number | null = null;

    // Segurança: evita loops infinitos caso o count venha nulo/errado.
    const HARD_MAX = 200000;

    while (offset < HARD_MAX) {
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
        });
      } catch (err) {
        if (!shouldFallbackSalePriceSelect(err)) throw err;
        page = await invokeExternalDb<PromobrindProduct>({
          table: 'products',
          operation: 'select',
          filters,
          select: PRODUCT_SELECT_FIELDS_LEGACY,
          orderBy,
          limit: pageSize,
          offset,
        });
      }

      if (typeof page.count === 'number') {
        totalCount = page.count;
      }

      products.push(...page.records);
      offset += page.records.length;

      // Paradas
      if (page.records.length < pageSize) break;
      if (totalCount !== null && products.length >= totalCount) break;
    }
  }

  // Buscar cores das variantes de TODOS os produtos de uma vez
  // para enriquecer o campo colors (que vem vazio da tabela products)
  if (products.length > 0) {
    try {
      const productIds = products.map(p => p.id);
      
      const variantsResult = await invokeExternalDb<{
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
        select: 'product_id, color_name, color_hex, color_code, sku, stock_quantity, images, selected_images, selected_thumbnail',
        filters: { is_active: true },
        limit: 5000,
      });

      // Agrupar cores por produto
      const colorsByProduct = new Map<string, Array<{ 
        name: string; 
        hex: string; 
        code: string;
        sku?: string;
        stock?: number;
        image?: string;
        images?: string[];
      }>>();
      
      variantsResult.records.forEach(variant => {
        if (!variant.color_name || !productIds.includes(variant.product_id)) return;
        
        if (!colorsByProduct.has(variant.product_id)) {
          colorsByProduct.set(variant.product_id, []);
        }
        
        const colors = colorsByProduct.get(variant.product_id)!;
        // Evitar duplicatas por nome de cor
        if (!colors.some(c => c.name === variant.color_name)) {
          // Determinar imagens da variante
          const variantImages = variant.selected_images?.length 
            ? variant.selected_images 
            : variant.images?.length 
              ? variant.images 
              : [];
          const thumbnailImage = variant.selected_thumbnail || variantImages[0] || null;
          
          colors.push({
            name: variant.color_name,
            hex: variant.color_hex || '#CCCCCC',
            code: variant.color_code || '',
            sku: variant.sku || undefined,
            stock: variant.stock_quantity ?? undefined,
            image: thumbnailImage || undefined,
            images: variantImages.length > 0 ? variantImages : undefined,
          });
        }
      });

      // Enriquecer produtos com cores das variantes
      products.forEach(product => {
        const variantColors = colorsByProduct.get(product.id);
        if (variantColors && variantColors.length > 0) {
          product.colors = variantColors;
        }
      });
    } catch (err) {
      console.warn('Não foi possível buscar cores das variantes:', err);
      // Continua sem cores - não bloqueia o fluxo
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
  let result: InvokeResult<PromobrindProduct>;
  try {
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products',
      operation: 'select',
      filters: { id: productId },
      select: PRODUCT_SELECT_FIELDS_WITH_SALE,
      limit: 1,
    });
  } catch (err) {
    if (!shouldFallbackSalePriceSelect(err)) throw err;
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products',
      operation: 'select',
      filters: { id: productId },
      select: PRODUCT_SELECT_FIELDS_LEGACY,
      limit: 1,
    });
  }

  const product = result.records[0] || null;
  
  // Se o produto não tem cores ou tem array vazio, buscar das variantes
  if (product && (!product.colors || product.colors.length === 0)) {
    try {
      const variantsResult = await invokeExternalDb<{
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
        select: 'product_id, color_name, color_hex, color_code, sku, stock_quantity, images, selected_images, selected_thumbnail',
        filters: { product_id: productId, is_active: true },
        limit: 100,
      });

      // Extrair cores únicas das variantes com imagens
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
          // Determinar imagens da variante
          const variantImages = variant.selected_images?.length 
            ? variant.selected_images 
            : variant.images?.length 
              ? variant.images 
              : [];
          const thumbnailImage = variant.selected_thumbnail || variantImages[0] || null;
          
          uniqueColors.push({
            name: variant.color_name,
            hex: variant.color_hex || '#CCCCCC',
            code: variant.color_code || '',
            sku: variant.sku || undefined,
            stock: variant.stock_quantity ?? undefined,
            image: thumbnailImage || undefined,
            images: variantImages.length > 0 ? variantImages : undefined,
          });
        }
      });

      if (uniqueColors.length > 0) {
        product.colors = uniqueColors;
      }
    } catch (err) {
      console.warn('Não foi possível buscar cores das variantes para produto:', productId, err);
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
    if (!shouldFallbackSalePriceSelect(err)) throw err;
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
 * Usa tabela principal product_print_areas (view v_product_print_areas_complete pode não existir)
 */
export async function fetchPromobrindPrintAreas(
  productId: string
): Promise<PromobrindPrintArea[]> {
  // Tentar tabela principal primeiro (mais confiável)
  try {
    const result = await invokeExternalDb<PromobrindPrintArea>({
      table: 'product_print_areas',
      operation: 'select',
      filters: { product_id: productId },
      limit: 100,
    });
    
    // Mapear campos que podem ter nomes diferentes
    return result.records.map(record => ({
      id: record.id,
      product_id: record.product_id,
      area_code: record.area_code || '',
      area_name: record.area_name || record.location_name || '',
      component_name: record.component_name,
      location_name: record.location_name,
      max_width_cm: (record as any).max_width_cm ?? (record as any).largura_max_cm ?? null,
      max_height_cm: (record as any).max_height_cm ?? (record as any).altura_max_cm ?? null,
      max_area_cm2: (record as any).max_area_cm2 ?? (record as any).area_max_cm2 ?? null,
      is_curved: record.is_curved ?? false,
      technique_id: record.technique_id,
      technique_code: record.technique_code,
      technique_name: record.technique_name,
      max_colors: record.max_colors,
      is_default: record.is_default ?? false,
      area_image_url: record.area_image_url,
    }));
  } catch (err) {
    console.error('Erro ao buscar áreas de impressão do Promobrind:', err);
    return [];
  }
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
