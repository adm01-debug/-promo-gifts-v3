/**
 * Hook Unificado para Técnicas de Gravação/Personalização
 * 
 * SSOT: BD Externo (Promobrind) é o master
 * Este hook centraliza o acesso a técnicas para toda a aplicação
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeExternalDb, invokeExternalDbSingle, invokeExternalDbDelete } from '@/lib/external-db';
import type { 
  TecnicaGravacao, 
  TecnicaGravacaoVariante,
  TecnicaFaixaArea,
  TecnicaFaixaPontos,
} from '@/types/gravacao-database';
import type { 
  TecnicaUnificada, 
  TecnicaVarianteUnificada,
  TecnicaFaixaAreaUnificada,
  TecnicaFaixaPontosUnificada,
  TecnicaResumo,
  TecnicaFiltros,
} from '@/types/tecnica-unificada';
import { toast } from 'sonner';

// Query keys centralizadas
export const TECNICAS_QUERY_KEYS = {
  all: ['tecnicas-unificadas'] as const,
  lista: () => [...TECNICAS_QUERY_KEYS.all, 'lista'] as const,
  resumo: () => [...TECNICAS_QUERY_KEYS.all, 'resumo'] as const,
  detalhe: (id: string) => [...TECNICAS_QUERY_KEYS.all, 'detalhe', id] as const,
  porCodigo: (codigo: string) => [...TECNICAS_QUERY_KEYS.all, 'codigo', codigo] as const,
  faixasArea: (tecnicaId: string) => [...TECNICAS_QUERY_KEYS.all, 'faixas-area', tecnicaId] as const,
  faixasPontos: (tecnicaId: string) => [...TECNICAS_QUERY_KEYS.all, 'faixas-pontos', tecnicaId] as const,
};

// === Transformadores ===

function transformToUnificada(
  tecnica: TecnicaGravacao, 
  variantes: TecnicaGravacaoVariante[] = []
): TecnicaUnificada {
  return {
    id: tecnica.id,
    codigo: tecnica.codigo,
    codigoInterno: tecnica.codigo_interno,
    nome: tecnica.nome,
    slug: tecnica.slug,
    descricao: tecnica.descricao,
    permiteCores: tecnica.permite_cores,
    maxCores: tecnica.max_cores,
    cobraPorCor: tecnica.cobra_por_cor,
    cobraPorArea: tecnica.cobra_por_area,
    cobraPorPontos: tecnica.cobra_por_pontos,
    requerSetup: tecnica.requer_setup,
    tipoSetup: tecnica.tipo_setup,
    tempoProducaoDias: tecnica.tempo_producao_dias,
    quantidadeMinima: 1, // TODO: buscar do BD quando tabela de preços estiver pronta
    custoSetup: 0, // TODO: buscar do BD quando tabela de preços estiver pronta
    custoUnitario: 0, // TODO: buscar do BD quando tabela de preços estiver pronta
    ativo: tecnica.ativo,
    ordemExibicao: tecnica.ordem_exibicao,
    variantes: variantes.map(transformVarianteToUnificada),
    variantesCount: variantes.length,
    fonte: 'externo',
    criadoEm: tecnica.created_at,
    atualizadoEm: tecnica.updated_at,
  };
}

function transformVarianteToUnificada(variante: TecnicaGravacaoVariante): TecnicaVarianteUnificada {
  return {
    id: variante.id,
    tecnicaId: variante.tecnica_gravacao_id,
    codigo: variante.codigo,
    codigoInterno: variante.codigo_interno,
    nome: variante.nome,
    slug: variante.slug,
    descricao: variante.descricao,
    formato: variante.formato,
    permiteCores: variante.permite_cores,
    maxCores: variante.max_cores,
    cobraPorCor: variante.cobra_por_cor,
    produtosTipicos: variante.produtos_tipicos,
    ordemExibicao: variante.ordem_exibicao,
    ativo: variante.ativo,
  };
}

function transformFaixaAreaToUnificada(faixa: TecnicaFaixaArea): TecnicaFaixaAreaUnificada {
  return {
    id: faixa.id,
    tecnicaId: faixa.tecnica_gravacao_id,
    codigo: faixa.codigo,
    nome: faixa.nome,
    descricao: faixa.descricao,
    areaMinimaCm2: faixa.area_minima_cm2,
    areaMaximaCm2: faixa.area_maxima_cm2,
    multiplicadorPreco: faixa.multiplicador_preco,
    valorAdicionalPeca: faixa.valor_adicional_peca,
    ordemExibicao: faixa.ordem_exibicao,
    ativo: faixa.ativo,
  };
}

function transformFaixaPontosToUnificada(faixa: TecnicaFaixaPontos): TecnicaFaixaPontosUnificada {
  return {
    id: faixa.id,
    tecnicaId: faixa.tecnica_gravacao_id,
    codigo: faixa.codigo,
    nome: faixa.nome,
    descricao: faixa.descricao,
    pontosMinimo: faixa.pontos_minimo,
    pontosMaximo: faixa.pontos_maximo,
    areaTipicaCm2: faixa.area_tipica_cm2,
    multiplicadorPreco: faixa.multiplicador_preco,
    ordemExibicao: faixa.ordem_exibicao,
    ativo: faixa.ativo,
  };
}

// === Hook Principal ===

export function useTecnicasUnificadas(filtros?: TecnicaFiltros) {
  const queryClient = useQueryClient();

  // Query principal - lista todas as técnicas
  const tecnicasQuery = useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.lista(), filtros],
    queryFn: async (): Promise<TecnicaUnificada[]> => {
      // Buscar técnicas e variantes em paralelo
      const [tecnicasResult, variantesResult] = await Promise.all([
        invokeExternalDb<TecnicaGravacao>({
          table: 'tecnica_gravacao',
          operation: 'select',
          orderBy: { column: 'ordem_exibicao', ascending: true },
        }),
        invokeExternalDb<TecnicaGravacaoVariante>({
          table: 'tecnica_gravacao_variante',
          operation: 'select',
          orderBy: { column: 'ordem_exibicao', ascending: true },
        }),
      ]);

      // Agrupar variantes por técnica
      const variantesPorTecnica: Record<string, TecnicaGravacaoVariante[]> = {};
      variantesResult.records.forEach((v) => {
        if (!variantesPorTecnica[v.tecnica_gravacao_id]) {
          variantesPorTecnica[v.tecnica_gravacao_id] = [];
        }
        variantesPorTecnica[v.tecnica_gravacao_id].push(v);
      });

      // Transformar e aplicar filtros
      let tecnicas = tecnicasResult.records.map((t) => 
        transformToUnificada(t, variantesPorTecnica[t.id] || [])
      );

      // Aplicar filtros
      if (filtros) {
        if (filtros.apenasAtivas) {
          tecnicas = tecnicas.filter(t => t.ativo);
        }
        if (filtros.permiteCores !== undefined) {
          tecnicas = tecnicas.filter(t => t.permiteCores === filtros.permiteCores);
        }
        if (filtros.cobraPorArea !== undefined) {
          tecnicas = tecnicas.filter(t => t.cobraPorArea === filtros.cobraPorArea);
        }
        if (filtros.cobraPorPontos !== undefined) {
          tecnicas = tecnicas.filter(t => t.cobraPorPontos === filtros.cobraPorPontos);
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
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para atualizar status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      await invokeExternalDbSingle({
        table: 'tecnica_gravacao',
        operation: 'update',
        id,
        data: { ativo },
      });
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success(ativo ? 'Técnica ativada!' : 'Técnica desativada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar variantes vinculadas
      const variantesResult = await invokeExternalDb<{ id: string }>({
        table: 'tecnica_gravacao_variante',
        operation: 'select',
        filters: { tecnica_gravacao_id: id },
        select: 'id',
        limit: 1,
      });

      if (variantesResult.count > 0) {
        throw new Error('Não é possível excluir: existem variantes vinculadas');
      }

      await invokeExternalDbDelete('tecnica_gravacao', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success('Técnica excluída!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // Dados
    tecnicas: tecnicasQuery.data ?? [],
    
    // Estados
    isLoading: tecnicasQuery.isLoading,
    isError: tecnicasQuery.isError,
    error: tecnicasQuery.error,
    
    // Ações
    refetch: tecnicasQuery.refetch,
    toggleStatus: toggleStatusMutation.mutate,
    deletar: deleteMutation.mutateAsync,
    
    // Estados de mutations
    isToggling: toggleStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// === Hook para Resumo (dropdowns) ===

export function useTecnicasResumo(apenasAtivas = true) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.resumo(), apenasAtivas],
    queryFn: async (): Promise<TecnicaResumo[]> => {
      const result = await invokeExternalDb<TecnicaGravacao>({
        table: 'tecnica_gravacao',
        operation: 'select',
        select: 'id,codigo,nome,permite_cores,max_cores,ativo',
        filters: apenasAtivas ? { ativo: true } : undefined,
        orderBy: { column: 'nome', ascending: true },
      });

      return result.records.map(t => ({
        id: t.id,
        codigo: t.codigo,
        nome: t.nome,
        permiteCores: t.permite_cores,
        maxCores: t.max_cores,
        ativo: t.ativo,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutos - dados mais estáveis
  });
}

// === Hook para Detalhe (single technique) ===

export function useTecnicaUnificada(id: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.detalhe(id ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!id) return null;

      const [tecnicaResult, variantesResult] = await Promise.all([
        invokeExternalDb<TecnicaGravacao>({
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { id },
          limit: 1,
        }),
        invokeExternalDb<TecnicaGravacaoVariante>({
          table: 'tecnica_gravacao_variante',
          operation: 'select',
          filters: { tecnica_gravacao_id: id },
          orderBy: { column: 'ordem_exibicao', ascending: true },
        }),
      ]);

      const tecnica = tecnicaResult.records[0];
      if (!tecnica) return null;

      return transformToUnificada(tecnica, variantesResult.records);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// === Hook para buscar por código ===

export function useTecnicaPorCodigo(codigo: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.porCodigo(codigo ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!codigo) return null;

      const result = await invokeExternalDb<TecnicaGravacao>({
        table: 'tecnica_gravacao',
        operation: 'select',
        filters: { codigo },
        limit: 1,
      });

      const tecnica = result.records[0];
      if (!tecnica) return null;

      // Buscar variantes
      const variantesResult = await invokeExternalDb<TecnicaGravacaoVariante>({
        table: 'tecnica_gravacao_variante',
        operation: 'select',
        filters: { tecnica_gravacao_id: tecnica.id },
        orderBy: { column: 'ordem_exibicao', ascending: true },
      });

      return transformToUnificada(tecnica, variantesResult.records);
    },
    enabled: !!codigo,
    staleTime: 5 * 60 * 1000,
  });
}

// === Hook para Faixas de Área ===

export function useTecnicaFaixasArea(tecnicaId: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.faixasArea(tecnicaId ?? ''),
    queryFn: async (): Promise<TecnicaFaixaAreaUnificada[]> => {
      if (!tecnicaId) return [];

      const result = await invokeExternalDb<TecnicaFaixaArea>({
        table: 'tecnica_faixa_area',
        operation: 'select',
        filters: { tecnica_gravacao_id: tecnicaId, ativo: true },
        orderBy: { column: 'ordem_exibicao', ascending: true },
      });

      return result.records.map(transformFaixaAreaToUnificada);
    },
    enabled: !!tecnicaId,
    staleTime: 5 * 60 * 1000,
  });
}

// === Hook para Faixas de Pontos ===

export function useTecnicaFaixasPontos(tecnicaId: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.faixasPontos(tecnicaId ?? ''),
    queryFn: async (): Promise<TecnicaFaixaPontosUnificada[]> => {
      if (!tecnicaId) return [];

      const result = await invokeExternalDb<TecnicaFaixaPontos>({
        table: 'tecnica_faixa_pontos',
        operation: 'select',
        filters: { tecnica_gravacao_id: tecnicaId, ativo: true },
        orderBy: { column: 'ordem_exibicao', ascending: true },
      });

      return result.records.map(transformFaixaPontosToUnificada);
    },
    enabled: !!tecnicaId,
    staleTime: 5 * 60 * 1000,
  });
}

// === Utilidades ===

/**
 * Invalida todo o cache de técnicas
 */
export function useInvalidateTecnicas() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
  };
}
