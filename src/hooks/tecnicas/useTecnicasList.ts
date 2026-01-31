/**
 * Hook: Lista de Técnicas
 * 
 * Responsável por: Busca e filtragem de técnicas
 * NOTA: Usa o Supabase LOCAL (personalization_techniques existe aqui, não no BD externo)
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
 * Transforma dados do BD local para TecnicaUnificada
 */
function localToTecnicaUnificada(row: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean | null;
  setup_cost: number | null;
  unit_cost: number | null;
  min_quantity: number | null;
  estimated_days: number | null;
  created_at: string;
  updated_at: string;
}): TecnicaUnificada {
  return {
    id: row.id,
    codigo: row.code || '',
    codigoFornecedor: null,
    codigoStricker: null,
    nome: row.name,
    descricao: row.description,
    categoria: 'geral', // BD local não tem categoria
    icone: null,
    permiteCores: true,
    minCores: 1,
    maxCores: 12,
    precoPorCor: false,
    precoCorExtra: 0,
    precoPorArea: false,
    precoPorPontos: false,
    areaMinimaCm2: null,
    areaMaximaCm2: null,
    pontosMaximos: null,
    custoSetup: row.setup_cost || 0,
    custoManuseio: 0,
    multiplicadorCusto: 1,
    quantidadeMinima: row.min_quantity,
    prazoEstimado: row.estimated_days,
    aplicaSuperficieCurva: false,
    promptSuffix: null,
    ativo: row.is_active ?? true,
    ordemExibicao: 0,
    fonte: 'externo',
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

/**
 * Lista completa de técnicas com filtros
 */
export function useTecnicasList(filtros?: TecnicaFiltros) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.lista(), filtros],
    queryFn: async (): Promise<TecnicaUnificada[]> => {
      let query = supabase
        .from('personalization_techniques')
        .select('*')
        .order('name', { ascending: true });

      // Filtro de ativo no nível do BD
      if (filtros?.apenasAtivas) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar técnicas:', error);
        throw error;
      }

      let tecnicas = (data || []).map(localToTecnicaUnificada);

      // Aplicar filtros adicionais (que o BD local não suporta diretamente)
      if (filtros) {
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
      let query = supabase
        .from('personalization_techniques')
        .select('id, code, name, is_active')
        .order('name', { ascending: true });

      if (apenasAtivas) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar resumo técnicas:', error);
        throw error;
      }

      return (data || []).map(t => ({
        id: t.id,
        codigo: t.code || '',
        nome: t.name,
        categoria: 'geral',
        permiteCores: true,
        maxCores: 12,
        precoPorCor: false,
        precoPorArea: false,
        ativo: t.is_active ?? true,
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

      const { data, error } = await supabase
        .from('personalization_techniques')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar técnica por ID:', error);
        throw error;
      }

      return data ? localToTecnicaUnificada(data) : null;
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

      const { data, error } = await supabase
        .from('personalization_techniques')
        .select('*')
        .eq('code', codigo)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar técnica por código:', error);
        throw error;
      }

      return data ? localToTecnicaUnificada(data) : null;
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
