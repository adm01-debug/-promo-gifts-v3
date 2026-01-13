/**
 * Result Pattern - Tratamento Explícito de Erros
 * 
 * Baseado no padrão Result/Either de linguagens funcionais.
 * Elimina try/catch espalhados e torna erros parte da assinatura.
 */

// ============================================
// TIPOS BASE
// ============================================

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E = Error> = Success<T> | Failure<E>;

// ============================================
// CONSTRUTORES
// ============================================

export function ok<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function fail<E>(error: E): Failure<E> {
  return { ok: false, error };
}

// ============================================
// TYPE GUARDS
// ============================================

export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok === true;
}

export function isFail<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.ok === false;
}

// ============================================
// TRANSFORMAÇÕES
// ============================================

/**
 * Transforma o valor de sucesso
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Transforma o erro
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isFail(result)) {
    return fail(fn(result.error));
  }
  return result;
}

/**
 * Chain de operações que retornam Result
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Aplica função ao valor ou retorna default
 */
export function fold<T, E, U>(
  result: Result<T, E>,
  onSuccess: (value: T) => U,
  onFailure: (error: E) => U
): U {
  if (isOk(result)) {
    return onSuccess(result.value);
  }
  return onFailure(result.error);
}

// ============================================
// EXTRAÇÃO
// ============================================

/**
 * Extrai valor ou retorna default
 */
export function getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Extrai valor ou executa função para default
 */
export function getOrElseLazy<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn(result.error);
}

/**
 * Extrai valor ou lança erro
 */
export function getOrThrow<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error instanceof Error 
    ? result.error 
    : new Error(String(result.error));
}

// ============================================
// COMBINADORES
// ============================================

/**
 * Combina múltiplos Results em um único
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  
  for (const result of results) {
    if (isFail(result)) {
      return result;
    }
    values.push(result.value);
  }
  
  return ok(values);
}

/**
 * Retorna primeiro sucesso ou último erro
 */
export function firstSuccess<T, E>(results: Result<T, E>[]): Result<T, E> {
  let lastError: Failure<E> | null = null;
  
  for (const result of results) {
    if (isOk(result)) {
      return result;
    }
    lastError = result;
  }
  
  return lastError ?? fail(new Error('No results provided') as unknown as E);
}

// ============================================
// ASYNC SUPPORT
// ============================================

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Converte Promise em Result
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): AsyncResult<T, E> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    if (errorMapper) {
      return fail(errorMapper(error));
    }
    return fail(error as E);
  }
}

/**
 * Converte função que pode lançar em Result
 */
export function fromTryCatch<T, E = Error>(
  fn: () => T,
  errorMapper?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    if (errorMapper) {
      return fail(errorMapper(error));
    }
    return fail(error as E);
  }
}

/**
 * Map assíncrono
 */
export async function mapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>
): AsyncResult<U, E> {
  if (isOk(result)) {
    return ok(await fn(result.value));
  }
  return result;
}

/**
 * FlatMap assíncrono
 */
export async function flatMapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => AsyncResult<U, E>
): AsyncResult<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

// ============================================
// ERROS DE DOMÍNIO
// ============================================

export interface DomainError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function domainError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): DomainError {
  return { code, message, details };
}

// Erros comuns pré-definidos
export const DomainErrors = {
  notFound: (entity: string, id?: string) => 
    domainError('NOT_FOUND', `${entity} não encontrado`, { entity, id }),
  
  invalidInput: (field: string, reason: string) =>
    domainError('INVALID_INPUT', `Campo inválido: ${field}`, { field, reason }),
  
  unauthorized: (action?: string) =>
    domainError('UNAUTHORIZED', 'Não autorizado', { action }),
  
  conflict: (entity: string, reason: string) =>
    domainError('CONFLICT', `Conflito: ${reason}`, { entity, reason }),
  
  externalService: (service: string, message: string) =>
    domainError('EXTERNAL_SERVICE', `Erro em ${service}: ${message}`, { service }),
  
  validation: (errors: Array<{ field: string; message: string }>) =>
    domainError('VALIDATION', 'Erro de validação', { errors }),
} as const;
