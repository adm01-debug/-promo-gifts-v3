import { useState, useCallback, useEffect } from "react";

interface UseOptimisticMutationOptions<T, V> {
  mutationFn: (variables: V) => Promise<T>;
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V, rollbackValue: T | undefined) => void;
  onSettled?: () => void;
}

/**
 * useOptimisticMutation - Hook para updates otimistas com rollback (CA-13)
 * 
 * @example
 * const { mutate, isLoading } = useOptimisticMutation({
 *   mutationFn: async (newValue) => {
 *     return await api.update(newValue);
 *   },
 *   onSuccess: (data) => {
 *     toast.success("Salvo com sucesso!");
 *   },
 *   onError: (error, variables, rollbackValue) => {
 *     setValue(rollbackValue); // Rollback manual
 *     toast.error("Erro ao salvar");
 *   },
 * });
 */
export function useOptimisticMutation<T, V>({
  mutationFn,
  onSuccess,
  onError,
  onSettled,
}: UseOptimisticMutationOptions<T, V>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (
      variables: V,
      options?: {
        optimisticUpdate?: T;
        rollbackValue?: T;
      }
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        onSuccess?.(result, variables);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error, variables, options?.rollbackValue);
        throw error;
      } finally {
        setIsLoading(false);
        onSettled?.();
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  return {
    mutate,
    isLoading,
    error,
    reset: () => setError(null),
  };
}

/**
 * useOptimisticToggle - Hook específico para toggles otimistas (ex: favoritos)
 */
export function useOptimisticToggle({
  initialValue = false,
  onToggle,
  onError,
}: {
  initialValue?: boolean;
  onToggle: (newValue: boolean) => Promise<void>;
  onError?: (error: Error) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with external value
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const toggle = useCallback(async () => {
    const previousValue = value;
    const newValue = !value;

    // Optimistic update
    setValue(newValue);
    setIsLoading(true);

    try {
      await onToggle(newValue);
    } catch (err) {
      // Rollback
      setValue(previousValue);
      const error = err instanceof Error ? err : new Error("Toggle failed");
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [value, onToggle, onError]);

  return {
    value,
    toggle,
    isLoading,
    setValue,
  };
}

/**
 * useOptimisticList - Hook para operações otimistas em listas
 */
export function useOptimisticList<T extends { id: string }>({
  initialItems = [],
  onAdd,
  onRemove,
  onUpdate,
  onError,
}: {
  initialItems?: T[];
  onAdd?: (item: T) => Promise<T>;
  onRemove?: (id: string) => Promise<void>;
  onUpdate?: (item: T) => Promise<T>;
  onError?: (error: Error, rollbackFn: () => void) => void;
}) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with external items
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const addItem = useCallback(async (item: T) => {
    const previousItems = [...items];
    
    // Optimistic add
    setItems((prev) => [...prev, item]);
    setIsLoading(true);

    try {
      if (onAdd) {
        const result = await onAdd(item);
        // Update with server response
        setItems((prev) => prev.map((i) => (i.id === item.id ? result : i)));
        return result;
      }
      return item;
    } catch (err) {
      // Rollback
      setItems(previousItems);
      const error = err instanceof Error ? err : new Error("Add failed");
      onError?.(error, () => setItems(previousItems));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [items, onAdd, onError]);

  const removeItem = useCallback(async (id: string) => {
    const previousItems = [...items];
    
    // Optimistic remove
    setItems((prev) => prev.filter((item) => item.id !== id));
    setIsLoading(true);

    try {
      if (onRemove) {
        await onRemove(id);
      }
    } catch (err) {
      // Rollback
      setItems(previousItems);
      const error = err instanceof Error ? err : new Error("Remove failed");
      onError?.(error, () => setItems(previousItems));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [items, onRemove, onError]);

  const updateItem = useCallback(async (item: T) => {
    const previousItems = [...items];
    
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    setIsLoading(true);

    try {
      if (onUpdate) {
        const result = await onUpdate(item);
        setItems((prev) => prev.map((i) => (i.id === item.id ? result : i)));
        return result;
      }
      return item;
    } catch (err) {
      // Rollback
      setItems(previousItems);
      const error = err instanceof Error ? err : new Error("Update failed");
      onError?.(error, () => setItems(previousItems));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [items, onUpdate, onError]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    setItems,
    isLoading,
  };
}

export default useOptimisticMutation;
