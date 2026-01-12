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
