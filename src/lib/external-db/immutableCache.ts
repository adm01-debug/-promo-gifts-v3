/**
 * In-memory client cache for immutable-ish reference entities
 * (categories, suppliers, material_types) during a navigation session.
 *
 * Goals:
 *  - Eliminate repeated bridge calls for the same id during a session.
 *  - Allow batch lookup: pass a list of ids → returns cached map + only
 *    fetches the missing ones in a single `id=in.(...)` request.
 *  - Cheap TTL so long-lived tabs eventually refresh.
 *
 * Not persisted to localStorage on purpose: keeps things simple and avoids
 * staleness across deploys / data fixes.
 */
import { invokeExternalDb } from './bridge';
import { logger } from '@/lib/logger';

type Entity = 'categories' | 'suppliers' | 'material_types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes — refs change rarely
const INFLIGHT = new Map<string, Promise<unknown>>();
const STORE: Record<Entity, Map<string, CacheEntry<{ id: string; name: string; code?: string }>>> = {
  categories: new Map(),
  suppliers: new Map(),
  material_types: new Map(),
};

function now() { return Date.now(); }

function getFresh<T extends { id: string; name: string; code?: string }>(
  entity: Entity,
  id: string,
): T | undefined {
  const e = STORE[entity].get(id);
  if (!e) return undefined;
  if (e.expiresAt < now()) { STORE[entity].delete(id); return undefined; }
  return e.value as T;
}

function put(entity: Entity, rec: { id: string; name: string; code?: string }) {
  STORE[entity].set(rec.id, { value: rec, expiresAt: now() + TTL_MS });
}

const SELECT_BY_ENTITY: Record<Entity, string> = {
  categories: 'id, name',
  suppliers: 'id, name, code',
  material_types: 'id, name',
};

/**
 * Returns a Map<id, record> for the requested ids, fetching only the missing
 * ones in a single bridge call. De-duplicates concurrent requests via INFLIGHT.
 */
export async function getCachedByIds<T extends { id: string; name: string; code?: string }>(
  entity: Entity,
  ids: string[],
): Promise<Map<string, T>> {
  const out = new Map<string, T>();
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    const hit = getFresh<T>(entity, raw);
    if (hit) out.set(raw, hit);
    else missing.push(raw);
  }

  if (missing.length === 0) return out;

  const key = `${entity}::${[...missing].sort().join(',')}`;
  const inflight = INFLIGHT.get(key) as Promise<T[]> | undefined;
  let records: T[];
  if (inflight) {
    records = await inflight;
  } else {
    const p = (async () => {
      const inFilter = `in.(${missing.join(',')})`;
      const res = await invokeExternalDb<T>({
        table: entity, operation: 'select',
        select: SELECT_BY_ENTITY[entity],
        filters: { id: inFilter },
        limit: Math.max(missing.length, 20),
      });
      return res.records as T[];
    })().catch((err) => {
      logger.warn(`[immutableCache] fetch failed for ${entity}:`, err);
      return [] as T[];
    }).finally(() => { INFLIGHT.delete(key); });
    INFLIGHT.set(key, p as Promise<unknown>);
    records = await p;
  }

  for (const rec of records) {
    if (rec?.id) {
      put(entity, rec);
      out.set(rec.id, rec);
    }
  }
  return out;
}

/** Convenience for a single id. */
export async function getCachedById<T extends { id: string; name: string; code?: string }>(
  entity: Entity,
  id: string,
): Promise<T | undefined> {
  const map = await getCachedByIds<T>(entity, [id]);
  return map.get(id);
}

/** Manual invalidation (useful after admin edits). */
export function invalidateImmutableCache(entity?: Entity) {
  if (entity) STORE[entity].clear();
  else { STORE.categories.clear(); STORE.suppliers.clear(); STORE.material_types.clear(); }
}

/** Debug snapshot. */
export function immutableCacheStats() {
  return {
    categories: STORE.categories.size,
    suppliers: STORE.suppliers.size,
    material_types: STORE.material_types.size,
  };
}
