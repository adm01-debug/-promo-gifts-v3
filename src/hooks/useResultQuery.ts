/**
 * Hook para integrar Result Pattern com React Query
 * 
 * Converte queries do TanStack Query para usar Result<T, E>
 */

import React from 'react';
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { 
  Result, 
  isOk, 
  isFail, 
  DomainError,
  fromPromise,
  AsyncResult 
} from '@/lib/result';

// ============================================
// TIPOS
// ============================================

export interface ResultQueryState<T, E = DomainError> {
  result: Result<T, E> | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => void;
}

export interface ResultMutationState<T, V, E = DomainError> {
  result: Result<T, E> | null;
  mutate: (variables: V) => void;
  mutateAsync: (variables: V) => AsyncResult<T, E>;
  isLoading: boolean;
  reset: () => void;
}

// ============================================
// HOOKS
// ============================================

/**
 * useQuery que retorna Result
 */
export function useResultQuery<T, E = DomainError>(
  queryKey: string[],
  queryFn: () => AsyncResult<T, E>,
  options?: Omit<UseQueryOptions<Result<T, E>, Error>, 'queryKey' | 'queryFn'>
): ResultQueryState<T, E> {
  const query = useQuery({
    queryKey,
    queryFn,
    ...options,
  });

  return {
    result: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.data ? isFail(query.data) : false,
    isSuccess: query.data ? isOk(query.data) : false,
    refetch: query.refetch,
  };
}

/**
 * useMutation que retorna Result
 */
export function useResultMutation<T, V, E = DomainError>(
  mutationFn: (variables: V) => AsyncResult<T, E>,
  options?: Omit<UseMutationOptions<Result<T, E>, Error, V>, 'mutationFn'>
): ResultMutationState<T, V, E> {
  const mutation = useMutation({
    mutationFn,
    ...options,
  });

  return {
    result: mutation.data ?? null,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    reset: mutation.reset,
  };
}

/**
 * Wrapper para converter função async normal em Result
 */
export function wrapAsyncFn<T, A extends unknown[], E = DomainError>(
  fn: (...args: A) => Promise<T>,
  errorMapper?: (error: unknown) => E
): (...args: A) => AsyncResult<T, E> {
  return async (...args: A) => {
    return fromPromise(fn(...args), errorMapper);
  };
}

/**
 * Hook para lidar com Result em efeitos
 */
export function useResultEffect<T, E>(
  result: Result<T, E> | null,
  handlers: {
    onSuccess?: (value: T) => void;
    onError?: (error: E) => void;
  }
) {
  const { onSuccess, onError } = handlers;

  // Usar useEffect para reagir a mudanças no result
  if (result) {
    if (isOk(result) && onSuccess) {
      onSuccess(result.value);
    } else if (isFail(result) && onError) {
      onError(result.error);
    }
  }
}

// ============================================
// UTILITÁRIOS PARA COMPONENTES
// ============================================

/**
 * Renderiza baseado no estado do Result
 */
export function renderResult<T, E>(
  result: Result<T, E> | null,
  options: {
    loading: React.ReactNode;
    success: (value: T) => React.ReactNode;
    error: (error: E) => React.ReactNode;
  }
): React.ReactNode {
  if (!result) {
    return options.loading;
  }

  if (isOk(result)) {
    return options.success(result.value);
  }

  return options.error(result.error);
}

/**
 * Extrai valor ou mostra fallback
 */
export function unwrapOr<T, E>(
  result: Result<T, E> | null,
  fallback: T
): T {
  if (result && isOk(result)) {
    return result.value;
  }
  return fallback;
}
