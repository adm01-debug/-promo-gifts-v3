import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { showUndoToast, showErrorToast } from "@/utils/undoToast";

interface OptimisticUpdateOptions<T, TData> {
  queryKey: any[];
  mutationFn: (data: T) => Promise<TData>;
  updateFn: (oldData: TData | undefined, newData: T) => TData;
  rollbackFn?: (oldData: TData | undefined, newData: T) => TData;
  successMessage?: string;
  errorMessage?: string;
  showUndo?: boolean;
  undoDuration?: number;
}

export function useOptimisticUpdate<T, TData = any>({
  queryKey,
  mutationFn,
  updateFn,
  rollbackFn,
  successMessage,
  errorMessage = "Ocorreu um erro. Tente novamente.",
  showUndo = true,
  undoDuration = 5000,
}: OptimisticUpdateOptions<T, TData>) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (data: T) => {
      setIsLoading(true);

      // Get current data for rollback
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      queryClient.setQueryData<TData>(queryKey, (old) => updateFn(old, data));

      let isRolledBack = false;

      const rollback = () => {
        if (!isRolledBack) {
          isRolledBack = true;
          if (rollbackFn) {
            queryClient.setQueryData<TData>(queryKey, (old) => rollbackFn(old, data));
          } else {
            queryClient.setQueryData<TData>(queryKey, previousData);
          }
        }
      };

      // Show undo toast if enabled
      if (showUndo && successMessage) {
        showUndoToast({
          title: successMessage,
          onUndo: rollback,
          duration: undoDuration,
        });
      }

      try {
        // Perform actual mutation
        const result = await mutationFn(data);

        // If rolled back before mutation completed, re-apply rollback
        if (isRolledBack) {
          queryClient.invalidateQueries({ queryKey });
        }

        setIsLoading(false);
        return result;
      } catch (error) {
        // Rollback on error
        rollback();
        showErrorToast({ title: errorMessage });
        setIsLoading(false);
        throw error;
      }
    },
    [queryClient, queryKey, mutationFn, updateFn, rollbackFn, successMessage, errorMessage, showUndo, undoDuration]
  );

  return {
    mutate,
    isLoading,
  };
}

// Specific hook for optimistic list operations
export function useOptimisticList<T extends { id: string }>(queryKey: any[]) {
  const queryClient = useQueryClient();

  const addItem = useCallback(
    (item: T) => {
      queryClient.setQueryData<T[]>(queryKey, (old) => [item, ...(old || [])]);
    },
    [queryClient, queryKey]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<T>) => {
      queryClient.setQueryData<T[]>(queryKey, (old) =>
        old?.map((item) => (item.id === id ? { ...item, ...updates } : item)) || []
      );
    },
    [queryClient, queryKey]
  );

  const removeItem = useCallback(
    (id: string) => {
      queryClient.setQueryData<T[]>(queryKey, (old) =>
        old?.filter((item) => item.id !== id) || []
      );
    },
    [queryClient, queryKey]
  );

  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      queryClient.setQueryData<T[]>(queryKey, (old) => {
        if (!old) return [];
        const result = [...old];
        const [removed] = result.splice(fromIndex, 1);
        if (removed) {
          result.splice(toIndex, 0, removed);
        }
        return result;
      });
    },
    [queryClient, queryKey]
  );

  return {
    addItem,
    updateItem,
    removeItem,
    reorderItems,
  };
}

// Hook for optimistic toggle
export function useOptimisticToggle<T extends { id: string }>(
  queryKey: any[],
  field: keyof T,
  mutationFn: (id: string, value: boolean) => Promise<void>
) {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const toggle = useCallback(
    async (id: string) => {
      // Mark as pending
      setPendingIds((prev) => new Set(prev).add(id));

      // Get current value
      const currentData = queryClient.getQueryData<T[]>(queryKey);
      const item = currentData?.find((i) => i.id === id);
      const currentValue = item ? (item[field] as boolean) : false;
      const newValue = !currentValue;

      // Optimistically update
      queryClient.setQueryData<T[]>(queryKey, (old) =>
        old?.map((i) => (i.id === id ? { ...i, [field]: newValue } : i)) || []
      );

      try {
        await mutationFn(id, newValue);
      } catch (error) {
        // Rollback on error
        queryClient.setQueryData<T[]>(queryKey, (old) =>
          old?.map((i) => (i.id === id ? { ...i, [field]: currentValue } : i)) || []
        );
        throw error;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [queryClient, queryKey, field, mutationFn]
  );

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  return { toggle, isPending };
}
