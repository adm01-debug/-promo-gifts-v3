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
// ============================================

export interface PromobrindProduct {
  id: string;
  name: string;
  sku: string;
  base_price: number | null;
  images: string[] | null;
  primary_image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  supplier_reference: string | null;
  description: string | null;
  brand: string | null;
  is_active: boolean;
  stock?: number | null;
  colors?: any[] | null;
  materials?: string[] | null;
}

// ============================================
// FUNÇÕES AUXILIARES PARA PRODUTOS
// ============================================

/**
 * Busca produtos do banco Promobrind via bridge
 */
export async function fetchPromobrindProducts(options?: {
  search?: string;
  limit?: number;
  filters?: Record<string, unknown>;
}): Promise<PromobrindProduct[]> {
  const filters: Record<string, unknown> = {
    is_active: true,
    ...options?.filters,
  };

  if (options?.search) {
    filters.name = options.search;
  }

  const result = await invokeExternalDb<PromobrindProduct>({
    table: 'products',
    operation: 'select',
    filters,
    select: 'id, name, sku, base_price, images, primary_image_url, category_id, category_name, supplier_reference, description, brand, is_active, stock, colors, materials',
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
    select: 'id, name, sku, base_price, images, primary_image_url, category_id, category_name, supplier_reference, description, brand, is_active, stock, colors, materials',
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
    select: 'id, name, sku, base_price, images, primary_image_url, category_id, category_name, supplier_reference, description, brand, is_active',
    limit: 1,
  });

  return result.records[0] || null;
}

/**
 * Busca categorias únicas dos produtos Promobrind
 */
export async function fetchPromobrindCategories(): Promise<{ id: string; name: string }[]> {
  const result = await invokeExternalDb<{ category_id: string; category_name: string }>({
    table: 'products',
    operation: 'select',
    filters: { is_active: true },
    select: 'category_id, category_name',
    limit: 1000,
  });

  const uniqueCategories = new Map<string, { id: string; name: string }>();
  result.records.forEach((p) => {
    if (p.category_name && !uniqueCategories.has(p.category_name)) {
      uniqueCategories.set(p.category_name, {
        id: p.category_id || p.category_name,
        name: p.category_name,
      });
    }
  });

  return Array.from(uniqueCategories.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Busca cores únicas dos produtos Promobrind
 */
export async function fetchPromobrindColors(): Promise<{ name: string; hex: string }[]> {
  const result = await invokeExternalDb<{ colors: any[] }>({
    table: 'products',
    operation: 'select',
    filters: { is_active: true },
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
