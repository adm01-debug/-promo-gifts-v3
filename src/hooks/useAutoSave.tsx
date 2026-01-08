import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  storageKey?: string;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
  storageKey
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string>("");

  // Save to localStorage as backup
  const saveToLocalStorage = useCallback((dataToSave: T) => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        localStorage.setItem(`${storageKey}_timestamp`, new Date().toISOString());
      } catch (e) {
        console.warn("Failed to save to localStorage:", e);
      }
    }
  }, [storageKey]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): T | null => {
    if (!storageKey) return null;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Clear localStorage backup
  const clearLocalStorage = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_timestamp`);
    }
  }, [storageKey]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(data);
    
    // Skip if data hasn't changed
    if (currentData === previousDataRef.current) return;
    previousDataRef.current = currentData;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set saving indicator after short delay (for typing)
    const indicatorTimeout = setTimeout(() => {
      setStatus("saving");
    }, 500);

    // Debounced save
    timeoutRef.current = setTimeout(async () => {
      clearTimeout(indicatorTimeout);
      
      try {
        setStatus("saving");
        await onSave(data);
        saveToLocalStorage(data);
        setStatus("saved");
        setLastSaved(new Date());
        
        // Reset to idle after showing "saved"
        setTimeout(() => setStatus("idle"), 2000);
      } catch (error) {
        console.error("Auto-save failed:", error);
        setStatus("error");
        // Save to localStorage as backup on error
        saveToLocalStorage(data);
      }
    }, debounceMs);

    return () => {
      clearTimeout(indicatorTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, debounceMs, enabled, saveToLocalStorage]);

  // Manual save
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus("saving");
    try {
      await onSave(data);
      saveToLocalStorage(data);
      setStatus("saved");
      setLastSaved(new Date());
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      console.error("Manual save failed:", error);
      setStatus("error");
      saveToLocalStorage(data);
    }
  }, [data, onSave, saveToLocalStorage]);

  return {
    status,
    lastSaved,
    saveNow,
    loadFromLocalStorage,
    clearLocalStorage
  };
}

// Auto-save status indicator component
interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  className?: string;
}

export function AutoSaveIndicator({ 
  status, 
  lastSaved,
  className 
}: AutoSaveIndicatorProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={cn(
          "flex items-center gap-2 text-sm",
          className
        )}
      >
        {status === "idle" && lastSaved && (
          <>
            <Cloud className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Salvo às {lastSaved.toLocaleTimeString("pt-BR", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </span>
          </>
        )}

        {status === "saving" && (
          <>
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-muted-foreground">Salvando...</span>
          </>
        )}

        {status === "saved" && (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-500">Salvo</span>
          </>
        )}

        {status === "error" && (
          <>
            <CloudOff className="w-4 h-4 text-red-500" />
            <span className="text-red-500">Erro ao salvar</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Draft recovery prompt
interface DraftRecoveryProps {
  hasDraft: boolean;
  draftTimestamp?: string;
  onRecover: () => void;
  onDiscard: () => void;
}

export function DraftRecovery({
  hasDraft,
  draftTimestamp,
  onRecover,
  onDiscard
}: DraftRecoveryProps) {
  if (!hasDraft) return null;

  const timestamp = draftTimestamp ? new Date(draftTimestamp) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
    >
      <div className="flex items-start gap-3">
        <Cloud className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800 dark:text-amber-200">
            Rascunho não salvo encontrado
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {timestamp 
              ? `Último salvamento: ${timestamp.toLocaleString("pt-BR")}`
              : "Há alterações não salvas disponíveis."
            }
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 ml-8">
        <button
          onClick={onRecover}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          Recuperar
        </button>
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors"
        >
          Descartar
        </button>
      </div>
    </motion.div>
  );
}

// Hook for form draft with recovery
export function useFormDraft<T>(storageKey: string, initialData: T) {
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveredData, setRecoveredData] = useState<T | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if different from initial
        if (JSON.stringify(parsed) !== JSON.stringify(initialData)) {
          setRecoveredData(parsed);
          setShowRecovery(true);
        }
      } catch {}
    }
  }, [storageKey, initialData]);

  const recover = () => {
    setShowRecovery(false);
    return recoveredData;
  };

  const discard = () => {
    setShowRecovery(false);
    setRecoveredData(null);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_timestamp`);
  };

  const timestamp = localStorage.getItem(`${storageKey}_timestamp`) || undefined;

  return {
    showRecovery,
    recoveredData,
    draftTimestamp: timestamp,
    recover,
    discard
  };
}
