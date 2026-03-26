/**
 * Hooks: Áreas de Gravação (Print Areas)
 * 
 * FONTE ÚNICA: tabela 'print_area_techniques' no BD externo.
 * Técnicas resolvidas via lookup em 'tabela_preco_gravacao_oficial'.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PrintAreaWithTechniques, TecnicaGravacao } from '@/types/gravacao';
import { logger } from "@/lib/logger";

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Busca áreas de gravação de um produto via print_area_techniques.
 */
async function fetchProductPrintAreas(productId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: {
        table: 'print_area_techniques',
        operation: 'select',
        filters: { product_id: productId, is_active: true },
        orderBy: { column: 'technique_order', ascending: true },
        limit: 50,
      },
    });

    if (error || !data?.success) {
      logger.warn('[usePrintAreas] Erro ao buscar print_area_techniques:', error?.message || data?.error);
      return [];
    }

    return data.data?.records || [];
  } catch (err) {
    logger.warn('[usePrintAreas] Exceção ao buscar áreas:', err);
    return [];
  }
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook: Busca áreas de gravação de um produto com técnicas resolvidas
 */
export function usePrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['print-areas', productId],
    queryFn: async (): Promise<PrintAreaWithTechniques[]> => {
      if (!productId) return [];

      const areas = await fetchProductPrintAreas(productId);
      if (!areas.length) return [];

      // Coletar tabela_preco_ids
      const priceTableIds = new Set<string>();
      for (const area of areas) {
        if (area.tabela_preco_id) priceTableIds.add(area.tabela_preco_id);
      }

      // Buscar técnicas ativas
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

      return areas.map((area: any, idx: number) => {
        const tech = area.tabela_preco_id ? techById.get(area.tabela_preco_id) : null;
        const techniques: { id: string; nome: string; codigo: string }[] = [];

        if (tech) {
          techniques.push({
            id: tech.id,
            nome: tech.nome,
            codigo: tech.codigo || tech.codigo_curto || '',
          });
        }

        return {
          area_id: area.id,
          area_code: area.location_code || '',
          area_name: area.location_name
            ? (tech?.nome ? `${area.location_name} — ${tech.nome}` : area.location_name)
            : `Área ${idx + 1}`,
          component_name: null,
          location_name: area.location_name || null,
          max_width: area.max_width || 0,
          max_height: area.max_height || 0,
          unit: 'cm',
          shape: area.shape || 'rectangle',
          is_curved: area.is_curved ?? false,
          is_primary: idx === 0,
          display_order: area.technique_order || idx,
          techniques,
        };
      });
    },
    enabled: !!productId,
    staleTime: 60000,
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000,
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
            table: 'print_area_techniques',
            operation: 'select',
            select: 'id',
            filters: { product_id: productId, is_active: true },
            limit: 1,
          },
        });

        if (error || !data?.success) return false;
        const records = data.data?.records || [];
        return records.length > 0;
      } catch {
        return false;
      }
    },
    enabled: !!productId,
    staleTime: 60000,
  });
}
