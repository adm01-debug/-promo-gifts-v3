// supabase/functions/_shared/external-db-cache.ts
// In-memory cache for reference tables (survives across requests within same isolate)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const REFERENCE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const referenceCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = referenceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > REFERENCE_CACHE_TTL_MS) {
    referenceCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  referenceCache.set(key, { data, timestamp: Date.now() });
}
