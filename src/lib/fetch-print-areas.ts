/**
 * Busca áreas de gravação de um produto do BD externo.
 * 
 * IMPORTANTE: A tabela 'product_print_areas' NÃO existe no BD externo.
 * Os dados ficam no campo JSONB 'personalization_areas' da tabela 'products'.
 * Enquanto não houver dados populados, retorna array vazio sem erro.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";

export interface PrintAreaFromProduct {
  id: string;
  product_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  component_code: string | null;
  location_name: string | null;
  location_code: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  is_active: boolean;
  display_order: number;
  max_colors: number | null;
  allowed_technique_ids: string[];
  customization_price_table_id: string | null;
  supplier_technique_code?: string;
  serv_code?: string;
  area_cm2?: number | null;
}

/**
 * Busca áreas de gravação do campo products.personalization_areas (JSONB).
 * Retorna array vazio se o produto não tiver áreas configuradas.
 */
export async function fetchPrintAreasFromProduct(productId: string): Promise<PrintAreaFromProduct[]> {
  try {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: {
        table: 'products',
        operation: 'select',
        select: 'id',
        filters: { id: productId },
        limit: 1,
      },
    });

    if (error || !data?.success) {
      logger.warn('[fetchPrintAreas] Erro ao buscar produto:', error?.message || data?.error);
      return [];
    }

    const product = data.data?.records?.[0];
    if (!product) return [];

    const areas = product.personalization_areas;
    if (!Array.isArray(areas) || areas.length === 0) return [];

    return areas.map((area: any, idx: number) => ({
      id: area.id || `${productId}-area-${idx}`,
      product_id: productId,
      area_code: area.area_code || area.code || '',
      area_name: area.area_name || area.name || `Área ${idx + 1}`,
      component_name: area.component_name || null,
      component_code: area.component_code || null,
      location_name: area.location_name || null,
      location_code: area.location_code || null,
      max_width: area.max_width || area.width || 0,
      max_height: area.max_height || area.height || 0,
      unit: area.unit || 'cm',
      shape: area.shape || 'rectangle',
      is_curved: area.is_curved || false,
      is_primary: area.is_primary || idx === 0,
      is_active: area.is_active !== false,
      display_order: area.display_order || idx,
      max_colors: area.max_colors || null,
      allowed_technique_ids: area.allowed_technique_ids || area.technique_ids || [],
      customization_price_table_id: area.customization_price_table_id || null,
      supplier_technique_code: area.supplier_technique_code,
      serv_code: area.serv_code,
      area_cm2: area.area_cm2 || null,
    }));
  } catch (err) {
    logger.warn('[fetchPrintAreas] Exceção:', err);
    return [];
  }
}
