/**
 * Hooks: Áreas de Gravação (Print Areas)
 * 
 * Hooks para buscar e gerenciar áreas de personalização de produtos.
 * Usa a RPC fn_get_product_print_areas do BD externo.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeExternalRpc } from '@/lib/external-rpc';
import type { 
  PrintAreaWithTechniques, 
  ProductPrintArea,
  TecnicaGravacao,
} from '@/types/gravacao';
import { logger } from "@/lib/logger";

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Busca áreas de gravação de um produto.
 * 
 * NOTA: A tabela 'product_print_areas' NÃO existe no BD externo.
 * Os dados de personalização ficam no campo JSONB 'personalization_areas'
 * da tabela 'products'. Enquanto não houver dados populados lá,
 * retornamos array vazio sem erro.
 */
async function fetchProductPrintAreas(productId: string): Promise<ProductPrintArea[]> {
  try {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: {
        table: 'products',
        operation: 'select',
        select: 'id,personalization_areas',
        filters: { id: productId },
        limit: 1,
      },
    });

    if (error || !data?.success) {
      logger.warn('[usePrintAreas] Erro ao buscar produto:', error?.message || data?.error);
      return [];
    }

    const product = data.data?.records?.[0];
    if (!product) return [];

    // personalization_areas é um JSONB array no produto
    const areas = product.personalization_areas;
    if (!Array.isArray(areas) || areas.length === 0) return [];

    // Mapear JSONB para formato esperado
    return areas.map((area: any, idx: number) => ({
      id: area.id || `${productId}-area-${idx}`,
      product_id: productId,
      area_code: area.area_code || area.code || '',
      area_name: area.area_name || area.name || `Área ${idx + 1}`,
      max_width: area.max_width || area.width || 0,
      max_height: area.max_height || area.height || 0,
      shape: area.shape || 'rectangle',
      is_curved: area.is_curved || false,
      is_primary: area.is_primary || idx === 0,
      is_active: area.is_active !== false,
      display_order: area.display_order || idx,
      component_name: area.component_name || null,
      location_name: area.location_name || null,
      unit: area.unit || 'cm',
      allowed_technique_ids: area.allowed_technique_ids || area.technique_ids || [],
    }));
  } catch (err) {
    logger.warn('[usePrintAreas] Exceção ao buscar áreas:', err);
    return [];
  }
}

/**
 * Busca técnicas por array de IDs
 */
async function fetchTechniquesByIds(ids: string[]): Promise<TecnicaGravacao[]> {
  if (!ids.length) return [];
  
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      filters: { id: ids },
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar técnicas');
  
  return data.data?.records || [];
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook: Busca áreas de gravação de um produto com técnicas resolvidas
 * 
 * Usa a RPC fn_get_product_print_areas quando disponível,
 * com fallback para busca manual + resolução de técnicas.
 */
export function usePrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['print-areas', productId],
    queryFn: async (): Promise<PrintAreaWithTechniques[]> => {
      if (!productId) return [];

      // Busca direta nas tabelas reais (RPC fn_get_product_print_areas referencia coluna inexistente)
      const areas = await fetchProductPrintAreas(productId);
      
      if (!areas.length) return [];
      
      // Buscar todas as técnicas ativas
      const { data: techData, error: techError } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'tabela_preco_gravacao_oficial',
          operation: 'select',
          filters: { ativo: true },
          limit: 100,
        },
      });

      if (techError) throw new Error(techError.message);
      if (!techData?.success) throw new Error(techData?.error || 'Erro ao buscar técnicas');
      
      const allTechs = techData.data?.records || [];
      const techById = new Map(allTechs.map((t: any) => [t.id, t]));
      
      // Montar resultado
      return areas.map(area => {
        const techniques: { id: string; nome: string; codigo: string }[] = [];
        const allowedIds = (area as any).allowed_technique_ids || [];
        
        for (const tid of allowedIds) {
          const tech = techById.get(tid);
          if (tech) {
            techniques.push({ id: tech.id, nome: tech.nome, codigo: tech.codigo });
          }
        }

        return {
          area_id: area.id,
          area_code: area.area_code || '',
          area_name: area.area_name || '',
          component_name: (area as any).component_name,
          location_name: (area as any).location_name,
          max_width: area.max_width || 0,
          max_height: area.max_height || 0,
          unit: (area as any).unit || 'cm',
          shape: area.shape || 'rectangle',
          is_curved: area.is_curved,
          is_primary: area.is_primary,
          display_order: area.display_order,
          techniques,
        };
      });
    },
    enabled: !!productId,
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook: Busca todas as técnicas de gravação ativas
 */
export function useTechniques() {
  return useQuery({
    queryKey: ['techniques-all'],
    queryFn: async (): Promise<TecnicaGravacao[]> => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { ativo: true },
          orderBy: { column: 'ordem_exibicao', ascending: true },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar técnicas');
      
      return data.data?.records || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook: Busca estatísticas de uso das técnicas
 */
export function useTechniqueStats() {
  return useQuery({
    queryKey: ['technique-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'v_technique_stats',
          operation: 'select',
          orderBy: { column: 'produtos_com_tecnica', ascending: false },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar estatísticas');
      
      return data.data?.records || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook: Verifica se um produto tem áreas de gravação
 */
export function useHasPrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['has-print-areas', productId],
    queryFn: async (): Promise<boolean> => {
      if (!productId) return false;
      
      try {
        const { data, error } = await supabase.functions.invoke('external-db-bridge', {
          body: {
            table: 'products',
            operation: 'select',
            select: 'id,personalization_areas',
            filters: { id: productId },
            limit: 1,
          },
        });

        if (error || !data?.success) return false;
        const product = data.data?.records?.[0];
        const areas = product?.personalization_areas;
        return Array.isArray(areas) && areas.length > 0;
      } catch {
        return false;
      }
    },
    enabled: !!productId,
    staleTime: 60000,
  });
}
