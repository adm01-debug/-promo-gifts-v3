/**
 * Hook Unificado para Técnicas de Gravação/Personalização
 * 
 * SSOT: BD Externo (Promobrind) é o master
 * Tabelas reais: personalization_techniques + customization_price_tables
 * 
 * CONSOLIDADO: Inclui funcionalidades de useCustomizationPricing (deprecado)
 */
import { useState, useCallback, useMemo } from 'react';
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

  // Toggle status mutation
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<PersonalizationTechniqueRaw>) => {
      await invokeExternalDbSingle({
        table: 'personalization_techniques',
        operation: 'insert',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success('Técnica criada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PersonalizationTechniqueRaw>) => {
      await invokeExternalDbSingle({
        table: 'personalization_techniques',
        operation: 'update',
        id,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success('Técnica atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await invokeExternalDbSingle({
        table: 'personalization_techniques',
        operation: 'delete',
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success('Técnica removida!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    tecnicas: tecnicasQuery.data ?? [],
    isLoading: tecnicasQuery.isLoading,
    isError: tecnicasQuery.isError,
    error: tecnicasQuery.error,
    refetch: tecnicasQuery.refetch,
    // Mutations
    toggleStatus: toggleStatusMutation.mutate,
    isToggling: toggleStatusMutation.isPending,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    remove: deleteMutation.mutate,
    isRemoving: deleteMutation.isPending,
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

// ============================================
// COMPATIBILIDADE: Tipos e funções de useCustomizationPricing
// Consolidado aqui como SSOT
// ============================================

/**
 * Interface legada para tabelas de preço (compatibilidade)
 * @deprecated Use TabelaPrecoTecnica
 */
export interface CustomizationPriceTable {
  id: string;
  organization_id?: string;
  table_code: string;
  table_code_option?: string;
  table_fullcode?: string;
  technique_id?: string;
  customization_type_name: string;
  max_area_width_cm?: number;
  max_area_height_cm?: number;
  max_colors?: number;
  price_by_color?: boolean;
  price_by_area?: boolean;
  price_by_stitches?: boolean;
  min_qty_1?: number; min_qty_2?: number; min_qty_3?: number; min_qty_4?: number; min_qty_5?: number;
  min_qty_6?: number; min_qty_7?: number; min_qty_8?: number; min_qty_9?: number; min_qty_10?: number;
  min_qty_11?: number; min_qty_12?: number; min_qty_13?: number; min_qty_14?: number; min_qty_15?: number;
  price_1?: number; price_2?: number; price_3?: number; price_4?: number; price_5?: number;
  price_6?: number; price_7?: number; price_8?: number; price_9?: number; price_10?: number;
  price_11?: number; price_12?: number; price_13?: number; price_14?: number; price_15?: number;
  sla_1?: number; sla_2?: number; sla_3?: number; sla_4?: number; sla_5?: number;
  sla_6?: number; sla_7?: number; sla_8?: number; sla_9?: number; sla_10?: number;
  sla_11?: number; sla_12?: number; sla_13?: number; sla_14?: number; sla_15?: number;
  setup_price?: number;
  handling_price?: number;
  supplier_id?: string;
  source?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Faixa de preço simplificada (compatibilidade)
 */
export interface PriceTier {
  tierIndex: number;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
  slaDays: number | null;
}

/**
 * Resultado do cálculo de preço (compatibilidade)
 */
export interface PriceCalculation {
  technique: string;
  techniqueCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  setupPrice: number;
  handlingPrice: number;
  grandTotal: number;
  slaDays: number | null;
  maxColors: number;
  maxArea: { width: number; height: number };
  savings?: {
    comparedToMin: number;
    percentageOff: number;
  };
}

/**
 * Extrai faixas de preço de uma tabela legada
 */
export function extractPriceTiers(table: CustomizationPriceTable): PriceTier[] {
  const tiers: PriceTier[] = [];
  
  for (let i = 1; i <= 15; i++) {
    const minQty = table[`min_qty_${i}` as keyof CustomizationPriceTable] as number | undefined;
    const price = table[`price_${i}` as keyof CustomizationPriceTable] as number | undefined;
    const sla = table[`sla_${i}` as keyof CustomizationPriceTable] as number | undefined;
    
    if (minQty !== undefined && minQty !== null && price !== undefined && price !== null) {
      const nextMinQty = table[`min_qty_${i + 1}` as keyof CustomizationPriceTable] as number | undefined;
      const maxQty = nextMinQty ? nextMinQty - 1 : null;
      
      tiers.push({
        tierIndex: i,
        minQuantity: minQty,
        maxQuantity: maxQty,
        unitPrice: price,
        slaDays: sla ?? null,
      });
    }
  }
  
  return tiers;
}

/**
 * Extrai faixas de preço de TabelaPrecoTecnica (método novo)
 */
export function extractPriceTiersFromTabela(tabela: TabelaPrecoTecnica): PriceTier[] {
  return tabela.faixas.map((f, idx, arr) => ({
    tierIndex: f.faixa,
    minQuantity: f.quantidadeMinima,
    maxQuantity: arr[idx + 1] ? arr[idx + 1].quantidadeMinima - 1 : null,
    unitPrice: f.precoUnitario,
    slaDays: f.slaDias,
  }));
}

/**
 * Calcula preço para quantidade (legado)
 */
export function calculatePriceForQuantity(
  table: CustomizationPriceTable,
  quantity: number
): PriceCalculation | null {
  const tiers = extractPriceTiers(table);
  
  if (tiers.length === 0) return null;
  
  let selectedTier = tiers[0];
  for (const tier of tiers) {
    if (quantity >= tier.minQuantity) {
      selectedTier = tier;
    }
  }
  
  const unitPrice = selectedTier.unitPrice;
  const totalPrice = unitPrice * quantity;
  const setupPrice = table.setup_price || 0;
  const handlingPrice = table.handling_price || 0;
  const grandTotal = totalPrice + setupPrice + handlingPrice;
  
  const minTierPrice = tiers[0].unitPrice;
  const savingsPerUnit = minTierPrice - unitPrice;
  const percentageOff = minTierPrice > 0 ? ((minTierPrice - unitPrice) / minTierPrice) * 100 : 0;
  
  return {
    technique: table.customization_type_name,
    techniqueCode: table.table_code,
    quantity,
    unitPrice,
    totalPrice,
    setupPrice,
    handlingPrice,
    grandTotal,
    slaDays: selectedTier.slaDays,
    maxColors: table.max_colors || 1,
    maxArea: {
      width: table.max_area_width_cm || 0,
      height: table.max_area_height_cm || 0,
    },
    savings: savingsPerUnit > 0 ? {
      comparedToMin: savingsPerUnit * quantity,
      percentageOff: Math.round(percentageOff),
    } : undefined,
  };
}

/**
 * Calcula preço para quantidade usando TabelaPrecoTecnica (método novo)
 */
export function calculatePriceForQuantityNew(
  tabela: TabelaPrecoTecnica,
  quantity: number
): PriceCalculation | null {
  if (tabela.faixas.length === 0) return null;
  
  let selectedFaixa = tabela.faixas[0];
  for (const faixa of tabela.faixas) {
    if (quantity >= faixa.quantidadeMinima) {
      selectedFaixa = faixa;
    }
  }
  
  const unitPrice = selectedFaixa.precoUnitario;
  const totalPrice = unitPrice * quantity;
  const grandTotal = totalPrice + tabela.precoSetup + tabela.precoManuseio;
  
  const minPrice = tabela.faixas[0].precoUnitario;
  const savingsPerUnit = minPrice - unitPrice;
  const percentageOff = minPrice > 0 ? ((minPrice - unitPrice) / minPrice) * 100 : 0;
  
  return {
    technique: tabela.nomeTecnica,
    techniqueCode: tabela.codigoTabela,
    quantity,
    unitPrice,
    totalPrice,
    setupPrice: tabela.precoSetup,
    handlingPrice: tabela.precoManuseio,
    grandTotal,
    slaDays: selectedFaixa.slaDias,
    maxColors: tabela.maxCores || 1,
    maxArea: {
      width: tabela.larguraMaxCm || 0,
      height: tabela.alturaMaxCm || 0,
    },
    savings: savingsPerUnit > 0 ? {
      comparedToMin: savingsPerUnit * quantity,
      percentageOff: Math.round(percentageOff),
    } : undefined,
  };
}

/**
 * Hook unificado para preços de personalização
 * Substitui useCustomizationPricing usando BD externo
 */
export function useCustomizationPricing() {
  const tabelasQuery = useTabelasPreco({ apenasAtivas: true });
  
  // Converter TabelaPrecoTecnica para CustomizationPriceTable (compatibilidade)
  const priceTables: CustomizationPriceTable[] = useMemo(() => {
    return (tabelasQuery.data ?? []).map(tabela => {
      const table: CustomizationPriceTable = {
        id: tabela.id,
        table_code: tabela.codigoTabela,
        table_code_option: tabela.codigoTabelaOpcao,
        technique_id: tabela.tecnicaId ?? undefined,
        customization_type_name: tabela.nomeTecnica,
        max_area_width_cm: tabela.larguraMaxCm ?? undefined,
        max_area_height_cm: tabela.alturaMaxCm ?? undefined,
        max_colors: tabela.maxCores ?? undefined,
        price_by_color: tabela.precoPorCor,
        price_by_area: tabela.precoPorArea,
        price_by_stitches: tabela.precoPorPontos,
        setup_price: tabela.precoSetup,
        handling_price: tabela.precoManuseio,
        is_active: tabela.ativo,
        created_at: tabela.criadoEm,
        updated_at: tabela.atualizadoEm,
      };
      
      // Preencher faixas
      tabela.faixas.forEach(f => {
        (table as any)[`min_qty_${f.faixa}`] = f.quantidadeMinima;
        (table as any)[`price_${f.faixa}`] = f.precoUnitario;
        (table as any)[`sla_${f.faixa}`] = f.slaDias;
      });
      
      return table;
    });
  }, [tabelasQuery.data]);

  const calculateAllPrices = useCallback((quantity: number): PriceCalculation[] => {
    return priceTables
      .map(table => calculatePriceForQuantity(table, quantity))
      .filter((calc): calc is PriceCalculation => calc !== null)
      .sort((a, b) => a.unitPrice - b.unitPrice);
  }, [priceTables]);

  const calculatePrice = useCallback((techniqueCode: string, quantity: number): PriceCalculation | null => {
    const table = priceTables.find(t => t.table_code === techniqueCode);
    if (!table) return null;
    return calculatePriceForQuantity(table, quantity);
  }, [priceTables]);

  const getTiers = useCallback((techniqueCode: string): PriceTier[] => {
    const table = priceTables.find(t => t.table_code === techniqueCode);
    if (!table) return [];
    return extractPriceTiers(table);
  }, [priceTables]);

  const techniques = useMemo(() => {
    return priceTables.map(table => ({
      code: table.table_code,
      name: table.customization_type_name,
      maxColors: table.max_colors || 1,
      maxArea: {
        width: table.max_area_width_cm || 0,
        height: table.max_area_height_cm || 0,
      },
      priceByColor: table.price_by_color || false,
      priceByArea: table.price_by_area || false,
    }));
  }, [priceTables]);

  const standardQuantities = useMemo(() => [
    50, 100, 250, 500, 1000, 2500, 5000, 10000
  ], []);

  return {
    priceTables,
    techniques,
    standardQuantities,
    isLoading: tabelasQuery.isLoading,
    error: tabelasQuery.error?.message ?? null,
    fetchPriceTables: tabelasQuery.refetch,
    calculateAllPrices,
    calculatePrice,
    getTiers,
  };
}

/**
 * Hook para simulador de preços
 */
export function usePriceSimulator(productBasePrice: number = 0) {
  const { priceTables, isLoading, error, calculateAllPrices } = useCustomizationPricing();
  const [quantity, setQuantity] = useState(100);
  const [selectedTechniqueCode, setSelectedTechniqueCode] = useState<string | null>(null);

  const calculations = useMemo(() => {
    return calculateAllPrices(quantity);
  }, [calculateAllPrices, quantity]);

  const selectedCalculation = useMemo(() => {
    if (!selectedTechniqueCode) return calculations[0] || null;
    return calculations.find(c => c.techniqueCode === selectedTechniqueCode) || null;
  }, [calculations, selectedTechniqueCode]);

  const totalWithProduct = useMemo(() => {
    if (!selectedCalculation) return null;
    const productTotal = productBasePrice * quantity;
    return {
      productTotal,
      customizationTotal: selectedCalculation.grandTotal,
      grandTotal: productTotal + selectedCalculation.grandTotal,
      unitTotal: (productTotal + selectedCalculation.grandTotal) / quantity,
    };
  }, [selectedCalculation, productBasePrice, quantity]);

  return {
    quantity,
    setQuantity,
    selectedTechniqueCode,
    setSelectedTechniqueCode,
    calculations,
    selectedCalculation,
    totalWithProduct,
    isLoading,
    error,
  };
}
