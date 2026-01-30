/**
 * Hook para buscar técnicas de personalização do BD EXTERNO
 * 
 * Usa a tabela REAL do Promobrind: tecnica_gravacao (legacy)
 * Mapeia campos para o formato esperado pela aplicação.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

export interface ExternalTechnique {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  setup_cost: number | null;
  unit_cost: number | null;
  min_quantity: number | null;
  estimated_days: number | null;
  max_colors: number | null;
  requires_color_count: boolean | null;
  price_by_color: boolean | null;
  price_by_area: boolean | null;
  is_active: boolean;
}

// Interface RAW da tabela tecnica_gravacao no Promobrind
interface TecnicaGravacaoRaw {
  id: string;
  codigo: string;
  codigo_interno: string;
  nome: string;
  slug: string;
  descricao: string | null;
  permite_cores: boolean;
  max_cores: number | string;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  requer_setup: boolean;
  tipo_setup: string;
  tempo_producao_dias: number;
  ordem_exibicao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Transforma dados RAW do Promobrind para o formato da aplicação
 */
function transformTechnique(raw: TecnicaGravacaoRaw): ExternalTechnique {
  return {
    id: raw.id,
    name: raw.nome,
    code: raw.codigo,
    description: raw.descricao,
    category: raw.tipo_setup || null,
    setup_cost: null, // Vem de tabelas de preço separadas
    unit_cost: null,
    min_quantity: null,
    estimated_days: raw.tempo_producao_dias,
    max_colors: typeof raw.max_cores === 'string' ? parseInt(raw.max_cores, 10) : raw.max_cores,
    requires_color_count: raw.permite_cores,
    price_by_color: raw.cobra_por_cor,
    price_by_area: raw.cobra_por_area,
    is_active: raw.ativo,
  };
}

/**
 * Busca todas as técnicas ativas do banco externo
 */
export function useTechniquesExternal() {
  return useQuery({
    queryKey: ['techniques-external'],
    queryFn: async (): Promise<ExternalTechnique[]> => {
      const result = await invokeExternalDb<TecnicaGravacaoRaw>({
        table: 'tecnica_gravacao',
        operation: 'select',
        filters: { ativo: true },
        orderBy: { column: 'nome', ascending: true },
        limit: 100,
      });

      return result.records.map(transformTechnique);
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Busca técnicas resumidas (id, name, code) para dropdowns
 */
export function useTechniquesExternalSimple() {
  return useQuery({
    queryKey: ['techniques-external-simple'],
    queryFn: async (): Promise<Array<{ id: string; name: string; code: string | null }>> => {
      const result = await invokeExternalDb<TecnicaGravacaoRaw>({
        table: 'tecnica_gravacao',
        operation: 'select',
        select: 'id, nome, codigo',
        filters: { ativo: true },
        orderBy: { column: 'nome', ascending: true },
        limit: 100,
      });

      return result.records.map(raw => ({
        id: raw.id,
        name: raw.nome,
        code: raw.codigo,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca uma técnica por ID
 */
export function useTechniqueByIdExternal(id: string | undefined) {
  return useQuery({
    queryKey: ['technique-external', id],
    queryFn: async (): Promise<ExternalTechnique | null> => {
      if (!id) return null;
      
      const result = await invokeExternalDb<TecnicaGravacaoRaw>({
        table: 'tecnica_gravacao',
        operation: 'select',
        filters: { id },
        limit: 1,
      });

      const raw = result.records[0];
      if (!raw) return null;

      return transformTechnique(raw);
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca técnicas por código (ex: 'SERIGRAFIA', 'LASER')
 */
export function useTechniqueByCodeExternal(code: string | undefined) {
  return useQuery({
    queryKey: ['technique-external-code', code],
    queryFn: async (): Promise<ExternalTechnique | null> => {
      if (!code) return null;
      
      const result = await invokeExternalDb<TecnicaGravacaoRaw>({
        table: 'tecnica_gravacao',
        operation: 'select',
        filters: { codigo: code, ativo: true },
        limit: 1,
      });

      const raw = result.records[0];
      if (!raw) return null;

      return transformTechnique(raw);
    },
    enabled: !!code,
    staleTime: 10 * 60 * 1000,
  });
}
