/**
 * @deprecated Este arquivo foi DEPRECADO. 
 * Use `useTecnicasUnificadas` como SSOT.
 * 
 * As funcionalidades foram consolidadas em:
 * - src/hooks/useTecnicasUnificadas.ts
 * 
 * Este arquivo existe apenas para compatibilidade com imports existentes.
 * Novos componentes devem importar diretamente de useTecnicasUnificadas.
 */

// Re-export tudo de useTecnicasUnificadas para compatibilidade
export {
  // Tipos
  type CustomizationPriceTable,
  type PriceTier,
  type PriceCalculation,
  // Funções
  extractPriceTiers,
  calculatePriceForQuantity,
  // Hooks
  useCustomizationPricing,
  usePriceSimulator,
} from './useTecnicasUnificadas';

// Log de deprecação em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[DEPRECADO] useCustomizationPricing.ts foi consolidado em useTecnicasUnificadas.ts. ' +
    'Atualize seus imports para usar useTecnicasUnificadas diretamente.'
  );
}
