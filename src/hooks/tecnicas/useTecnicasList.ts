/**
 * Hook: Lista de Técnicas
 * 
 * Responsável por: Busca e filtragem de técnicas
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TECNICAS_QUERY_OPTIONS } from '@/lib/query-config';
import { invokeExternalDb } from '@/lib/external-db';
import { 
  rawToTecnicaUnificada, 
  transformRawToTecnicas 
} from '@/lib/personalization';
import { TECNICAS_QUERY_KEYS } from './keys';
import type { 
  TecnicaUnificada, 
  TecnicaResumo,
  TecnicaFiltros,
  PersonalizationTechniqueRaw,
} from '@/types/tecnica-unificada';

/**
 * Lista completa de técnicas com filtros
 */
export function useTecnicasList(filtros?: TecnicaFiltros) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.lista(), filtros],
    queryFn: async (): Promise<TecnicaUnificada[]> => {
      const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
        table: 'personalization_techniques',
        operation: 'select',
        orderBy: { column: 'display_order', ascending: true },
      });

      let tecnicas = transformRawToTecnicas(result.records);

      // Aplicar filtros
      if (filtros) {
        if (filtros.apenasAtivas) {
          tecnicas = tecnicas.filter(t => t.ativo);
        }
        if (filtros.categoria) {
          tecnicas = tecnicas.filter(t => t.categoria === filtros.categoria);
        }
        if (filtros.permiteCores !== undefined) {
          tecnicas = tecnicas.filter(t => t.permiteCores === filtros.permiteCores);
        }
        if (filtros.precoPorArea !== undefined) {
          tecnicas = tecnicas.filter(t => t.precoPorArea === filtros.precoPorArea);
        }
        if (filtros.precoPorPontos !== undefined) {
          tecnicas = tecnicas.filter(t => t.precoPorPontos === filtros.precoPorPontos);
        }
        if (filtros.aplicaCurva !== undefined) {
          tecnicas = tecnicas.filter(t => t.aplicaSuperficieCurva === filtros.aplicaCurva);
        }
        if (filtros.busca) {
          const busca = filtros.busca.toLowerCase();
          tecnicas = tecnicas.filter(t => 
            t.nome.toLowerCase().includes(busca) ||
            t.codigo.toLowerCase().includes(busca) ||
            t.descricao?.toLowerCase().includes(busca)
          );
        }
      }

      return tecnicas;
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Lista resumida para dropdowns
 */
export function useTecnicasResumo(apenasAtivas = true) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.resumo(), apenasAtivas],
    queryFn: async (): Promise<TecnicaResumo[]> => {
      const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
        table: 'personalization_techniques',
        operation: 'select',
        select: 'id,code,name,category,requires_color_count,max_colors,price_by_color,price_by_area,is_active',
        filters: apenasAtivas ? { is_active: true } : undefined,
        orderBy: { column: 'name', ascending: true },
      });

      return result.records.map(t => ({
        id: t.id,
        codigo: t.code,
        nome: t.name,
        categoria: t.category,
        permiteCores: t.requires_color_count,
        maxCores: t.max_colors,
        precoPorCor: t.price_by_color,
        precoPorArea: t.price_by_area,
        ativo: t.is_active,
      }));
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por ID
 */
export function useTecnicaById(id: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.detalhe(id ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!id) return null;

      const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
        table: 'personalization_techniques',
        operation: 'select',
        filters: { id },
        limit: 1,
      });

      const tecnica = result.records[0];
      return tecnica ? rawToTecnicaUnificada(tecnica) : null;
    },
    enabled: !!id,
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por código
 */
export function useTecnicaByCodigo(codigo: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.porCodigo(codigo ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!codigo) return null;

      const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
        table: 'personalization_techniques',
        operation: 'select',
        filters: { code: codigo },
        limit: 1,
      });

      const tecnica = result.records[0];
      return tecnica ? rawToTecnicaUnificada(tecnica) : null;
    },
    enabled: !!codigo,
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Lista de categorias únicas
 */
export function useCategoriasTecnicas() {
  const { data: tecnicas = [] } = useTecnicasList({ apenasAtivas: true });
  
  const categorias = [...new Set(tecnicas.map(t => t.categoria))].sort();
  
  return categorias;
}

/**
 * Invalidar todas as queries de técnicas
 */
export function useInvalidateTecnicas() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
  };
}
