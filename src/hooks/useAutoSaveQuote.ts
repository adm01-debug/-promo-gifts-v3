import { useEffect, useRef } from 'react';

// Versão atual do schema do payload de AutoSave
// Incrementar sempre que houver mudança que quebre rascunhos antigos
const AUTOSAVE_SCHEMA_VERSION = 2;

interface AutoSavePayload<T> {
  version: number;
  data: T;
  savedAt: string;
}

interface AutoSaveOptions<T> {
  enabled: boolean;
  data: T;
  onRestore?: (data: T) => void;
  debounceMs?: number;
  key?: string;
  onSaveServer?: (data: T) => Promise<boolean>;
}

/**
 * Migra dados de versões antigas para a versão atual.
 */
export function migratePayload<T>(
  payload: unknown,
  currentVersion: number = AUTOSAVE_SCHEMA_VERSION,
): AutoSavePayload<T> | null {
  if (!payload) return null;

  const typedPayload = payload as Record<string, unknown>;

  // Se for um payload antigo sem versão (v1)
  if (!typedPayload.version) {
    console.log('[AutoSave] Migrating from v1 to v2');
    return {
      version: currentVersion,
      data: payload as T, // Antigamente o payload era o próprio data
      savedAt: new Date().toISOString(),
    };
  }

  // Se a versão do payload for maior que a atual, tratamos como inseguro
  // e retornamos null para evitar corrupção de estado (o usuário perderá o rascunho, mas não quebrará o app)
  if (typedPayload.version > currentVersion) {
    console.warn(
      '[AutoSave] Future payload version detected, skipping restore to prevent state corruption',
    );
    return null;
  }

  // Adicione futuras migrações aqui:
  // if (typedPayload.version === 2) { ... migrate to 3 ... }

  return typedPayload as AutoSavePayload<T>;
}

/**
 * Hook para persistência automática de rascunhos no LocalStorage com versionamento.
 */
export function useAutoSaveQuote<T>({
  enabled,
  data,
  onRestore,
  debounceMs = 2000,
  key = 'quote_builder_autosave',
  onSaveServer,
}: AutoSaveOptions<T>) {
  const lastSavedRef = useRef<string>('');

  // Efeito de carregamento inicial (Restaurar)
  useEffect(() => {
    if (!enabled) return;

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const payload = JSON.parse(saved);

        // Aplica migrações se necessário
        const migrated = migratePayload<T>(payload);

        if (migrated && migrated.data && onRestore) {
          onRestore(migrated.data);
          // Atualiza o lastSavedRef para evitar salvar logo em seguida se nada mudou
          lastSavedRef.current = JSON.stringify(migrated.data);
        }
      } catch (e) {
        console.error('Failed to parse/migrate autosave data', e);
      }
    }
  }, [enabled, key, onRestore]); // Adicionado dependências seguras

  // Efeito de salvamento (Debounced)
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(async () => {
      const stringData = JSON.stringify(data);

      // Evita salvar se nada mudou
      if (stringData === lastSavedRef.current) return;

      const payload: AutoSavePayload<T> = {
        version: AUTOSAVE_SCHEMA_VERSION,
        data: data,
        savedAt: new Date().toISOString(),
      };

      // 1. LocalStorage (Instantâneo/Offline)
      localStorage.setItem(key, JSON.stringify(payload));
      lastSavedRef.current = stringData;

      // 2. Servidor (Opcional - Robusto)
      if (onSaveServer) {
        try {
          await onSaveServer(data);
        } catch (e) {
          console.warn('[AutoSave] Server-side draft sync failed (will retry next change)', e);
        }
      }

      console.log(`[AutoSave] Quote saved (v${AUTOSAVE_SCHEMA_VERSION})`);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, enabled, key, debounceMs, onSaveServer]);

  const clearAutoSave = () => {
    localStorage.removeItem(key);
    lastSavedRef.current = '';
  };

  return { clearAutoSave };
}
