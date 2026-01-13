/**
 * Lib: Personalization Types
 * 
 * @deprecated Use tipos de src/types/domain
 * Este arquivo mantém compatibilidade com código legado.
 */

// Re-export dos tipos de domínio
export type {
  PriceTier,
  PrintArea,
  ColorOption,
  SizeOption,
  PriceCalculationParams,
  PriceCalculationResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TableSelectionCriteria,
  PriceTable as PriceTableInput,
  Technique as TechniqueInput,
} from '../../types/domain';
