import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "./use-debounce";
import { showSuccessToast, showWarningToast } from "@/utils/undoToast";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  storageKey?: string;
  showNotification?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  save: () => Promise<void>;
  discard: () => void;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
  storageKey,
  showNotification = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialDataRef = useRef<T>(data);
  const lastSavedDataRef = useRef<T>(data);

  const debouncedData = useDebounce(data, debounceMs);

  // Check for changes
  useEffect(() => {
    const hasChanges = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current);
    setHasUnsavedChanges(hasChanges);
  }, [data]);

  // Save to localStorage for recovery
  useEffect(() => {
    if (storageKey && hasUnsavedChanges) {
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [data, storageKey, hasUnsavedChanges]);

  // Auto-save on debounced data change
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const doSave = async () => {
      setIsSaving(true);
      try {
        await onSave(debouncedData);
        lastSavedDataRef.current = debouncedData;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);

        if (storageKey) {
          localStorage.removeItem(storageKey);
        }

        if (showNotification) {
          showSuccessToast({
            title: "Alterações salvas",
            description: "Suas alterações foram salvas automaticamente.",
            duration: 2000,
          });
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
        if (showNotification) {
          showWarningToast({
            title: "Erro ao salvar",
            description: "Não foi possível salvar automaticamente. Tentando novamente...",
          });
        }
      } finally {
        setIsSaving(false);
      }
    };

    doSave();
  }, [debouncedData, enabled, hasUnsavedChanges, onSave, showNotification, storageKey]);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(data);
      lastSavedDataRef.current = data;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, storageKey]);

  const discard = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setHasUnsavedChanges(false);
  }, [storageKey]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    save,
    discard,
  };
}

// Hook to restore from localStorage
export function useAutoSaveRestore<T>(
  storageKey: string,
  defaultValue: T
): {
  restoredData: T | null;
  hasRestoredData: boolean;
  clearRestored: () => void;
} {
  const [restoredData, setRestoredData] = useState<T | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setRestoredData(JSON.parse(stored));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  const clearRestored = useCallback(() => {
    localStorage.removeItem(storageKey);
    setRestoredData(null);
  }, [storageKey]);

  return {
    restoredData,
    hasRestoredData: restoredData !== null,
    clearRestored,
  };
}

// Debounce hook
function useDebounceInternal<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
