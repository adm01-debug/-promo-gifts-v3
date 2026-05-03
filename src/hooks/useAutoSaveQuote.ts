import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Versão atual do schema do payload de AutoSave
// Incrementar sempre que houver mudança que quebre rascunhos antigos
const AUTOSAVE_SCHEMA_VERSION = 2;

interface AutoSavePayload {
  version: number;
  data: any;
  savedAt: string;
}

interface AutoSaveOptions {
  enabled: boolean;
  data: any;
  onRestore?: (data: any) => void;
  debounceMs?: number;
  key?: string;
}

/**
 * Migra dados de versões antigas para a versão atual.
 */
function migratePayload(payload: any): any {
  if (!payload) return null;

  // Se for um payload antigo sem versão (v1)
  if (!payload.version) {
    console.log("[AutoSave] Migrating from v1 to v2");
    return {
      version: AUTOSAVE_SCHEMA_VERSION,
      data: payload, // Antigamente o payload era o próprio data
      savedAt: new Date().toISOString()
    };
  }

  // Adicione futuras migrações aqui:
  // if (payload.version === 2) { ... migrate to 3 ... }

  return payload;
}

/**
 * Hook para persistência automática de rascunhos no LocalStorage com versionamento.
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
        let payload = JSON.parse(saved);
        
        // Aplica migrações se necessário
        payload = migratePayload(payload);
        
        if (payload && payload.data && onRestore) {
          onRestore(payload.data);
          // Atualiza o lastSavedRef para evitar salvar logo em seguida se nada mudou
          lastSavedRef.current = JSON.stringify(payload.data);
        }
      } catch (e) {
        console.error("Failed to parse/migrate autosave data", e);
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

      const payload: AutoSavePayload = {
        version: AUTOSAVE_SCHEMA_VERSION,
        data: data,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(key, JSON.stringify(payload));
      lastSavedRef.current = stringData;
      
      console.log(`[AutoSave] Quote saved to localStorage (v${AUTOSAVE_SCHEMA_VERSION})`);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, enabled, key, debounceMs]);

  const clearAutoSave = () => {
    localStorage.removeItem(key);
    lastSavedRef.current = "";
  };

  return { clearAutoSave };
}

