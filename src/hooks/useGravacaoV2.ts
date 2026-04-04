/**
 * useGravacaoV2 - Hooks para Sistema de Gravação/Personalização v2
 * 
 * ARQUITETURA OFICIAL (02/02/2026):
 * - tabela_preco_gravacao_oficial: 43 técnicas com configurações
 * - tabela_preco_gravacao_oficial_faixa: 301 faixas de preço
 * - fn_get_customization_price: RPC que calcula preços com fallback automático
 * 
 * A função RPC busca:
 * 1. Por customization_price_table_id (se vinculado)
 * 2. Por technique_id (fallback automático)
 * 3. Tabela de fornecedores legacy (último fallback)
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import { invokeExternalRpc } from '@/lib/external-rpc';

// ============================================
// TIPOS - SISTEMA DE PREÇOS v2
// ============================================

/**
 * Técnica de gravação da tabela oficial
 * (tabela_preco_gravacao_oficial - 43 registros)
 * Schema atualizado conforme banco externo 03/02/2026
 */
export interface TabelaPrecoOficial {
  id: string;
  tecnica_variante_id: string | null;
  codigo: string;               // Ex: "SERITEX-01", "FIBER-PL-01"
  nome: string;
  descricao: string | null;
  
  // Cobrança por cor
  cobra_por_cor: boolean;
  max_cores: number | null;
  desconto_segunda_cor: number | null;      // Ex: 0.2 = 20%
  desconto_terceira_cor: number | null;     // Ex: 0.3 = 30%
  desconto_quarta_cor_mais: number | null;  // Ex: 0.4 = 40%
  
  // Cobrança por área
  cobra_por_area: boolean;
  area_maxima_cm2: number | null;
  area_maxima_texto: string | null;         // Ex: "30x30cm"
  
  // Cobrança por pontos (bordado)
  cobra_por_pontos: boolean;
  max_pontos: number | null;
  
  // Custos
  custo_setup: number | null;
  custo_setup_por_cor: boolean;
  tipo_setup: string | null;                // "POR_COR", "UNICO", etc.
  custo_manuseio: number | null;
  custo_manuseio_por_peca: boolean;
  custo_aplicacao: number | null;
  cobra_aplicacao: boolean;
  custo_queima_forno: number | null;
  cobra_queima_forno: boolean;
  custo_termo_transferencia: number | null;
  cobra_termo_transferencia: boolean;
  
  // Regras
  faturamento_minimo: number | null;
  quantidade_corte: number | null;
  
  // Validade
  validade_inicio: string | null;
  validade_fim: string | null;
  
  // Metadados
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Faixa de preço da tabela oficial
 * (tabela_preco_gravacao_oficial_faixa - 301 registros)
 * Schema atualizado conforme banco externo 03/02/2026
 */
export interface FaixaPrecoOficial {
  id: string;
  tabela_preco_gravacao_id: string;  // FK para tabela_preco_gravacao_oficial
  quantidade_minima: number;
  quantidade_maxima: number | null;
  preco_unitario: number;
  prazo_dias: number | null;
  ordem: number;                      // Ordem de exibição
  created_at: string;
  updated_at: string;
}

/**
 * Retorno da função fn_get_customization_price v5.1
 * 
 * IMPORTANTE: Setup é PISO MÍNIMO, não adicional!
 * - Se subtotal_pecas < faturamento_minimo_gravacao → total = faturamento_minimo
 * - Se subtotal_pecas >= faturamento_minimo_gravacao → total = subtotal_pecas
 */
export interface CustomizationPriceV2 {
  success: boolean;
  
  // Identificação da área
  area_id: string;
  area_code: string;
  area_name: string;
  area_order: number;
  
  // Identificação da tabela/técnica
  tabela_id: string;
  tabela_codigo: string;
  tabela_codigo_curto: string;
  technique: string;
  
  // Código de orçamento (formato: {TECNICA_CURTO}01-{FAIXA}-{AREA}-{CORES})
  codigo_orcamento: string;
  
  // Parâmetros da requisição
  quantity: number;
  num_cores: number;
  
  // Faixa utilizada
  tier_used: number;
  tier_min_qty: number;
  tier_max_qty: number;
  
  // CUSTOS (base, sem markup)
  cost_base_unit: number;      // Preço unitário base da faixa
  cost_unit_total: number;     // Custo unitário ajustado (com cores)
  cost_setup: number;          // Custo do setup (faturamento mínimo)
  cost_total: number;          // Custo total das peças
  
  // MARKUP
  markup_percent: number;      // % de markup aplicado (ex: 115)
  preco_minimo_unitario: number; // Preço mínimo por unidade
  
  // PREÇOS FINAIS (com markup)
  unit_price: number;          // Preço unitário final
  subtotal_pecas: number;      // Quantidade × unit_price
  faturamento_minimo_gravacao: number; // Setup × (1 + markup%)
  minimum_applied: boolean;    // Se o faturamento mínimo foi aplicado
  total_price: number;         // MAIOR entre subtotal e faturamento_minimo
  
  // MARGEM
  margin_percent: number;      // Margem de lucro em %
  
  // CONFIGURAÇÕES DA TÉCNICA
  price_by_color: boolean;
  setup_by_color: boolean;
  
  // PRAZO
  production_days: number | null;
  
  // DIMENSÕES MÁXIMAS DA TÉCNICA (enriquecido pela edge function)
  largura_max_tecnica: number | null;
  altura_max_tecnica: number | null;
}

/**
 * Área de gravação com técnicas (retorno de fn_get_product_print_areas)
 */
export interface PrintAreaWithTechniques {
  area_id: string;
  area_code: string;
  area_name: string;
  max_width: number;
  max_height: number;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  customization_price_table_id: string | null;
  technique_id: string | null;
  techniques: {
    id: string;
    nome: string;
    codigo: string;
  }[];
}

// invokeExternalRpc importado de @/lib/external-rpc

// ============================================
// HOOKS
// ============================================

/**
 * Hook: Busca áreas de gravação de um produto com técnicas
 * Usa RPC fn_get_product_print_areas
 */
export function useProductPrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['product-print-areas-v2', productId],
    queryFn: async (): Promise<PrintAreaWithTechniques[]> => {
      if (!productId) return [];

      // Buscar áreas da tabela print_area_techniques (SSOT)
      const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');
      const areas = await fetchPrintAreasFromProduct(productId);
      if (!areas.length) return [];

      const techResult = await invokeExternalDb<Record<string, unknown>>({
        table: 'tabela_preco_gravacao_oficial',
        operation: 'select',
        filters: { ativo: true },
        limit: 100,
      });

      const techById = new Map((techResult.records || []).map((t) => [t.id as string, t]));

      return areas.map((area) => {
        const techniques: { id: string; nome: string; codigo: string }[] = [];
        for (const tid of (area.allowed_technique_ids || [])) {
          const tech = techById.get(tid);
          if (tech) techniques.push({ id: tech.id, nome: tech.nome, codigo: tech.codigo_curto || tech.codigo_tabela || '' });
        }
        return {
          area_id: area.id,
          area_code: area.area_code || '',
          area_name: area.area_name || '',
          max_width: area.max_width || 0,
          max_height: area.max_height || 0,
          shape: area.shape || 'rectangle',
          is_curved: area.is_curved ?? false,
          is_primary: area.is_primary ?? false,
          display_order: area.display_order ?? 0,
          techniques,
        };
      });
    },
    enabled: !!productId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Busca todas as tabelas de preço oficiais (43 técnicas)
 */
export function useTabelasPrecoOficial() {
  return useQuery({
    queryKey: ['tabelas-preco-oficial'],
    queryFn: async (): Promise<TabelaPrecoOficial[]> => {
      const result = await invokeExternalDb<TabelaPrecoOficial>({
        table: 'tabela_preco_gravacao_oficial',
        operation: 'select',
        filters: { ativo: true },
        orderBy: { column: 'codigo', ascending: true },
      });
      
      return result.records || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Busca faixas de preço de uma tabela específica
 */
export function useFaixasPrecoOficial(tabelaPrecoId: string | null) {
  return useQuery({
    queryKey: ['faixas-preco-oficial', tabelaPrecoId],
    queryFn: async (): Promise<FaixaPrecoOficial[]> => {
      if (!tabelaPrecoId) return [];
      
      const result = await invokeExternalDb<FaixaPrecoOficial>({
        table: 'tabela_preco_gravacao_oficial_faixa',
        operation: 'select',
        filters: { tabela_preco_gravacao_id: tabelaPrecoId },
        orderBy: { column: 'ordem', ascending: true },
      });
      
      return result.records || [];
    },
    enabled: !!tabelaPrecoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Calcula preço de personalização via fn_get_customization_price (v5.9)
 * Usa p_area_id (de product_print_areas) para calcular preço completo.
 * 
 * Para o fluxo puro do simulador wizard, usar os hooks de useGravacaoPriceV2.ts
 */
export function useCustomizationPriceLegacy() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcular preço por area_id (v5.9)
   * Usa fn_get_customization_price com p_area_id
   */
  const calculatePriceByArea = useCallback(async (
    areaId: string,
    quantidade: number,
    numCores: number = 1,
    larguraCm?: number | null,
    alturaCm?: number | null
  ): Promise<CustomizationPriceV2 | null> => {
    setLoading(true);
    setError(null);

    try {
      const rawResult = await invokeExternalRpc<Record<string, unknown>>(
        'fn_get_customization_price',
        {
          p_area_id: areaId,
          p_quantidade: quantidade,
          p_num_cores: numCores,
          p_largura_cm: larguraCm ?? null,
          p_altura_cm: alturaCm ?? null,
        }
      );
      
      if (!rawResult?.success) {
        setLoading(false);
        return null;
      }

      // Map nested response to flat CustomizationPriceV2
      const result: CustomizationPriceV2 = {
        success: true,
        area_id: rawResult.area?.id || areaId,
        area_code: rawResult.area?.code || '',
        area_name: rawResult.area?.name || '',
        area_order: rawResult.faixa?.ordem || 0,
        tabela_id: rawResult.tabela?.id || '',
        tabela_codigo: rawResult.tabela?.codigo_tabela || '',
        tabela_codigo_curto: rawResult.tabela?.codigo_tabela?.split('-')[0] || '',
        technique: rawResult.tabela?.nome || '',
        codigo_orcamento: rawResult.codigo_orcamento || '',
        quantity: rawResult.parametros?.quantidade || quantidade,
        num_cores: rawResult.parametros?.num_cores || numCores,
        tier_used: rawResult.faixa?.ordem || 0,
        tier_min_qty: rawResult.faixa?.quantidade_minima || 0,
        tier_max_qty: rawResult.faixa?.quantidade_maxima || 0,
        cost_base_unit: rawResult.custos?.custo_base_unitario || 0,
        cost_unit_total: rawResult.custos?.custo_unitario_total || 0,
        cost_setup: rawResult.custos?.custo_setup_base || 0,
        cost_total: (rawResult.custos?.custo_unitario_total || 0) * quantidade,
        markup_percent: rawResult.precos?.markup_percent || 0,
        preco_minimo_unitario: 0,
        unit_price: rawResult.precos?.preco_unitario_final || 0,
        subtotal_pecas: rawResult.precos?.subtotal_pecas || 0,
        faturamento_minimo_gravacao: rawResult.precos?.faturamento_minimo_gravacao || 0,
        minimum_applied: rawResult.precos?.aplica_minimo || false,
        total_price: rawResult.precos?.total_final || 0,
        margin_percent: rawResult.precos?.markup_percent || 0,
        price_by_color: rawResult.tabela?.cobra_por_cor || false,
        setup_by_color: false,
        production_days: rawResult.faixa?.prazo_dias ?? null,
        largura_max_tecnica: rawResult.area?.max_width ?? null,
        altura_max_tecnica: rawResult.area?.max_height ?? null,
      };
      
      setLoading(false);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular preço';
      setError(message);
      setLoading(false);
      return null;
    }
  }, []);

  /** @deprecated Use calculatePriceByArea instead */
  const calculatePrice = calculatePriceByArea;
  /** @deprecated Use calculatePriceByArea instead */
  const calculatePriceWithVariant = calculatePriceByArea;

  return { calculatePrice, calculatePriceByArea, calculatePriceWithVariant, loading, error };
}

/**
 * Hook: Busca uma tabela de preço específica por código
 */
export function useTabelaPrecoPorCodigo(codigo: string | null) {
  return useQuery({
    queryKey: ['tabela-preco-codigo', codigo],
    queryFn: async (): Promise<TabelaPrecoOficial | null> => {
      if (!codigo) return null;
      
      const result = await invokeExternalDb<TabelaPrecoOficial>({
        table: 'tabela_preco_gravacao_oficial',
        operation: 'select',
        filters: { codigo },
        limit: 1,
      });
      
      return result.records[0] || null;
    },
    enabled: !!codigo,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// CONSTANTES
// ============================================

export const TECHNIQUE_COLORS: Record<string, string> = {
  SERIGRAFIA: 'bg-blue-100 text-blue-800',
  SERITEX: 'bg-blue-100 text-blue-800',
  LASER: 'bg-red-100 text-red-800',
  FIBER: 'bg-red-100 text-red-800',
  LASER_CO2: 'bg-red-100 text-red-800',
  CO2: 'bg-red-100 text-red-800',
  LASER_UV: 'bg-red-100 text-red-800',
  UV_DIGITAL: 'bg-purple-100 text-purple-800',
  DIGITAL: 'bg-purple-100 text-purple-800',
  TAMPOGRAFIA: 'bg-green-100 text-green-800',
  TAMPO: 'bg-green-100 text-green-800',
  BORDADO: 'bg-yellow-100 text-yellow-800',
  SUBLIMACAO: 'bg-pink-100 text-pink-800',
  SUBLI: 'bg-pink-100 text-pink-800',
  HOT_STAMPING: 'bg-orange-100 text-orange-800',
  STAMP: 'bg-orange-100 text-orange-800',
  TRANSFER_DIGITAL: 'bg-cyan-100 text-cyan-800',
  DTF: 'bg-cyan-100 text-cyan-800',
  ADESIVO: 'bg-indigo-100 text-indigo-800',
  DOMING: 'bg-indigo-100 text-indigo-800',
  ETIQUETA: 'bg-gray-100 text-gray-800',
  HEAT_TRANSFER: 'bg-rose-100 text-rose-800',
  FILME_RECORTE: 'bg-teal-100 text-teal-800',
  DECALQUE: 'bg-amber-100 text-amber-800',
  EMBORRACHADO: 'bg-lime-100 text-lime-800',
};

export const TECHNIQUE_ICONS: Record<string, string> = {
  SERIGRAFIA: '🖌️',
  SERITEX: '🖌️',
  LASER: '⚡',
  FIBER: '⚡',
  LASER_CO2: '⚡',
  CO2: '⚡',
  LASER_UV: '⚡',
  UV_DIGITAL: '🎨',
  DIGITAL: '🎨',
  TAMPOGRAFIA: '📘',
  TAMPO: '📘',
  BORDADO: '🧵',
  SUBLIMACAO: '🌈',
  SUBLI: '🌈',
  HOT_STAMPING: '✨',
  STAMP: '✨',
  TRANSFER_DIGITAL: '📋',
  DTF: '📋',
  ADESIVO: '🏷️',
  DOMING: '🏷️',
  ETIQUETA: '🏷️',
  HEAT_TRANSFER: '🔥',
  FILME_RECORTE: '✂️',
  DECALQUE: '🔥',
  EMBORRACHADO: '🔲',
};

export const AREA_SHAPES = {
  rectangle: 'Retângulo',
  circle: 'Círculo',
  oval: 'Oval',
  triangle: 'Triângulo',
  custom: 'Customizado',
} as const;

/**
 * Faixas de quantidade padrão (referência)
 * As faixas reais vêm da tabela tabela_preco_gravacao_oficial_faixa
 */
export const QUANTITY_TIERS_REFERENCE = [
  { min: 1, max: 9, label: '1-9 un' },
  { min: 10, max: 24, label: '10-24 un' },
  { min: 25, max: 49, label: '25-49 un' },
  { min: 50, max: 99, label: '50-99 un' },
  { min: 100, max: 249, label: '100-249 un' },
  { min: 250, max: 499, label: '250-499 un' },
  { min: 500, max: 999, label: '500-999 un' },
  { min: 1000, max: null, label: '1000+ un' },
];

/**
 * Helper: Obter cor do badge baseado no código da técnica
 */
export function getTechniqueColor(codigo: string): string {
  // Tentar match exato primeiro
  if (TECHNIQUE_COLORS[codigo]) {
    return TECHNIQUE_COLORS[codigo];
  }
  
  // Tentar match por prefixo
  const prefix = codigo.split('-')[0]?.split('_')[0]?.toUpperCase();
  if (prefix && TECHNIQUE_COLORS[prefix]) {
    return TECHNIQUE_COLORS[prefix];
  }
  
  // Default
  return 'bg-gray-100 text-gray-800';
}

/**
 * Helper: Obter ícone baseado no código da técnica
 */
export function getTechniqueIcon(codigo: string): string {
  if (TECHNIQUE_ICONS[codigo]) {
    return TECHNIQUE_ICONS[codigo];
  }
  
  const prefix = codigo.split('-')[0]?.split('_')[0]?.toUpperCase();
  if (prefix && TECHNIQUE_ICONS[prefix]) {
    return TECHNIQUE_ICONS[prefix];
  }
  
  return '🔧';
}

/**
 * Helper: Formatar preço em BRL
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Helper: Calcular preço total com descontos de cores
 * Os descontos já vêm em decimal (0.2 = 20%)
 */
export function calculateTotalWithColorDiscount(
  basePrice: number,
  numCores: number,
  tabela: TabelaPrecoOficial
): number {
  if (!tabela.cobra_por_cor || numCores <= 1) {
    return basePrice;
  }
  
  let discount = 0;
  if (numCores === 2 && tabela.desconto_segunda_cor) {
    discount = tabela.desconto_segunda_cor;  // Já é 0.2, não precisa dividir
  } else if (numCores === 3 && tabela.desconto_terceira_cor) {
    discount = tabela.desconto_terceira_cor;
  } else if (numCores >= 4 && tabela.desconto_quarta_cor_mais) {
    discount = tabela.desconto_quarta_cor_mais;
  }
  
  const pricePerColor = basePrice * (1 - discount);
  return pricePerColor * numCores;
}

/**
 * Helper: Calcular custo de setup
 */
export function calculateSetupCost(
  numCores: number,
  tabela: TabelaPrecoOficial
): number {
  if (!tabela.custo_setup) return 0;
  
  if (tabela.custo_setup_por_cor) {
    return tabela.custo_setup * numCores;
  }
  
  return tabela.custo_setup;
}

/**
 * Helper: Encontrar faixa de preço para uma quantidade
 */
export function findPriceTier(
  quantidade: number,
  faixas: FaixaPrecoOficial[]
): FaixaPrecoOficial | null {
  for (const faixa of faixas) {
    const min = faixa.quantidade_minima;
    const max = faixa.quantidade_maxima;
    
    if (quantidade >= min && (max === null || quantidade <= max)) {
      return faixa;
    }
  }
  
  // Se não encontrou, pegar a última faixa (maior quantidade)
  if (faixas.length > 0) {
    return faixas[faixas.length - 1];
  }
  
  return null;
}

/**
 * Helper: Calcular preço total de personalização v5.1
 * 
 * LÓGICA v5.1:
 * - Setup = CUSTO do faturamento mínimo (não é somado ao total!)
 * - faturamento_minimo = custo_setup × (1 + markup%)
 * - Se subtotal_pecas < faturamento_minimo → Total = faturamento_minimo
 * - Se subtotal_pecas >= faturamento_minimo → Total = subtotal_pecas
 * 
 * @param quantidade Quantidade de peças
 * @param numCores Número de cores
 * @param tabela Tabela de preço oficial
 * @param faixas Faixas de preço
 * @param markupPercent Markup em % (padrão: 115)
 */
export function calculateCustomizationTotal(
  quantidade: number,
  numCores: number,
  tabela: TabelaPrecoOficial,
  faixas: FaixaPrecoOficial[],
  markupPercent: number = 115
): {
  faixa: FaixaPrecoOficial | null;
  // CUSTOS (base, sem markup)
  custoUnitarioBase: number;
  custoUnitarioTotal: number;
  custoSetup: number;
  custoManuseio: number;
  custoTotalPecas: number;
  // PREÇOS (com markup)
  precoUnitario: number;
  precoMinimoUnitario: number;
  subtotalPecas: number;
  faturamentoMinimoGravacao: number;
  minimumApplied: boolean;
  total: number;
  // MARGEM
  margemPercent: number;
  // PRAZO
  prazoDias: number | null;
} {
  const faixa = findPriceTier(quantidade, faixas);
  const markupMultiplier = 1 + (markupPercent / 100);
  
  if (!faixa) {
    return {
      faixa: null,
      custoUnitarioBase: 0,
      custoUnitarioTotal: 0,
      custoSetup: 0,
      custoManuseio: 0,
      custoTotalPecas: 0,
      precoUnitario: 0,
      precoMinimoUnitario: 0,
      subtotalPecas: 0,
      faturamentoMinimoGravacao: tabela.faturamento_minimo || 0,
      minimumApplied: false,
      total: 0,
      margemPercent: 0,
      prazoDias: null,
    };
  }
  
  // 1. CUSTOS BASE (sem markup)
  const custoUnitarioBase = faixa.preco_unitario;
  
  // Calcular custo unitário com desconto de cores
  const custoUnitarioTotal = calculateTotalWithColorDiscount(
    custoUnitarioBase,
    numCores,
    tabela
  );
  
  const custoSetup = calculateSetupCost(numCores, tabela);
  const custoManuseio = tabela.custo_manuseio_por_peca 
    ? (tabela.custo_manuseio || 0) * quantidade
    : (tabela.custo_manuseio || 0);
  const custoTotalPecas = custoUnitarioTotal * quantidade;
  
  // 2. APLICAR MARKUP
  let precoUnitario = custoUnitarioTotal * markupMultiplier;
  
  // 3. APLICAR PREÇO MÍNIMO UNITÁRIO (se configurado)
  // Assumindo um preço mínimo padrão de R$ 1.50 para laser, R$ 1.00 para outros
  const precoMinimoUnitario = 1.00; // Preço mínimo padrão — configurável via organization settings
  if (precoUnitario < precoMinimoUnitario) {
    precoUnitario = precoMinimoUnitario;
  }
  
  // 4. CALCULAR SUBTOTAL DAS PEÇAS (já com markup)
  const subtotalPecas = precoUnitario * quantidade;
  
  // 5. CALCULAR FATURAMENTO MÍNIMO (setup × markup) - v5.1
  // O custo_setup é o CUSTO do faturamento mínimo
  const faturamentoMinimoGravacao = custoSetup * markupMultiplier;
  
  // 6. COMPARAR E DEFINIR TOTAL - LÓGICA v5.1
  // Setup NÃO é somado! É apenas o piso mínimo!
  let total: number;
  let minimumApplied: boolean;
  
  if (subtotalPecas < faturamentoMinimoGravacao) {
    total = faturamentoMinimoGravacao;
    minimumApplied = true;
  } else {
    total = subtotalPecas;
    minimumApplied = false;
  }
  
  // 7. CALCULAR MARGEM
  const custoTotal = custoTotalPecas + custoManuseio;
  const margemPercent = custoTotal > 0 
    ? ((total - custoTotal) / custoTotal) * 100 
    : 0;
  
  return {
    faixa,
    custoUnitarioBase,
    custoUnitarioTotal,
    custoSetup,
    custoManuseio,
    custoTotalPecas,
    precoUnitario,
    precoMinimoUnitario,
    subtotalPecas,
    faturamentoMinimoGravacao,
    minimumApplied,
    total,
    margemPercent,
    prazoDias: faixa.prazo_dias,
  };
}
