// Barrel export para hooks de Gravação
export { useTecnicasGravacao, useTecnicaGravacao } from './useTecnicasGravacao';
export { useVariantesGravacao, useAllVariantes } from './useVariantesGravacao';
export { useFornecedoresGravacao } from './useFornecedoresGravacao';

// Re-export do novo hook unificado baseado no briefing
export {
  useProductPrintAreas,
  useTecnicasGravacao as useAllTecnicas,
  useCustomizationPrice,
  useFindPriceTable,
  TECHNIQUE_COLORS,
  TECHNIQUE_ICONS,
  AREA_SHAPES,
  QUANTITY_TIERS,
  type TecnicaGravacao,
  type PrintAreaWithTechniques,
  type CustomizationPrice,
} from '../useGravacao';
