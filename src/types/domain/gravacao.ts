/**
 * Domain Types: Gravação (legacy)
 * 
 * Tipos de domínio para o módulo de gravação.
 * Mantido para compatibilidade com componentes existentes.
 */

// ============================================
// TÉCNICA DE GRAVAÇÃO (Domínio)
// ============================================

export type SetupType = 'nenhum' | 'fotolito' | 'cliche' | 'matriz' | 'arte_digital';
export type VariantFormat = 'plana' | 'cilindrica' | 'textil' | 'patch';
export type IntegrationType = 'api_spot' | 'api_rest' | 'manual';

/**
 * Técnica de gravação
 */
export interface EngravingTechnique {
  id: string;
  code: string;
  internalCode: string;
  name: string;
  slug: string;
  description: string | null;
  allowsColors: boolean;
  maxColors: number;
  chargeByColor: boolean;
  chargeByArea: boolean;
  chargeByStitches: boolean;
  requiresSetup: boolean;
  setupType: SetupType;
  productionDays: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Técnica com variantes
 */
export interface EngravingTechniqueWithVariants extends EngravingTechnique {
  variants: EngravingTechniqueVariant[];
  variantsCount?: number;
}

/**
 * Variante de técnica de gravação
 */
export interface EngravingTechniqueVariant {
  id: string;
  techniqueId: string;
  code: string;
  internalCode: string;
  name: string;
  slug: string;
  description: string | null;
  format: VariantFormat;
  allowsColors: boolean;
  maxColors: number;
  chargeByColor: boolean;
  typicalProducts: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FORNECEDOR DE GRAVAÇÃO (Domínio)
// ============================================

/**
 * Fornecedor de serviços de gravação
 */
export interface EngravingSupplier {
  id: string;
  code: string;
  name: string;
  shortName: string;
  integrationType: IntegrationType;
  apiEndpoint: string | null;
  apiAccessKey: string | null;
  apiActive: boolean;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FAIXAS DE PREÇO (Domínio)
// ============================================

/**
 * Faixa de área para precificação
 */
export interface AreaPriceTier {
  id: string;
  techniqueId: string;
  code: string;
  name: string;
  description: string | null;
  minAreaCm2: number | null;
  maxAreaCm2: number | null;
  priceMultiplier: number;
  additionalPerPiece: number;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Faixa de pontos (bordado) para precificação
 */
export interface StitchPriceTier {
  id: string;
  techniqueId: string;
  code: string;
  name: string;
  description: string | null;
  minStitches: number | null;
  maxStitches: number | null;
  typicalAreaCm2: number | null;
  priceMultiplier: number;
  displayOrder: number;
  isActive: boolean;
}

// ============================================
// OPÇÕES AUXILIARES (Domínio)
// ============================================

/**
 * Opção de fita para hot stamping
 */
export interface HotStampingTapeOption {
  id: string;
  code: string;
  name: string;
  hexColor: string | null;
  type: 'metalico' | 'holografico' | 'fosco';
  priceMultiplier: number;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Opção de acabamento laser
 */
export interface LaserFinishOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMultiplier: number;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Tipo de filme para técnica
 */
export interface FilmTypeOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMultiplier: number;
  displayOrder: number;
  isActive: boolean;
}

// ============================================
// FORMULÁRIOS (Domínio)
// ============================================

/**
 * Dados de formulário para técnica de gravação
 */
export interface EngravingTechniqueFormData {
  code: string;
  internalCode: string;
  name: string;
  description: string;
  allowsColors: boolean;
  maxColors: number;
  chargeByColor: boolean;
  chargeByArea: boolean;
  chargeByStitches: boolean;
  requiresSetup: boolean;
  setupType: SetupType;
  productionDays: number;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Dados de formulário para variante
 */
export interface VariantFormData {
  techniqueId: string;
  code: string;
  internalCode: string;
  name: string;
  description: string;
  format: VariantFormat;
  allowsColors: boolean;
  maxColors: number;
  chargeByColor: boolean;
  typicalProducts: string[];
  displayOrder: number;
  isActive: boolean;
}
