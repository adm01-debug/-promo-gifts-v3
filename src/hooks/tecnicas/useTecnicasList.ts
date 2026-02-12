/**
 * Hook: Lista de Técnicas
 * 
 * ============================================
 * IMPORTANTE: USA SOMENTE O BD EXTERNO PROMOBRIND!
 * Tabela real: tabela_preco_gravacao_oficial
 * O bridge mapeia 'tecnica_gravacao' → tabela real
 * ============================================
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TECNICAS_QUERY_OPTIONS } from '@/lib/query-config';
import { TECNICAS_QUERY_KEYS } from './keys';
import type { 
  TecnicaUnificada, 
  TecnicaResumo,
  TecnicaFiltros,
} from '@/types/tecnica-unificada';

/**
 * Shape retornado pelo bridge após mapTechniqueRowToLegacyShape
 * Combina campos legacy + campos reais da tabela_preco_gravacao_oficial
 */
interface TecnicaBridgeResponse {
  id: string;
  // Campos legacy (mapeados pelo bridge)
  codigo: string;
  codigo_interno?: string;
  nome: string;
  slug?: string;
  descricao?: string | null;
  permite_cores: boolean;
  max_cores?: number | string | null;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  requer_setup: boolean;
  tipo_setup?: string;
  tempo_producao_dias?: number | null;
  ordem_exibicao?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos extras da tabela real
  grupo_tecnica?: string;
  nome_grupo?: string;
  slug_grupo?: string;
  ordem_grupo?: number;
  custo_setup?: number;
  custo_aplicacao?: number;
  cobra_aplicacao?: boolean;
  // Campos legacy (personalization_techniques shape)
  setup_price?: number;
  handling_price?: number;
  setup_cost?: number;
  min_quantity?: number | null;
  estimated_days?: number | null;
  display_order?: number;
  // Campos da tabela real
  area_maxima_texto?: string;
  is_curved?: boolean;
  aplica_superficie_curva?: boolean;
}

/**
 * Transforma resposta do bridge para TecnicaUnificada
 */
function bridgeToTecnicaUnificada(row: TecnicaBridgeResponse): TecnicaUnificada {
  const maxCores = typeof row.max_cores === 'string' 
    ? parseInt(row.max_cores, 10) 
    : (row.max_cores ?? 0);

  return {
    id: row.id,
    codigo: row.codigo || '',
    codigoFornecedor: row.codigo_interno || null,
    codigoStricker: null,
    nome: row.nome,
    descricao: row.descricao || null,
    categoria: row.nome_grupo || row.grupo_tecnica || 'geral',
    icone: null,
    permiteCores: row.permite_cores ?? (maxCores > 0),
    minCores: 1,
    maxCores: maxCores || 0,
    precoPorCor: row.cobra_por_cor ?? false,
    precoCorExtra: 0,
    precoPorArea: row.cobra_por_area ?? false,
    precoPorPontos: row.cobra_por_pontos ?? false,
    areaMinimaCm2: null,
    areaMaximaCm2: null,
    pontosMaximos: null,
    custoSetup: row.custo_setup ?? row.setup_price ?? 0,
    custoManuseio: row.handling_price ?? 0,
    multiplicadorCusto: 1,
    quantidadeMinima: row.min_quantity ?? null,
    prazoEstimado: row.tempo_producao_dias ?? row.estimated_days ?? null,
    aplicaSuperficieCurva: row.is_curved ?? row.aplica_superficie_curva ?? false,
    promptSuffix: null,
    ativo: row.ativo ?? true,
    ordemExibicao: row.ordem_exibicao ?? row.ordem_grupo ?? row.display_order ?? 0,
    fonte: 'externo',
    criadoEm: row.created_at || '',
    atualizadoEm: row.updated_at || '',
  };
}

/**
 * Busca técnicas do BD EXTERNO via edge function
 */
async function fetchTecnicasExterno(): Promise<TecnicaBridgeResponse[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      orderBy: { column: 'ordem_exibicao', ascending: true },
      limit: 200,
    },
  });

  if (error) {
    console.error('Erro ao buscar técnicas do BD externo:', error);
    throw error;
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro desconhecido ao buscar técnicas');
  }

  return data.data?.records || [];
}

/**
 * Lista completa de técnicas do BD EXTERNO com filtros
 */
export function useTecnicasList(filtros?: TecnicaFiltros) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.lista(), filtros],
    queryFn: async (): Promise<TecnicaUnificada[]> => {
      const rawData = await fetchTecnicasExterno();
      let tecnicas = rawData.map(bridgeToTecnicaUnificada);

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
 * Lista resumida de técnicas do BD EXTERNO para dropdowns
 */
export function useTecnicasResumo(apenasAtivas = true) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.resumo(), apenasAtivas],
    queryFn: async (): Promise<TecnicaResumo[]> => {
      const rawData = await fetchTecnicasExterno();
      
      let tecnicas = rawData;
      if (apenasAtivas) {
        tecnicas = tecnicas.filter(t => t.ativo);
      }

      return tecnicas.map(t => {
        const maxCores = typeof t.max_cores === 'string' 
          ? parseInt(t.max_cores, 10) 
          : (t.max_cores ?? 0);

        return {
          id: t.id,
          codigo: t.codigo || '',
          nome: t.nome,
          categoria: t.nome_grupo || t.grupo_tecnica || 'geral',
          permiteCores: t.permite_cores ?? (maxCores > 0),
          maxCores: maxCores,
          precoPorCor: t.cobra_por_cor ?? false,
          precoPorArea: t.cobra_por_area ?? false,
          ativo: t.ativo ?? true,
        };
      });
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por ID do BD EXTERNO
 */
export function useTecnicaById(id: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.detalhe(id ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!id) return null;

      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { id },
          limit: 1,
        },
      });

      if (error) throw error;

      const records = data?.data?.records || [];
      return records.length > 0 ? bridgeToTecnicaUnificada(records[0]) : null;
    },
    enabled: !!id,
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por código do BD EXTERNO
 */
export function useTecnicaByCodigo(codigo: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.porCodigo(codigo ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!codigo) return null;

      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { codigo },
          limit: 1,
        },
      });

      if (error) throw error;

      const records = data?.data?.records || [];
      return records.length > 0 ? bridgeToTecnicaUnificada(records[0]) : null;
    },
    enabled: !!codigo,
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Lista de categorias únicas (baseado em grupo_tecnica/nome_grupo)
 */
export function useCategoriasTecnicas() {
  const { data: tecnicas = [] } = useTecnicasList({ apenasAtivas: true });
  
  const categorias = [...new Set(tecnicas.map(t => t.categoria))].filter(c => c !== 'geral').sort();
  
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
