/**
 * Domain Types: Personalização
 * 
 * Tipos internos do domínio, separados dos tipos de infraestrutura (API/DB)
 */

// ============================================
// CORE DOMAIN TYPES
// ============================================

/**
 * Faixa de preço por quantidade
 */
export interface PriceTier {
  tier: number;           // 1-15
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
  slaDays: number | null;
}

/**
 * Dimensões de área de gravação
 */
export interface PrintArea {
  widthCm: number;
  heightCm: number;
  areaCm2: number;
}

/**
 * Opções de cores disponíveis
 */
export interface ColorOption {
  value: number;
  label: string;
}

/**
 * Opções de tamanho disponíveis
 */
export interface SizeOption {
  label: string;
  value: string;
  width: number;
  height: number;
  areaCm2: number;
  priceModifier: number;
}

/**
 * Parâmetros para cálculo de preço
 */
export interface PriceCalculationParams {
  quantity: number;
  colors?: number;
  widthCm?: number;
  heightCm?: number;
  areaCm2?: number;
}

/**
 * Resultado do cálculo de preço
 */
export interface PriceCalculationResult {
  tableId: string;
  tableCode: string;
  techniqueName: string;
  
  // Quantidade e faixa
  quantity: number;
  tierUsed: number;
  
  // Preços
  unitPrice: number;
  subtotal: number;
  setupPrice: number;
  handlingPrice: number;
  grandTotal: number;
  
  // Economia
  savings?: {
    perUnit: number;
    total: number;
    percentOff: number;
  };
  
  // Prazo
  slaDays: number | null;
  
  // Limites aplicados
  maxColors: number | null;
  maxArea: PrintArea | null;
}

/**
 * Resultado de validação
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
}

/**
 * Critérios para seleção de tabela
 */
export interface TableSelectionCriteria {
  techniqueName?: string;
  techniqueCode?: string;
  colors?: number;
  widthCm?: number;
  heightCm?: number;
  quantity?: number;
}

/**
 * Input simplificado de tabela para cálculos
 * (independente do formato de banco de dados)
 */
export interface PriceTableInput {
  id: string;
  tableCode: string;
  tableCodeOption: string;
  techniqueName: string;
  
  // Limites
  maxColors: number | null;
  maxWidthCm: number | null;
  maxHeightCm: number | null;
  minAreaCm2: number | null;
  maxAreaCm2: number | null;
  
  // Tipo de precificação
  priceByColor: boolean;
  priceByArea: boolean;
  priceByStitches: boolean;
  
  // Custos fixos
  setupPrice: number;
  handlingPrice: number;
  
  // Faixas de preço
  tiers: PriceTier[];
  
  isActive: boolean;
}

/**
 * Técnica simplificada para regras de negócio
 */
export interface TechniqueInput {
  id: string;
  code: string;
  name: string;
  category: string;
  
  // Configuração de cores
  requiresColors: boolean;
  minColors: number;
  maxColors: number;
  priceByColor: boolean;
  extraColorPrice: number;
  
  // Configuração de área
  priceByArea: boolean;
  priceByStitches: boolean;
  minAreaCm2: number | null;
  maxAreaCm2: number | null;
  
  // Custos base
  setupPrice: number;
  handlingPrice: number;
  costMultiplier: number;
  
  // Características
  appliesToCurved: boolean;
  
  isActive: boolean;
}
