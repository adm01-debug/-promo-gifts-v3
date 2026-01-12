// Hook para buscar dados do simulador do banco externo Promobrind
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TIPOS
// ============================================

export interface ExternalProduct {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  images: string[];
  primary_image_url: string | null;
  category_id: string | null;
  supplier_reference: string | null;
  description: string | null;
  brand: string | null;
  is_active: boolean;
}

export interface ExternalPrintArea {
  id: string;
  product_id: string;
  component_name: string;
  component_code: string;
  location_name: string;
  location_code: string;
  area_name: string;
  area_code: string;
  supplier_technique_code: string;
  max_width: number | null;
  max_height: number | null;
  max_colors: number | null;
  area_cm2: number | null;
  is_curved: boolean;
  is_primary: boolean;
  is_active: boolean;
  display_order: number;
  serv_code: string | null;
}

export interface GroupedPrintArea {
  componentName: string;
  componentCode: string;
  locations: {
    locationName: string;
    locationCode: string;
    techniques: {
      id: string;
      areaName: string;
      techniqueCode: string;
      maxWidth: number | null;
      maxHeight: number | null;
      maxColors: number | null;
      areaCm2: number | null;
      isCurved: boolean;
      isPrimary: boolean;
      servCode: string | null;
    }[];
  }[];
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function invokeExternalDb<T>(
  table: string,
  operation: 'select',
  options?: {
    filters?: Record<string, unknown>;
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<{ records: T[]; count: number }> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table,
      operation,
      ...options,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Erro desconhecido');
  
  return data.data as { records: T[]; count: number };
}

// ============================================
// HOOKS
// ============================================

/**
 * Busca produtos do banco externo Promobrind
 */
export function useExternalProductSearch(searchQuery: string) {
  return useQuery({
    queryKey: ['external-products-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const result = await invokeExternalDb<ExternalProduct>('products', 'select', {
        filters: {
          name: searchQuery,
          is_active: true,
        },
        select: 'id, name, sku, base_price, images, primary_image_url, category_id, supplier_reference, description, brand, is_active',
        limit: 20,
        orderBy: { column: 'name', ascending: true },
      });

      return result.records;
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Busca um produto específico pelo ID
 */
export function useExternalProduct(productId: string | null) {
  return useQuery({
    queryKey: ['external-product', productId],
    queryFn: async () => {
      if (!productId) return null;
      
      const result = await invokeExternalDb<ExternalProduct>('products', 'select', {
        filters: { id: productId },
        select: 'id, name, sku, base_price, images, primary_image_url, category_id, supplier_reference, description, brand, is_active',
        limit: 1,
      });

      return result.records[0] || null;
    },
    enabled: !!productId,
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Busca áreas de gravação de um produto do banco externo
 * Agrupa por componente > local > técnica
 */
export function useExternalPrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['external-print-areas', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const result = await invokeExternalDb<ExternalPrintArea>('product_print_areas', 'select', {
        filters: { 
          product_id: productId,
          is_active: true,
        },
        orderBy: { column: 'display_order', ascending: true },
        limit: 100,
      });

      // Agrupar por componente > local > técnica
      const grouped: Record<string, GroupedPrintArea> = {};

      for (const area of result.records) {
        const compKey = area.component_code || 'default';
        
        if (!grouped[compKey]) {
          grouped[compKey] = {
            componentName: area.component_name || 'Produto',
            componentCode: area.component_code || 'default',
            locations: [],
          };
        }

        const comp = grouped[compKey];
        let location = comp.locations.find(l => l.locationCode === area.location_code);

        if (!location) {
          location = {
            locationName: area.location_name,
            locationCode: area.location_code,
            techniques: [],
          };
          comp.locations.push(location);
        }

        location.techniques.push({
          id: area.id,
          areaName: area.area_name,
          techniqueCode: area.supplier_technique_code,
          maxWidth: area.max_width,
          maxHeight: area.max_height,
          maxColors: area.max_colors,
          areaCm2: area.area_cm2,
          isCurved: area.is_curved,
          isPrimary: area.is_primary,
          servCode: area.serv_code,
        });
      }

      return Object.values(grouped);
    },
    enabled: !!productId,
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Busca todos os produtos do banco externo (lista completa)
 */
export function useExternalProductsList(options?: {
  limit?: number;
  onlyWithPrintAreas?: boolean;
}) {
  return useQuery({
    queryKey: ['external-products-list', options],
    queryFn: async () => {
      const result = await invokeExternalDb<ExternalProduct>('products', 'select', {
        filters: { 
          is_active: true,
        },
        select: 'id, name, sku, base_price, images, primary_image_url, supplier_reference, brand',
        limit: options?.limit || 100,
        orderBy: { column: 'name', ascending: true },
      });

      return result.records;
    },
    staleTime: 60000, // 1 minuto
  });
}
