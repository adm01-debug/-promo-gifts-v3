/**
 * Hook: Lista de Técnicas
 * 
 * ============================================
 * IMPORTANTE: USA SOMENTE O BD EXTERNO PROMOBRIND!
 * Tabelas: tecnica_gravacao, tecnica_gravacao_variante
 * NÃO existe BD local para técnicas.
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

// Tipo do BD externo: tecnica_gravacao
interface TecnicaGravacaoExterno {
  id: string;
  codigo: string;
  codigo_interno?: string;
  nome: string;
  slug?: string;
  descricao?: string;
  permite_cores: boolean;
  max_cores?: string;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  requer_setup: boolean;
  tipo_setup?: string;
  tempo_producao_dias?: number;
  ordem_exibicao?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Transforma dados do BD EXTERNO (tecnica_gravacao) para TecnicaUnificada
 */
function externalToTecnicaUnificada(row: TecnicaGravacaoExterno): TecnicaUnificada {
  return {
    id: row.id,
    codigo: row.codigo || '',
    codigoFornecedor: row.codigo_interno || null,
    codigoStricker: null,
    nome: row.nome,
    descricao: row.descricao || null,
    categoria: 'geral',
    icone: null,
    permiteCores: row.permite_cores ?? true,
    minCores: 1,
    maxCores: parseInt(row.max_cores || '12', 10),
    precoPorCor: row.cobra_por_cor ?? false,
    precoCorExtra: 0,
    precoPorArea: row.cobra_por_area ?? false,
    precoPorPontos: row.cobra_por_pontos ?? false,
    areaMinimaCm2: null,
    areaMaximaCm2: null,
    pontosMaximos: null,
    custoSetup: 0, // Vem das variantes
    custoManuseio: 0,
    multiplicadorCusto: 1,
    quantidadeMinima: null,
    prazoEstimado: row.tempo_producao_dias || null,
    aplicaSuperficieCurva: false,
    promptSuffix: null,
    ativo: row.ativo ?? true,
    ordemExibicao: row.ordem_exibicao || 0,
    fonte: 'externo',
    criadoEm: row.created_at || '',
    atualizadoEm: row.updated_at || '',
  };
}

/**
 * Busca técnicas do BD EXTERNO via edge function
 */
async function fetchTecnicasExterno(): Promise<TecnicaGravacaoExterno[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      orderBy: { column: 'ordem_exibicao', ascending: true },
      limit: 100,
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
 * Lista completa de técnicas com filtros
 */
/**
 * Lista completa de técnicas do BD EXTERNO com filtros
 */
export function useTecnicasList(filtros?: TecnicaFiltros) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.lista(), filtros],
    queryFn: async (): Promise<TecnicaUnificada[]> => {
      const rawData = await fetchTecnicasExterno();
      let tecnicas = rawData.map(externalToTecnicaUnificada);

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

      return tecnicas.map(t => ({
        id: t.id,
        codigo: t.codigo || '',
        nome: t.nome,
        categoria: 'geral',
        permiteCores: t.permite_cores ?? true,
        maxCores: parseInt(t.max_cores || '12', 10),
        precoPorCor: t.cobra_por_cor ?? false,
        precoPorArea: t.cobra_por_area ?? false,
        ativo: t.ativo ?? true,
      }));
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por ID
 */
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
          id,
          limit: 1,
        },
      });

      if (error) {
        console.error('Erro ao buscar técnica por ID:', error);
        throw error;
      }

      const records = data?.data?.records || [];
      return records.length > 0 ? externalToTecnicaUnificada(records[0]) : null;
    },
    enabled: !!id,
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por código
 */
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

      if (error) {
        console.error('Erro ao buscar técnica por código:', error);
        throw error;
      }

      const records = data?.data?.records || [];
      return records.length > 0 ? externalToTecnicaUnificada(records[0]) : null;
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
