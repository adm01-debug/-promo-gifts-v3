/**
 * Hook Unificado para Técnicas de Gravação/Personalização
 * 
 * SSOT: BD Externo (Promobrind) é o master
 * Tabelas reais: personalization_techniques + customization_price_tables
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeExternalDb, invokeExternalDbSingle } from '@/lib/external-db';
import type { 
  TecnicaUnificada, 
  TabelaPrecoTecnica,
  TecnicaResumo,
  TecnicaFiltros,
  TabelaPrecoFiltros,
  FaixaQuantidade,
  PersonalizationTechniqueRaw,
  CustomizationPriceTableRaw,
  ResultadoCalculoPreco,
} from '@/types/tecnica-unificada';
import { toast } from 'sonner';

// Query keys centralizadas
export const TECNICAS_QUERY_KEYS = {
  all: ['tecnicas-unificadas'] as const,
  lista: () => [...TECNICAS_QUERY_KEYS.all, 'lista'] as const,
  resumo: () => [...TECNICAS_QUERY_KEYS.all, 'resumo'] as const,
  detalhe: (id: string) => [...TECNICAS_QUERY_KEYS.all, 'detalhe', id] as const,
  porCodigo: (codigo: string) => [...TECNICAS_QUERY_KEYS.all, 'codigo', codigo] as const,
  tabelasPreco: () => [...TECNICAS_QUERY_KEYS.all, 'tabelas-preco'] as const,
  tabelaPorCodigo: (codigo: string) => [...TECNICAS_QUERY_KEYS.all, 'tabela', codigo] as const,
  tabelasPorTecnica: (nomeTecnica: string) => [...TECNICAS_QUERY_KEYS.all, 'tabelas-tecnica', nomeTecnica] as const,
};

// === Transformadores ===

function transformToUnificada(raw: PersonalizationTechniqueRaw): TecnicaUnificada {
  return {
    id: raw.id,
    codigo: raw.code,
    codigoFornecedor: raw.supplier_code,
    codigoStricker: raw.stricker_code,
    nome: raw.name,
    descricao: raw.description,
    categoria: raw.category,
    icone: raw.icon,
    permiteCores: raw.requires_color_count,
    minCores: raw.min_colors,
    maxCores: raw.max_colors,
    precoPorCor: raw.price_by_color,
    precoCorExtra: raw.extra_color_price,
    precoPorArea: raw.price_by_area,
    precoPorPontos: raw.price_by_stitches,
    areaMinimaCm2: raw.min_area_cm2,
    areaMaximaCm2: raw.max_area_cm2,
    pontosMaximos: raw.max_stitches,
    custoSetup: raw.setup_price,
    custoManuseio: raw.handling_price,
    multiplicadorCusto: raw.base_cost_multiplier,
    aplicaSuperficieCurva: raw.applies_to_curved,
    promptSuffix: raw.prompt_suffix,
    ativo: raw.is_active,
    ordemExibicao: raw.display_order,
    fonte: 'externo',
    criadoEm: raw.created_at,
    atualizadoEm: raw.updated_at,
  };
}

function transformToTabelaPreco(raw: CustomizationPriceTableRaw): TabelaPrecoTecnica {
  // Extrair as 15 faixas
  const faixas: FaixaQuantidade[] = [];
  for (let i = 1; i <= 15; i++) {
    const minQty = raw[`min_qty_${i}` as keyof CustomizationPriceTableRaw] as number;
    const price = raw[`price_${i}` as keyof CustomizationPriceTableRaw] as number;
    const sla = raw[`sla_${i}` as keyof CustomizationPriceTableRaw] as number | null;
    
    if (minQty != null && price != null) {
      faixas.push({
        faixa: i,
        quantidadeMinima: minQty,
        precoUnitario: price,
        slaDias: sla,
      });
    }
  }

  return {
    id: raw.id,
    codigoTabela: raw.table_code,
    codigoTabelaOpcao: raw.table_code_option,
    codigoServico: raw.serv_code,
    nomeTecnica: raw.customization_type_name,
    tecnicaId: raw.technique_id,
    maxCores: raw.max_colors,
    larguraMaxCm: raw.max_area_width_cm,
    alturaMaxCm: raw.max_area_height_cm,
    areaMinCm2: raw.area_min_cm2,
    areaMaxCm2: raw.area_max_cm2,
    precoPorCor: raw.price_by_color,
    precoPorArea: raw.price_by_area,
    precoPorPontos: raw.price_by_stitches,
    precoSetup: raw.setup_price,
    precoManuseio: raw.handling_price,
    faixas,
    fornecedorId: raw.supplier_id,
    organizacaoId: raw.organization_id,
    fonte: raw.source,
    ativo: raw.is_active,
    criadoEm: raw.created_at,
    atualizadoEm: raw.updated_at,
  };
}

// === Hook Principal: Técnicas ===

export function useTecnicasUnificadas(filtros?: TecnicaFiltros) {
  const queryClient = useQueryClient();

  const tecnicasQuery = useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.lista(), filtros],
    queryFn: async (): Promise<TecnicaUnificada[]> => {
      const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
        table: 'personalization_techniques',
        operation: 'select',
        orderBy: { column: 'display_order', ascending: true },
      });

      let tecnicas = result.records.map(transformToUnificada);

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
    staleTime: 5 * 60 * 1000,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      await invokeExternalDbSingle({
        table: 'personalization_techniques',
        operation: 'update',
        id,
        data: { is_active: ativo },
      });
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success(ativo ? 'Técnica ativada!' : 'Técnica desativada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    tecnicas: tecnicasQuery.data ?? [],
    isLoading: tecnicasQuery.isLoading,
    isError: tecnicasQuery.isError,
    error: tecnicasQuery.error,
    refetch: tecnicasQuery.refetch,
    toggleStatus: toggleStatusMutation.mutate,
    isToggling: toggleStatusMutation.isPending,
  };
}

// === Hook para Resumo (dropdowns) ===

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
    staleTime: 10 * 60 * 1000,
  });
}

// === Hook para Detalhe (single technique) ===

export function useTecnicaUnificada(id: string | undefined) {
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
      return tecnica ? transformToUnificada(tecnica) : null;
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

      const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
        table: 'personalization_techniques',
        operation: 'select',
        filters: { code: codigo },
        limit: 1,
      });

      const tecnica = result.records[0];
      return tecnica ? transformToUnificada(tecnica) : null;
    },
    enabled: !!codigo,
    staleTime: 5 * 60 * 1000,
  });
}

// === Hook para Tabelas de Preço ===

export function useTabelasPreco(filtros?: TabelaPrecoFiltros) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.tabelasPreco(), filtros],
    queryFn: async (): Promise<TabelaPrecoTecnica[]> => {
      const filters: Record<string, unknown> = {};
      
      if (filtros?.apenasAtivas) {
        filters.is_active = true;
      }
      if (filtros?.tecnicaId) {
        filters.technique_id = filtros.tecnicaId;
      }
      if (filtros?.codigoTabela) {
        filters.table_code = filtros.codigoTabela;
      }
      if (filtros?.nomeTecnica) {
        filters.customization_type_name = filtros.nomeTecnica;
      }

      const result = await invokeExternalDb<CustomizationPriceTableRaw>({
        table: 'customization_price_tables',
        operation: 'select',
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        orderBy: { column: 'table_code_option', ascending: true },
        limit: 500,
      });

      let tabelas = result.records.map(transformToTabelaPreco);

      // Filtro de max_colors pós-query (não suportado diretamente)
      if (filtros?.maxCores !== undefined) {
        tabelas = tabelas.filter(t => t.maxCores === filtros.maxCores);
      }

      return tabelas;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// === Hook para Tabelas por Nome da Técnica ===

export function useTabelasPorTecnica(nomeTecnica: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.tabelasPorTecnica(nomeTecnica ?? ''),
    queryFn: async (): Promise<TabelaPrecoTecnica[]> => {
      if (!nomeTecnica) return [];

      const result = await invokeExternalDb<CustomizationPriceTableRaw>({
        table: 'customization_price_tables',
        operation: 'select',
        filters: { customization_type_name: nomeTecnica, is_active: true },
        orderBy: { column: 'max_colors', ascending: true },
      });

      return result.records.map(transformToTabelaPreco);
    },
    enabled: !!nomeTecnica,
    staleTime: 5 * 60 * 1000,
  });
}

// === Hook para Tabela Específica por Código ===

export function useTabelaPorCodigo(codigoOpcao: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.tabelaPorCodigo(codigoOpcao ?? ''),
    queryFn: async (): Promise<TabelaPrecoTecnica | null> => {
      if (!codigoOpcao) return null;

      const result = await invokeExternalDb<CustomizationPriceTableRaw>({
        table: 'customization_price_tables',
        operation: 'select',
        filters: { table_code_option: codigoOpcao },
        limit: 1,
      });

      const tabela = result.records[0];
      return tabela ? transformToTabelaPreco(tabela) : null;
    },
    enabled: !!codigoOpcao,
    staleTime: 5 * 60 * 1000,
  });
}

// === Função Utilitária: Calcular Preço ===

export function calcularPreco(
  tabela: TabelaPrecoTecnica, 
  quantidade: number,
  numeroCores?: number
): ResultadoCalculoPreco {
  // Encontrar a faixa correta
  let faixaUtilizada = tabela.faixas[0];
  
  for (const faixa of tabela.faixas) {
    if (quantidade >= faixa.quantidadeMinima) {
      faixaUtilizada = faixa;
    } else {
      break;
    }
  }

  let precoUnitario = faixaUtilizada.precoUnitario;
  
  // Ajustar por número de cores se aplicável
  if (tabela.precoPorCor && numeroCores && tabela.maxCores) {
    // O preço base já inclui o número de cores da tabela
    // Ajuste se precisar de mais cores (proporcional)
    const coresBase = tabela.maxCores;
    if (numeroCores > coresBase) {
      // Preço adicional por cor extra (aproximação)
      const fatorCor = numeroCores / coresBase;
      precoUnitario = precoUnitario * fatorCor;
    }
  }

  const precoTotal = precoUnitario * quantidade;

  return {
    tabelaId: tabela.id,
    codigoTabela: tabela.codigoTabelaOpcao,
    quantidade,
    faixaUtilizada: faixaUtilizada.faixa,
    precoUnitario,
    precoTotal,
    precoSetup: tabela.precoSetup,
    precoManuseio: tabela.precoManuseio,
    slaDias: faixaUtilizada.slaDias,
  };
}

// === Função para buscar tabela adequada ===

export async function buscarTabelaAdequada(
  nomeTecnica: string,
  cores: number,
  larguraCm?: number,
  alturaCm?: number
): Promise<TabelaPrecoTecnica | null> {
  const result = await invokeExternalDb<CustomizationPriceTableRaw>({
    table: 'customization_price_tables',
    operation: 'select',
    filters: { customization_type_name: nomeTecnica, is_active: true },
    orderBy: { column: 'max_colors', ascending: true },
  });

  const tabelas = result.records.map(transformToTabelaPreco);

  // Encontrar tabela que comporta o número de cores
  let tabelaAdequada = tabelas.find(t => 
    t.maxCores !== null && t.maxCores >= cores
  );

  // Se não encontrou por cores, pegar a com mais cores disponível
  if (!tabelaAdequada && tabelas.length > 0) {
    tabelaAdequada = tabelas[tabelas.length - 1];
  }

  // Validar dimensões se fornecidas
  if (tabelaAdequada && larguraCm && alturaCm) {
    if (tabelaAdequada.larguraMaxCm && larguraCm > tabelaAdequada.larguraMaxCm) {
      console.warn(`Largura ${larguraCm}cm excede máximo ${tabelaAdequada.larguraMaxCm}cm`);
    }
    if (tabelaAdequada.alturaMaxCm && alturaCm > tabelaAdequada.alturaMaxCm) {
      console.warn(`Altura ${alturaCm}cm excede máximo ${tabelaAdequada.alturaMaxCm}cm`);
    }
  }

  return tabelaAdequada ?? null;
}

// === Utilidades ===

export function useInvalidateTecnicas() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
  };
}

/**
 * Lista de categorias disponíveis
 */
export function useCategoriasTecnicas() {
  const { tecnicas } = useTecnicasUnificadas({ apenasAtivas: true });
  
  const categorias = [...new Set(tecnicas.map(t => t.categoria))].sort();
  
  return categorias;
}

/**
 * Lista de nomes de técnicas únicos (para filtrar tabelas de preço)
 */
export function useNomesTecnicasPreco() {
  return useQuery({
    queryKey: ['nomes-tecnicas-preco'],
    queryFn: async (): Promise<string[]> => {
      const result = await invokeExternalDb<{ customization_type_name: string }>({
        table: 'customization_price_tables',
        operation: 'select',
        select: 'customization_type_name',
        filters: { is_active: true },
      });

      const nomes = [...new Set(result.records.map(r => r.customization_type_name))];
      return nomes.sort();
    },
    staleTime: 10 * 60 * 1000,
  });
}
