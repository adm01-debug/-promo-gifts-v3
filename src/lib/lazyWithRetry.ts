import { lazy, ComponentType } from 'react';
import { logger } from "@/lib/logger";

/**
 * Wrapper around React.lazy that retries on chunk loading failures.
 * Handles stale cache issues after deployments.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | undefined;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a chunk loading error
        const isChunkError = 
          error instanceof Error && 
          (error.message.includes('Failed to fetch dynamically imported module') ||
           error.message.includes('Loading chunk') ||
           error.message.includes('ChunkLoadError'));
        
        if (isChunkError) {
          logger.warn(`Chunk load failed (attempt ${i + 1}/${retries}), retrying...`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, interval));
          
          // On last retry, force reload the page to get fresh chunks
          if (i === retries - 1) {
            logger.warn('All retries failed, reloading page to get fresh chunks...');
            window.location.reload();
            // Return a never-resolving promise since we're reloading
            return new Promise(() => {});
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
