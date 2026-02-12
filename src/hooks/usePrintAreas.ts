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

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Busca áreas de um produto diretamente da tabela
 */
async function fetchProductPrintAreas(productId: string): Promise<ProductPrintArea[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'product_print_areas',
      operation: 'select',
      filters: { product_id: productId, is_active: true },
      orderBy: { column: 'display_order', ascending: true },
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar áreas');
  
  return data.data?.records || [];
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
      
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_print_areas',
          operation: 'select',
          filters: { product_id: productId, is_active: true },
          select: 'id',
          limit: 1,
        },
      });

      if (error) return false;
      return (data?.data?.count || 0) > 0;
    },
    enabled: !!productId,
    staleTime: 60000,
  });
}
