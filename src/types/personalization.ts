/**
 * Types: Personalization
 * 
 * @deprecated Use tipos de src/types/domain
 * Este arquivo mantém compatibilidade com código legado.
 */

// Re-export dos tipos de domínio
export type {
  Technique as PersonalizationTechnique,
  TechniqueSummary,
  PriceTable,
  PriceTier,
  PriceCalculationParams,
  PriceCalculationResult,
  PrintArea,
  ColorOption,
  SizeOption,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TableSelectionCriteria,
  TechniqueFilters,
  PriceTableFilters,
} from './domain';

// ============================================
// TIPOS LEGADOS (para compatibilidade)
// ============================================

/**
 * @deprecated Use Technique de src/types/domain
 */
export interface PersonalizationTechniqueLegacy {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  min_quantity: number | null;
  setup_cost: number | null;
  unit_cost: number | null;
  estimated_days: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Localização de personalização
 */
export interface PersonalizationLocation {
  id: string;
  product_type: string;
  location_name: string;
  code: string | null;
  is_active: boolean | null;
  created_at: string;
}

/**
 * Tamanho de personalização
 */
export interface PersonalizationSize {
  id: string;
  technique_id: string | null;
  technique_code: string | null;
  size_label: string;
  width_cm: number | null;
  height_cm: number | null;
  area_cm2: number | null;
  price_modifier: number | null;
  is_active: boolean | null;
  created_at: string;
}

// ============================================
// SIMULAÇÃO (legado)
// ============================================

/**
 * @deprecated Use SavedSimulation de src/types/domain
 */
export interface PersonalizationSimulation {
  id: string;
  seller_id: string;
  client_id: string | null;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  product_unit_price: number;
  quantity: number;
  simulation_data: SimulationDataLegacy[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationDataLegacy {
  technique_id: string;
  technique_name: string;
  location: string;
  colors: number;
  size: string;
  setup_cost: number;
  unit_cost: number;
  total_cost: number;
}
