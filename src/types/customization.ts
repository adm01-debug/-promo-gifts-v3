/**
 * Tipos para o fluxo de personalização v6
 * 
 * Baseado no briefing técnico de 12/02/2026.
 * Fonte de dados: RPCs fn_get_product_customization_options e fn_get_customization_price.
 */

// ============================================
// OPÇÕES DE PERSONALIZAÇÃO (fn_get_product_customization_options)
// ============================================

/** Opção de técnica retornada pela RPC */
export interface TechniqueOption {
  technique_id: string;
  codigo_tabela: string;       // "FIBER-PL-01"
  tecnica_nome: string;        // "Fiber Laser | Plana"
  grupo_tecnica: string;       // "LASER" | "SERIGRAFIA" | "UV_DIGITAL"
  variacao_label: string;

  // Dimensões
  max_width: number;           // largura da área física (cm)
  max_height: number;          // altura da área física (cm)
  gravacao_largura_max: number | null;
  gravacao_altura_max: number | null;
  efetiva_largura_max: number; // MIN(max_width, gravacao_largura_max)
  efetiva_altura_max: number;  // MIN(max_height, gravacao_altura_max)

  // Forma
  shape: 'rectangle' | 'circle';
  is_curved: boolean;

  // Cores e preço
  usa_dimensao: boolean;
  cobra_por_cor: boolean;
  max_cores: number;           // máximo de cores (1-3)
}

/** Local de gravação */
export interface GravacaoLocation {
  location_code: string;       // "LADO-A" | "LADO-B" | "CIRCULAR"
  location_name: string;       // "Lado A" | "Lado B" | "Circular"
  location_order: number;
  options: TechniqueOption[];
}

/** Resposta de fn_get_product_customization_options */
export interface CustomizationOptionsResponse {
  product_id: string;
  locations: GravacaoLocation[];
}

// ============================================
// PREÇO DE PERSONALIZAÇÃO (fn_get_customization_price)
// ============================================

/** Faixa de preço encontrada */
export interface PriceFaixa {
  faixa_id: string;
  qtd_min: number;
  qtd_max: number;
  larg_min: number;
  larg_max: number;
  alt_min: number;
  alt_max: number;
  preco: number;
}

/** Detalhes da técnica no preço */
export interface PriceDetalhes {
  cobra_por_cor: boolean;
  max_cores: number;
  is_curved: boolean;
  desconto_2cor: number;       // % desconto para 2ª cor (10)
  desconto_3cor: number;       // % desconto para 3ª cor (15)
}

/** Informações de markup (v6.3) */
export interface MarkupInfo {
  markup_pct: number;          // % markup aplicado (ex: 115)
  preco_min_unit: number;      // piso mínimo por unidade (R$)
  custo_unitario: number;      // custo ANTES do markup
  custo_setup_tabela: number;  // setup original da tabela
  setup_proprio: number | null; // setup da organização (prevalece)
}

/** Resposta de fn_get_customization_price (v6.3) */
export interface CustomizationPriceResponseV6 {
  success: boolean;
  error?: string;

  tabela: string;              // "FIBER-PL-01"
  nome_tabela: string;         // "Fiber Laser | Plana"
  grupo_tecnica: string;       // "LASER"

  quantidade: number;
  num_cores: number;

  faixa: PriceFaixa;
  detalhes: PriceDetalhes;
  markup: MarkupInfo;          // (v6.3) info de markup aplicado

  preco_unitario: number;      // preço de VENDA por peça (com markup)
  preco_por_unidade: number;   // alias
  valor_gravacao: number;      // preco_unitario × qtd
  setup_total: number;         // setup com markup aplicado
  total_cobrado: number;       // MAX(valor_gravacao, setup_total)
}

// ============================================
// ITEM DE PERSONALIZAÇÃO (estado do componente)
// ============================================

export interface PersonalizationItem {
  locationCode: string;
  locationName: string;
  techniqueId: string;
  techniqueName: string;
  codigoTabela: string;
  grupoTecnica: string;
  width?: number;
  height?: number;
  numberOfColors: number;
  usaDimensao: boolean;
  price: CustomizationPriceResponseV6 | null;
}
