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
const PRODUCT_SELECT_FIELDS = 
  'id, name, sku, base_price, image_url, images, primary_image_url, ' +
  'category_id, main_category_id, supplier_reference, description, ' +
  'short_description, brand, is_active, active, stock_quantity, colors, ' +
  'materials, dimensions, min_quantity';

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

  const result = await invokeExternalDb<PromobrindProduct>({
    table: 'products',
    operation: 'select',
    filters,
    select: PRODUCT_SELECT_FIELDS,
    limit: options?.limit || 100,
    orderBy: { column: 'name', ascending: true },
  });

  return result.records;
}

/**
 * Busca um produto específico pelo ID
 */
export async function fetchPromobrindProductById(
  productId: string
): Promise<PromobrindProduct | null> {
  const result = await invokeExternalDb<PromobrindProduct>({
    table: 'products',
    operation: 'select',
    filters: { id: productId },
    select: PRODUCT_SELECT_FIELDS,
    limit: 1,
  });

  return result.records[0] || null;
}

/**
 * Busca produtos por SKU
 */
export async function fetchPromobrindProductBySku(
  sku: string
): Promise<PromobrindProduct | null> {
  const result = await invokeExternalDb<PromobrindProduct>({
    table: 'products',
    operation: 'select',
    filters: { sku },
    select: PRODUCT_SELECT_FIELDS,
    limit: 1,
  });

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
 * Busca cores únicas dos produtos Promobrind
 */
export async function fetchPromobrindColors(): Promise<{ name: string; hex: string }[]> {
  const result = await invokeExternalDb<{ colors: any[] }>({
    table: 'products',
    operation: 'select',
    filters: { active: true },
    select: 'colors',
    limit: 1000,
  });

  const uniqueColors = new Map<string, { name: string; hex: string }>();
  result.records.forEach((p) => {
    if (p.colors && Array.isArray(p.colors)) {
      p.colors.forEach((color: any) => {
        if (color?.name && !uniqueColors.has(color.name)) {
          uniqueColors.set(color.name, {
            name: color.name,
            hex: color.hex || '#000000',
          });
        }
      });
    }
  });

  return Array.from(uniqueColors.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
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
  return product.base_price || 0;
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

export interface PromobrindTechnique {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_cost: number | null;
  setup_cost: number | null;
  min_quantity: number | null;
  estimated_days: number | null;
  max_colors: number | null;
  max_width_cm: number | null;
  max_height_cm: number | null;
  is_active: boolean;
}

export interface PromobrindPriceTable {
  id: string;
  code_option: string;
  technique_name: string;
  technique_code: string | null;
  min_quantity: number;
  max_quantity: number | null;
  min_colors: number | null;
  max_colors: number | null;
  min_width_cm: number | null;
  max_width_cm: number | null;
  min_height_cm: number | null;
  max_height_cm: number | null;
  unit_price: number;
  setup_price: number | null;
  sla_days: number | null;
  is_active: boolean;
}

// ============================================
// FUNÇÕES PARA ÁREAS DE IMPRESSÃO
// ============================================

const PRINT_AREA_SELECT_FIELDS = 
  'id, product_id, area_code, area_name, component_name, location_name, ' +
  'max_width_cm, max_height_cm, max_area_cm2, is_curved, technique_id, ' +
  'technique_code, technique_name, max_colors, is_default, area_image_url';

/**
 * Busca áreas de impressão de um produto do BD Promobrind
 */
export async function fetchPromobrindPrintAreas(
  productId: string
): Promise<PromobrindPrintArea[]> {
  // Tentar buscar da view completa primeiro
  try {
    const result = await invokeExternalDb<PromobrindPrintArea>({
      table: 'v_product_print_areas_complete',
      operation: 'select',
      filters: { product_id: productId },
      select: PRINT_AREA_SELECT_FIELDS,
      limit: 100,
    });
    return result.records;
  } catch {
    // Fallback para tabela principal
    const result = await invokeExternalDb<PromobrindPrintArea>({
      table: 'product_print_areas',
      operation: 'select',
      filters: { product_id: productId },
      limit: 100,
    });
    return result.records;
  }
}

// ============================================
// FUNÇÕES PARA TÉCNICAS DE PERSONALIZAÇÃO
// ============================================

const TECHNIQUE_SELECT_FIELDS = 
  'id, code, name, description, category, unit_cost, setup_cost, ' +
  'min_quantity, estimated_days, max_colors, max_width_cm, max_height_cm, is_active';

/**
 * Busca técnicas de personalização ativas do BD Promobrind
 */
export async function fetchPromobrindTechniques(options?: {
  ids?: string[];
  codes?: string[];
  limit?: number;
}): Promise<PromobrindTechnique[]> {
  const filters: Record<string, unknown> = { is_active: true };
  
  if (options?.ids?.length) {
    filters.id = options.ids;
  }
  if (options?.codes?.length) {
    filters.code = options.codes;
  }

  const result = await invokeExternalDb<PromobrindTechnique>({
    table: 'personalization_techniques',
    operation: 'select',
    filters,
    select: TECHNIQUE_SELECT_FIELDS,
    limit: options?.limit || 100,
    orderBy: { column: 'name', ascending: true },
  });
  return result.records;
}

/**
 * Busca uma técnica específica pelo ID
 */
export async function fetchPromobrindTechniqueById(
  techniqueId: string
): Promise<PromobrindTechnique | null> {
  const result = await invokeExternalDb<PromobrindTechnique>({
    table: 'personalization_techniques',
    operation: 'select',
    filters: { id: techniqueId },
    select: TECHNIQUE_SELECT_FIELDS,
    limit: 1,
  });
  return result.records[0] || null;
}

// ============================================
// FUNÇÕES PARA TABELAS DE PREÇO
// ============================================

const PRICE_TABLE_SELECT_FIELDS = 
  'id, code_option, technique_name, technique_code, min_quantity, max_quantity, ' +
  'min_colors, max_colors, min_width_cm, max_width_cm, min_height_cm, max_height_cm, ' +
  'unit_price, setup_price, sla_days, is_active';

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
  
  if (options?.techniqueName) {
    filters.technique_name = options.techniqueName;
  }
  if (options?.techniqueCode) {
    filters.technique_code = options.techniqueCode;
  }

  const result = await invokeExternalDb<PromobrindPriceTable>({
    table: 'customization_price_tables',
    operation: 'select',
    filters,
    select: PRICE_TABLE_SELECT_FIELDS,
    limit: 500,
    orderBy: { column: 'min_quantity', ascending: true },
  });

  // Filtrar por parâmetros opcionais
  let tables = result.records;
  
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
      (t.min_width_cm === null || t.min_width_cm <= options.width!) && 
      (t.max_width_cm === null || t.max_width_cm >= options.width!)
    );
  }
  if (options?.height) {
    tables = tables.filter(t => 
      (t.min_height_cm === null || t.min_height_cm <= options.height!) && 
      (t.max_height_cm === null || t.max_height_cm >= options.height!)
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
