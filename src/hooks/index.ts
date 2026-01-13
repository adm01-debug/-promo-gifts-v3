// Hooks utilitários reutilizáveis
export { useDebounce, useDebouncedCallback, useThrottle, useSearchAsYouType } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export { useMediaQuery, useBreakpoint } from './useMediaQuery';
export { useClickOutside, useClickOutsideMultiple } from './useClickOutside';
export { useCopyToClipboard } from './useCopyToClipboard';
export { useKeyPress, useKeyCombo, useKeyState } from './useKeyPress';
export { useToggle, useMultiToggle } from './useToggle';
export { usePagination } from './usePagination';
export { useDebouncedSearch } from './useDebouncedSearch';
export { useConfirmDialog, useDeleteConfirm, useGlobalConfirm, ConfirmDialogProvider } from './useConfirmDialog.tsx';
export { useBulkSelection } from './useBulkSelection';
export { useAutoSave, AutoSaveIndicator, DraftRecovery, useFormDraft } from './useAutoSave.tsx';

// Técnicas - Hooks Modulares
export {
  TECNICAS_QUERY_KEYS,
  // Lista e Busca
  useTecnicasList,
  useTecnicasResumo,
  useTecnicaById,
  useTecnicaByCodigo,
  useCategoriasTecnicas,
  useInvalidateTecnicas,
  // Mutations
  useTecnicaMutations,
  // Tabelas de Preço
  useTabelasPreco,
  useTabelasPorTecnica,
  useTabelaPorCodigo,
  useNomesTecnicasPreco,
  buscarTabelaAdequada,
  // Cálculos
  calcularPreco,
  extractPriceTiersFromTabela,
  calculatePriceForQuantity,
  usePrecoCalculation,
  usePriceSimulator,
  // Tipos
  type PriceTier,
  type PriceCalculation,
  type LegacyPriceTable,
} from './tecnicas';
