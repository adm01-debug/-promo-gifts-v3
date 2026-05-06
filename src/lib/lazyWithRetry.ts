import { lazy, type ComponentType } from 'react';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import { attemptChunkRecovery, isChunkLoadError } from '@/lib/chunk-recovery';

const log = createClientLogger('lib.lazyWithRetry');


/**
 * Wrapper around React.lazy that retries on chunk loading failures.
 * Handles stale cache issues after deployments and Vite 502 spikes.
 *
 * Camadas de defesa:
 *   1. Retry in-memory com backoff (até `retries` tentativas) — cobre
 *      blip de rede curto sem incomodar o usuário.
 *   2. Após retries esgotados, delega para `attemptChunkRecovery`, que faz
 *      hard-reload com cache-bust + purga de Service Worker / Cache API.
 *      Se já estourou o limite de reloads na janela, propaga o erro para
 *      a Error Boundary exibir tela estável (evita loop = tela branca).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1000,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        const component = await componentImport();
        return component;
      } catch (error) {
        lastError = error as Error;
        log.warn('load_attempt_failed', { attempt: i + 1, retries, error });

        if (isChunkLoadError(error)) {
          log.info('retrying_chunk_load', { attempt: i + 1, retries });
          await new Promise((resolve) => setTimeout(resolve, interval * (i + 1)));

          // Última tentativa: aciona recovery agressivo (hard reload + cache bust).
          if (i === retries - 1) {
            const reloaded = await attemptChunkRecovery(error);
            if (reloaded) {
              // Aguarda navegação — devolve promise pendente para a Suspense.
              return new Promise(() => {});
            }
            // Recovery atingiu o limite — propaga para a Error Boundary.
            throw error;
          }
        } else {
          // Re-throw non-chunk errors immediately
          throw error;
        }
      }
    }

    // Should never reach here, but just in case
    throw lastError;
  });
}
