/**
 * Result Pattern - Exports
 */

// Core Result types and functions
export {
  // Types
  type Result,
  type Success,
  type Failure,
  type AsyncResult,
  type DomainError,
  
  // Constructors
  ok,
  fail,
  domainError,
  DomainErrors,
  
  // Type guards
  isOk,
  isFail,
  
  // Transformations
  map,
  mapError,
  flatMap,
  fold,
  
  // Extraction
  getOrElse,
  getOrElseLazy,
  getOrThrow,
  
  // Combinators
  combine,
  firstSuccess,
  
  // Async
  fromPromise,
  fromTryCatch,
  mapAsync,
  flatMapAsync,
} from './result';

// External DB with Result
export {
  ExternalDbErrors,
  invokeExternalDbResult,
  selectFromExternal,
  selectOneFromExternal,
  insertIntoExternal,
  updateInExternal,
  deleteFromExternal,
  selectWithFallback,
  selectOneOrNull,
} from './external-db-result';

// Calculator with Result
export {
  CalculatorErrors,
  findTierForQuantity,
  validateCalculationInput,
  calculateUnitPrice,
  calculateTotalPrice,
  findBestPrice,
} from './personalization/calculator-result';
