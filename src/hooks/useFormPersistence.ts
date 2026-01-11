import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface UseFormPersistenceOptions<T> {
  /** Unique key for storing form data */
  key: string;
  /** Initial form values */
  initialValues: T;
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number;
  /** Whether to show toast on restore (default: true) */
  showRestoreToast?: boolean;
  /** Storage type (default: 'localStorage') */
  storage?: "localStorage" | "sessionStorage";
  /** Expiration time in ms (default: 24 hours) */
  expirationMs?: number;
}

interface StoredData<T> {
  data: T;
  timestamp: number;
}

/**
 * Hook for persisting form data to local/session storage
 * with auto-save, restore, and expiration support
 */
export function useFormPersistence<T extends Record<string, unknown>>({
  key,
  initialValues,
  debounceMs = 1000,
  showRestoreToast = true,
  storage = "localStorage",
  expirationMs = 24 * 60 * 60 * 1000, // 24 hours
}: UseFormPersistenceOptions<T>) {
  const storageKey = `form_persistence_${key}`;
  const storageApi = storage === "localStorage" ? localStorage : sessionStorage;

  // Check for stored data
  const getStoredData = useCallback((): StoredData<T> | null => {
    try {
      const stored = storageApi.getItem(storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as StoredData<T>;
      
      // Check expiration
      if (Date.now() - parsed.timestamp > expirationMs) {
        storageApi.removeItem(storageKey);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }, [storageApi, storageKey, expirationMs]);

  // Initialize values with stored data or initial values
  const storedData = getStoredData();
  const [values, setValues] = useState<T>(storedData?.data || initialValues);
  const [hasRestoredData, setHasRestoredData] = useState(!!storedData);
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Show restore toast on mount
  useEffect(() => {
    if (storedData && showRestoreToast) {
      toast.info("Dados do formulário restaurados", {
        description: "Continuando de onde você parou",
        action: {
          label: "Limpar",
          onClick: () => clearStoredData(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to storage
  const saveToStorage = useCallback((data: T) => {
    try {
      const toStore: StoredData<T> = {
        data,
        timestamp: Date.now(),
      };
      storageApi.setItem(storageKey, JSON.stringify(toStore));
    } catch (error) {
      console.error("Error saving form data:", error);
    }
  }, [storageApi, storageKey]);

  // Debounced save
  const debouncedSave = useCallback((data: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveToStorage(data);
    }, debounceMs);
  }, [saveToStorage, debounceMs]);

  // Update values handler
  const updateValues = useCallback((newValues: Partial<T> | ((prev: T) => T)) => {
    setValues((prev) => {
      const updated = typeof newValues === "function" 
        ? newValues(prev) 
        : { ...prev, ...newValues };
      
      setIsDirty(true);
      debouncedSave(updated);
      
      return updated;
    });
  }, [debouncedSave]);

  // Clear stored data
  const clearStoredData = useCallback(() => {
    storageApi.removeItem(storageKey);
    setHasRestoredData(false);
    setIsDirty(false);
  }, [storageApi, storageKey]);

  // Reset to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    clearStoredData();
  }, [initialValues, clearStoredData]);

  // Save immediately (without debounce)
  const saveNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    saveToStorage(values);
    setIsDirty(false);
  }, [saveToStorage, values]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    values,
    setValues: updateValues,
    isDirty,
    hasRestoredData,
    resetForm,
    clearStoredData,
    saveNow,
  };
}

/**
 * Hook for detecting unsaved changes and prompting before leave
 */
export function useUnsavedChangesWarning(isDirty: boolean, message?: string) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message || "Você tem alterações não salvas. Deseja sair?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, message]);
}

/**
 * Hook for form field-level autosave indicator
 */
export function useAutoSaveIndicator() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showSaving = useCallback(() => {
    setStatus("saving");
  }, []);

  const showSaved = useCallback(() => {
    setStatus("saved");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const showError = useCallback(() => {
    setStatus("error");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus("idle"), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    status,
    showSaving,
    showSaved,
    showError,
    isSaving: status === "saving",
    isSaved: status === "saved",
    isError: status === "error",
  };
}

export default useFormPersistence;
