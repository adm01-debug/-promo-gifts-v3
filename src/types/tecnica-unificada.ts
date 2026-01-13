// Tipo Unificado para Técnicas de Gravação/Personalização
// SSOT: BD Externo (Promobrind) é o master
// Tabelas reais: personalization_techniques + customization_price_tables

/**
 * Interface unificada para técnicas de personalização
 * Baseado em personalization_techniques do BD externo
 */
export interface TecnicaUnificada {
  // === Identificação ===
  id: string;
  codigo: string;
  codigoFornecedor: string | null; // supplier_code
  codigoStricker: string | null;   // stricker_code
  nome: string;
  descricao: string | null;
  categoria: string; // 'impression' | 'engraving' | 'textile' | etc
  icone: string | null;
  
  // === Configuração de Cores ===
  permiteCores: boolean;   // requires_color_count
  minCores: number;
  maxCores: number;
  precoPorCor: boolean;    // price_by_color
  precoCorExtra: number;   // extra_color_price
  
  // === Configuração de Cobrança ===
  precoPorArea: boolean;   // price_by_area
  precoPorPontos: boolean; // price_by_stitches
  areaMinimaCm2: number | null;
  areaMaximaCm2: number | null;
  pontosMaximos: number | null; // max_stitches
  
  // === Custos Base ===
  custoSetup: number;      // setup_price
  custoManuseio: number;   // handling_price
  multiplicadorCusto: number; // base_cost_multiplier
  
  // === Características ===
  aplicaSuperficieCurva: boolean; // applies_to_curved
  promptSuffix: string | null;    // Para geração de mockups
  
  // === Status ===
  ativo: boolean;
  ordemExibicao: number;  // display_order
  
  // === Metadados ===
  fonte: 'externo';
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Tabela de preços por técnica
 * Baseado em customization_price_tables do BD externo
 * Cada registro representa uma combinação de técnica + cores + área + faixas de quantidade
 */
export interface TabelaPrecoTecnica {
  id: string;
  
  // === Identificação ===
  codigoTabela: string;        // table_code (ex: "TRS2-05")
  codigoTabelaOpcao: string;   // table_code_option (ex: "TRS2-05-03" = 3 cores)
  codigoServico: string | null; // serv_code
  nomeTecnica: string;         // customization_type_name
  tecnicaId: string | null;    // technique_id (link para personalization_techniques)
  
  // === Dimensões ===
  maxCores: number | null;
  larguraMaxCm: number | null; // max_area_width_cm
  alturaMaxCm: number | null;  // max_area_height_cm
  areaMinCm2: number | null;
  areaMaxCm2: number | null;
  
  // === Tipo de Cobrança ===
  precoPorCor: boolean;
  precoPorArea: boolean;
  precoPorPontos: boolean;
  
  // === Custos Base ===
  precoSetup: number;
  precoManuseio: number;
  
  // === Faixas de Quantidade (15 faixas) ===
  faixas: FaixaQuantidade[];
  
  // === Metadados ===
  fornecedorId: string | null;
  organizacaoId: string | null;
  fonte: string | null;        // source (api_spot_import, manual, etc)
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Faixa de quantidade com preço e SLA
 */
export interface FaixaQuantidade {
  faixa: number;           // 1-15
  quantidadeMinima: number;
  precoUnitario: number;
  slaDias: number | null;
}

/**
 * Dados brutos da tabela customization_price_tables
 */
export interface CustomizationPriceTableRaw {
  id: string;
  table_code: string;
  table_code_option: string;
  table_fullcode: string | null;
  serv_code: string | null;
  customization_type_name: string;
  technique_id: string | null;
  
  // Dimensões
  max_colors: number | null;
  max_area_width_cm: number | null;
  max_area_height_cm: number | null;
  area_min_cm2: number | null;
  area_max_cm2: number | null;
  colors: number | null;
  
  // Tipo cobrança
  price_by_color: boolean;
  price_by_area: boolean;
  price_by_stitches: boolean;
  
  // Custos
  setup_price: number;
  handling_price: number;
  
  // 15 faixas de quantidade
  min_qty_1: number; min_qty_2: number; min_qty_3: number; min_qty_4: number; min_qty_5: number;
  min_qty_6: number; min_qty_7: number; min_qty_8: number; min_qty_9: number; min_qty_10: number;
  min_qty_11: number; min_qty_12: number; min_qty_13: number; min_qty_14: number; min_qty_15: number;
  
  // 15 faixas de preço
  price_1: number; price_2: number; price_3: number; price_4: number; price_5: number;
  price_6: number; price_7: number; price_8: number; price_9: number; price_10: number;
  price_11: number; price_12: number; price_13: number; price_14: number; price_15: number;
  
  // 15 faixas de SLA
  sla_1: number | null; sla_2: number | null; sla_3: number | null; sla_4: number | null; sla_5: number | null;
  sla_6: number | null; sla_7: number | null; sla_8: number | null; sla_9: number | null; sla_10: number | null;
  sla_11: number | null; sla_12: number | null; sla_13: number | null; sla_14: number | null; sla_15: number | null;
  
  // Metadados
  supplier_id: string | null;
  supplier_technique_code: string | null;
  stricker_table_code: string | null;
  organization_id: string | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Dados brutos da tabela personalization_techniques
 */
export interface PersonalizationTechniqueRaw {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  
  // Cores
  requires_color_count: boolean;
  min_colors: number;
  max_colors: number;
  price_by_color: boolean;
  extra_color_price: number;
  
  // Área/Pontos
  price_by_area: boolean;
  price_by_stitches: boolean;
  min_area_cm2: number | null;
  max_area_cm2: number | null;
  max_stitches: number | null;
  
  // Custos
  setup_price: number;
  handling_price: number;
  base_cost_multiplier: number;
  
  // Características
  applies_to_curved: boolean;
  prompt_suffix: string | null;
  
  // Códigos externos
  supplier_code: string | null;
  stricker_code: string | null;
  
  // Status
  is_active: boolean;
  display_order: number;
  
  created_at: string;
  updated_at: string;
}

/**
 * Resumo simplificado para dropdowns e seletores
 */
export interface TecnicaResumo {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  permiteCores: boolean;
  maxCores: number;
  precoPorCor: boolean;
  precoPorArea: boolean;
  ativo: boolean;
}

/**
 * Filtros para busca de técnicas
 */
export interface TecnicaFiltros {
  apenasAtivas?: boolean;
  categoria?: string;
  permiteCores?: boolean;
  precoPorArea?: boolean;
  precoPorPontos?: boolean;
  aplicaCurva?: boolean;
  busca?: string;
}

/**
 * Filtros para busca de tabelas de preço
 */
export interface TabelaPrecoFiltros {
  apenasAtivas?: boolean;
  tecnicaId?: string;
  codigoTabela?: string;
  nomeTecnica?: string;
  maxCores?: number;
}

/**
 * Resultado de cálculo de preço
 */
export interface ResultadoCalculoPreco {
  tabelaId: string;
  codigoTabela: string;
  quantidade: number;
  faixaUtilizada: number;
  precoUnitario: number;
  precoTotal: number;
  precoSetup: number;
  precoManuseio: number;
  slaDias: number | null;
}
