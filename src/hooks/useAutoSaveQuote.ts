import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface AutoSaveOptions {
  enabled: boolean;
  data: any;
  onRestore?: (data: any) => void;
  debounceMs?: number;
  key?: string;
}

/**
 * Hook para persistência automática de rascunhos no LocalStorage.
 */
export function useAutoSaveQuote({
  enabled,
  data,
  onRestore,
  debounceMs = 2000,
  key = "quote_builder_autosave"
}: AutoSaveOptions) {
  const lastSavedRef = useRef<string>("");

  // Efeito de carregamento inicial (Restaurar)
  useEffect(() => {
    if (!enabled) return;
    
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && onRestore) {
          onRestore(parsed);
        }
      } catch (e) {
        console.error("Failed to parse autosave data", e);
      }
    }
  }, []); // Só roda uma vez no mount

  // Efeito de salvamento (Debounced)
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      const stringData = JSON.stringify(data);
      
      // Evita salvar se nada mudou
      if (stringData === lastSavedRef.current) return;

      localStorage.setItem(key, stringData);
      lastSavedRef.current = stringData;
      
      console.log("[AutoSave] Quote saved to localStorage");
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, enabled, key, debounceMs]);

  const clearAutoSave = () => {
    localStorage.removeItem(key);
    lastSavedRef.current = "";
  };

  return { clearAutoSave };
}
