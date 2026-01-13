/**
 * Domain Layer: Personalização / Gravação
 * 
 * Regras de negócio puras, sem dependências de React ou side effects.
 * Este módulo é o SSOT para cálculos e validações de personalização.
 * 
 * USO:
 * - Hooks devem importar transformadores daqui
 * - Componentes devem usar calculators e validators via hooks
 * - Nunca duplicar lógica de transformação nos hooks
 */

export * from './types';
export * from './calculators';
export * from './validators';
export * from './selectors';
export * from './transformers';

// Re-export principais transformadores para facilitar imports
export {
  rawToTecnicaUnificada,
  rawToTabelaPrecoTecnica,
  transformRawToTecnicas,
  transformRawToTabelas,
} from './transformers';
