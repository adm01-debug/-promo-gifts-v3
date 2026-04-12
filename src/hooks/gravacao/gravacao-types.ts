/**
 * Tipos do Sistema de Gravação/Personalização v2
 * Extraído de useGravacaoV2.ts para modularidade
 */

/**
 * Técnica de gravação da tabela oficial
 * (tabela_preco_gravacao_oficial - 43 registros)
 */
export interface TabelaPrecoOficial {
  id: string;
  tecnica_variante_id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  cobra_por_cor: boolean;
  max_cores: number | null;
  desconto_segunda_cor: number | null;
  desconto_terceira_cor: number | null;
  desconto_quarta_cor_mais: number | null;
  cobra_por_area: boolean;
  area_maxima_cm2: number | null;
  area_maxima_texto: string | null;
  cobra_por_pontos: boolean;
  max_pontos: number | null;
  custo_setup: number | null;
  custo_setup_por_cor: boolean;
  tipo_setup: string | null;
  custo_manuseio: number | null;
  custo_manuseio_por_peca: boolean;
  custo_aplicacao: number | null;
  cobra_aplicacao: boolean;
  custo_queima_forno: number | null;
  cobra_queima_forno: boolean;
  custo_termo_transferencia: number | null;
  cobra_termo_transferencia: boolean;
  faturamento_minimo: number | null;
  quantidade_corte: number | null;
  validade_inicio: string | null;
  validade_fim: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Faixa de preço da tabela oficial
 * (tabela_preco_gravacao_oficial_faixa - 301 registros)
 */
export interface FaixaPrecoOficial {
  id: string;
  tabela_preco_gravacao_id: string;
  quantidade_minima: number;
  quantidade_maxima: number | null;
  preco_unitario: number;
  prazo_dias: number | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

/**
 * Retorno da função fn_get_customization_price v5.1
 */
export interface CustomizationPriceV2 {
  success: boolean;
  area_id: string;
  area_code: string;
  area_name: string;
  area_order: number;
  tabela_id: string;
  tabela_codigo: string;
  tabela_codigo_curto: string;
  technique: string;
  codigo_orcamento: string;
  quantity: number;
  num_cores: number;
  tier_used: number;
  tier_min_qty: number;
  tier_max_qty: number;
  cost_base_unit: number;
  cost_unit_total: number;
  cost_setup: number;
  cost_total: number;
  markup_percent: number;
  preco_minimo_unitario: number;
  unit_price: number;
  subtotal_pecas: number;
  faturamento_minimo_gravacao: number;
  minimum_applied: boolean;
  total_price: number;
  margin_percent: number;
  price_by_color: boolean;
  setup_by_color: boolean;
  production_days: number | null;
  largura_max_tecnica: number | null;
  altura_max_tecnica: number | null;
}

/**
 * Área de gravação com técnicas
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
  customization_price_table_id?: string | null;
  technique_id?: string | null;
  techniques: {
    id: string;
    nome: string;
    codigo: string;
  }[];
}
