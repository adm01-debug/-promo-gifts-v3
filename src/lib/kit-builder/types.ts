/**
 * Kit Builder Types
 * Tipos para o sistema de montagem de kits de brindes
 */

// ============================================
// TIPOS BASE
// ============================================

/** Tipo de kit suportado */
export type KitType = 'montado' | 'original' | 'simples';

export interface KitBox {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  // Dimensões internas em cm
  internalWidth: number;
  internalHeight: number;
  internalDepth: number;
  // Volume calculado
  internalVolume: number;
  // Categoria/tipo de caixa
  boxType?: string;
  // Cor da caixa
  color?: string;
  // Material
  material?: string;
  // Peso em gramas
  weight?: number;
}

export interface KitItem {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  // Dimensões do item em cm (convertidas de mm se necessário)
  width: number;
  height: number;
  depth: number;
  // Volume calculado
  volume: number;
  // Peso em gramas
  weight?: number;
  // Categoria do item
  category?: string;
  // Material do item
  material?: string;
  // Cor selecionada
  selectedColor?: {
    name: string;
    hex?: string;
  };
  // Quantidade no kit
  quantity: number;
  // Flags de composição (do product_kit_components)
  isOptional?: boolean;
  isReplaceable?: boolean;
  isPackaging?: boolean;
  allowsPersonalization?: boolean;
  // Notas de personalização
  personalizationNotes?: string;
  // Variantes permitidas para troca
  allowedVariantIds?: string[];
  // Personalização configurada
  personalization?: KitItemPersonalization;
}

export interface KitItemPersonalization {
  enabled: boolean;
  techniqueId?: string;
  techniqueName?: string;
  techniqueCode?: string;
  colors?: number;
  width?: number;
  height?: number;
  position?: string;
  estimatedPrice?: number;
}

export interface KitPersonalization {
  box: KitItemPersonalization;
  items: Record<string, KitItemPersonalization>; // keyed by item id
}

// ============================================
// ESTADO DO KIT
// ============================================

export interface KitState {
  name: string;
  kitType: KitType;
  box: KitBox | null;
  items: KitItem[];
  personalization: KitPersonalization;
  // Volumes
  totalItemsVolume: number;
  availableVolume: number;
  volumeUsagePercent: number;
  // Peso total em gramas
  totalWeight: number;
  // Preços
  boxPrice: number;
  itemsPrice: number;
  personalizationPrice: number;
  totalPrice: number;
  // Status
  isValid: boolean;
  validationErrors: string[];
}

// ============================================
// COMPATIBILIDADE
// ============================================

export interface CompatibilityResult {
  fits: boolean;
  reason?: string;
  volumeAfterAdd?: number;
  percentAfterAdd?: number;
}

// ============================================
// WIZARD
// ============================================

export type KitBuilderStep = 'box' | 'items' | 'personalization' | 'summary';

export interface KitBuilderWizardState {
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  canProceed: boolean;
}

// ============================================
// FILTROS
// ============================================

export interface BoxFilters {
  search?: string;
  minWidth?: number;
  minHeight?: number;
  minDepth?: number;
  boxType?: string;
  material?: string;
}

export interface ItemFilters {
  search?: string;
  category?: string;
  maxVolume?: number;
  onlyFitting?: boolean;
}

// ============================================
// PRODUTO EXTERNO (para conversão)
// ============================================

export interface ExternalProductForKit {
  id: string;
  name: string;
  sku: string;
  base_price: number | null;
  sale_price?: number | null;
  image_url: string | null;
  primary_image_url: string | null;
  images?: string[] | null;
  dimensions?: string | { width_cm?: number; height_cm?: number; length_cm?: number; diameter_cm?: number; shape_type?: string } | null;
  category_id?: string | null;
  colors?: any[] | null;
  // Tipo do produto (product, packaging, etc.)
  product_type?: string | null;
  // Peso em gramas
  weight_g?: number | null;
  // Material
  material?: string | null;
  // Dimensões em mm (do product_kit_components)
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  // Campos específicos para caixas
  box_length_cm?: number | null;
  box_width_cm?: number | null;
  box_height_cm?: number | null;
  internal_length_cm?: number | null;
  internal_width_cm?: number | null;
  internal_height_cm?: number | null;
  is_box?: boolean;
  is_kit?: boolean;
  // Composição de kit
  allows_personalization?: boolean;
  personalization_notes?: string | null;
  is_optional?: boolean;
  is_replaceable?: boolean;
  allowed_variant_ids?: string[] | null;
}

// ============================================
// CONVERSÃO mm → cm
// ============================================

export function mmToCm(mm: number | null | undefined): number | null {
  if (mm == null || mm <= 0) return null;
  return mm / 10;
}
