import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TABELAS DISPONÍVEIS NO BANCO EXTERNO
// ============================================

// Tabelas de PRODUTOS (CRUD completo)
export const PRODUCT_TABLES = [
  'products',
  'product_images',
  'product_videos',
  'product_variants',
  'product_materials',
  'product_tags',
  'product_categories',
  'product_category_assignments',
  'product_print_areas',
  'product_kit_components',
  'product_suppliers',
  'product_attributes',
  'product_relationships',
  'product_reviews',
  'product_views',
  'product_comparisons',
  'product_personalization_options',
  'product_price_history',
  'product_technique_pricing_tiers',
  'categories',
  'category_attributes',
  'category_relationships',
  'suppliers',
  'supplier_colors',
  'tags',
  'personalization_techniques',
  'customization_price_tables',
  'color_groups',
  'color_nuances',
  'color_equivalences',
  'color_variations',
  'collections',
  'collection_products',
  'price_lists',
  'price_change_history',
  'variant_stocks',
  'variant_cost_tiers',
  'variant_sale_prices',
  'variation_types',
  'variation_values',
  'material_equivalences',
  'stock_movements',
  'mockup_drafts',
  'mockup_generation_jobs',
  'mockup_approval_links',
  'generated_mockups',
] as const;

// Tabelas de EMPRESAS/CLIENTES (somente leitura)
export const COMPANY_TABLES = [
  'bitrix_clients',
  'client_contacts',
  'client_notes',
  'organizations',
  'user_organizations',
  'business_sectors',
] as const;

export type ProductTable = typeof PRODUCT_TABLES[number];
export type CompanyTable = typeof COMPANY_TABLES[number];
export type ExternalTable = ProductTable | CompanyTable;

type Operation = 'select' | 'insert' | 'update' | 'delete';

interface QueryOptions {
  filters?: Record<string, unknown>;
  id?: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

interface QueryResult<T> {
  records: T[];
  count: number | null;
}

interface ExternalDatabaseState<T> {
  data: T[];
  count: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useExternalDatabase<T = Record<string, unknown>>(tableName: ExternalTable) {
  const [state, setState] = useState<ExternalDatabaseState<T>>({
    data: [],
    count: null,
    isLoading: false,
    error: null,
  });

  const invoke = useCallback(async (
    operation: Operation,
    options?: QueryOptions & { data?: Partial<T> }
  ): Promise<T | QueryResult<T> | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: tableName,
          operation,
          data: options?.data,
          filters: options?.filters,
          id: options?.id,
          select: options?.select,
          orderBy: options?.orderBy,
          limit: options?.limit,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      if (operation === 'select') {
        const result = data.data as QueryResult<T>;
        setState(prev => ({ 
          ...prev, 
          data: result.records, 
          count: result.count,
          isLoading: false 
        }));
        return result;
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return data.data as T;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao acessar banco externo';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(errorMessage);
      return null;
    }
  }, [tableName]);

  // Métodos convenientes
  const fetchAll = useCallback(async (options?: Omit<QueryOptions, 'id'>) => {
    return invoke('select', options) as Promise<QueryResult<T> | null>;
  }, [invoke]);

  const fetchOne = useCallback(async (id: string, select?: string) => {
    const result = await invoke('select', { id, select, limit: 1 });
    if (result && 'records' in result) {
      return result.records[0] || null;
    }
    return null;
  }, [invoke]);

  const create = useCallback(async (data: Partial<T>) => {
    const result = await invoke('insert', { data });
    if (result && !('records' in result)) {
      toast.success('Registro criado com sucesso!');
      return result as T;
    }
    return null;
  }, [invoke]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    const result = await invoke('update', { id, data });
    if (result && !('records' in result)) {
      toast.success('Registro atualizado com sucesso!');
      return result as T;
    }
    return null;
  }, [invoke]);

  const remove = useCallback(async (id: string) => {
    const result = await invoke('delete', { id });
    if (result) {
      toast.success('Registro excluído com sucesso!');
      return true;
    }
    return false;
  }, [invoke]);

  const refetch = useCallback(async (options?: Omit<QueryOptions, 'id'>) => {
    return fetchAll(options);
  }, [fetchAll]);

  return {
    ...state,
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    refetch,
    invoke,
  };
}

// ============================================
// HOOKS ESPECÍFICOS PARA CADA RECURSO
// ============================================

// Produtos (CRUD completo)
export function useExternalProducts() {
  return useExternalDatabase<ExternalProduct>('products');
}

export function useExternalProductImages() {
  return useExternalDatabase<ExternalProductImage>('product_images');
}

export function useExternalProductVariants() {
  return useExternalDatabase<ExternalProductVariant>('product_variants');
}

export function useExternalCategories() {
  return useExternalDatabase<ExternalCategory>('categories');
}

export function useExternalSuppliers() {
  return useExternalDatabase<ExternalSupplier>('suppliers');
}

export function useExternalTechniques() {
  return useExternalDatabase<ExternalTechnique>('personalization_techniques');
}

export function useExternalPriceTables() {
  return useExternalDatabase<ExternalPriceTable>('customization_price_tables');
}

export function useExternalCollections() {
  return useExternalDatabase<ExternalCollection>('collections');
}

export function useExternalTags() {
  return useExternalDatabase<ExternalTag>('tags');
}

// Empresas/Clientes (somente leitura)
export function useExternalCompanies() {
  return useExternalDatabase<ExternalCompany>('bitrix_clients');
}

export function useExternalClientContacts() {
  return useExternalDatabase<ExternalClientContact>('client_contacts');
}

export function useExternalOrganizations() {
  return useExternalDatabase<ExternalOrganization>('organizations');
}

// ============================================
// TIPOS BASE (ajuste conforme estrutura real)
// ============================================

export interface ExternalProduct {
  id: string;
  organization_id?: string;
  name: string;
  sku?: string;
  description?: string;
  short_description?: string;
  price?: number;
  cost_price?: number;
  category_id?: string;
  subcategory_id?: string;
  supplier_id?: string;
  brand?: string;
  model?: string;
  weight_grams?: number;
  width_cm?: number;
  height_cm?: number;
  depth_cm?: number;
  is_active?: boolean;
  is_kit?: boolean;
  min_quantity?: number;
  stock?: number;
  lead_time_days?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ExternalProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  position?: number;
  is_primary?: boolean;
  image_type?: string;
  created_at?: string;
}

export interface ExternalProductVariant {
  id: string;
  product_id: string;
  sku?: string;
  name?: string;
  color_id?: string;
  size?: string;
  price?: number;
  stock?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ExternalCategory {
  id: string;
  bitrix_id?: string;
  name: string;
  slug?: string;
  description?: string;
  parent_id?: string;
  level?: number;
  position?: number;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface ExternalSupplier {
  id: string;
  name: string;
  code?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  website?: string;
  lead_time_days?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ExternalTechnique {
  id: string;
  name: string;
  code?: string;
  description?: string;
  min_quantity?: number;
  setup_cost?: number;
  estimated_days?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ExternalPriceTable {
  id: string;
  organization_id?: string;
  table_code: string;
  table_code_option?: string;
  technique_id?: string;
  max_area_width_cm?: number;
  max_area_height_cm?: number;
  max_colors?: number;
  price_by_color?: boolean;
  price_by_area?: boolean;
  setup_price?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ExternalCollection {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface ExternalTag {
  id: string;
  name: string;
  slug?: string;
  color?: string;
  created_at?: string;
}

export interface ExternalCompany {
  id: string;
  bitrix_id?: string;
  name: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  ramo?: string;
  nicho?: string;
  logo_url?: string;
  primary_color_hex?: string;
  total_spent?: number;
  last_purchase_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalClientContact {
  id: string;
  client_id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  is_primary?: boolean;
  created_at?: string;
}

export interface ExternalOrganization {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  is_active?: boolean;
  created_at?: string;
}
