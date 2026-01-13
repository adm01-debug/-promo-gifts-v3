import { useMemo } from 'react';
import Fuse, { IFuseOptions } from 'fuse.js';

/**
 * Hook para busca fuzzy (tolerante a erros de digitação)
 * Usa Fuse.js para encontrar resultados mesmo com typos
 * 
 * @param items - Array de itens para buscar
 * @param query - Termo de busca
 * @param keys - Campos para buscar (com peso opcional)
 * @param options - Opções adicionais do Fuse.js
 */
export function useFuzzySearch<T>(
  items: T[],
  query: string,
  keys: (keyof T | { name: keyof T; weight: number })[],
  options?: Partial<IFuseOptions<T>>
): T[] {
  const fuse = useMemo(() => {
    const fuseKeys = keys.map((key) => {
      if (typeof key === 'object') {
        return { name: key.name as string, weight: key.weight };
      }
      return key as string;
    });

    return new Fuse(items, {
      keys: fuseKeys,
      threshold: 0.4, // 0 = match exato, 1 = match qualquer coisa
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      ...options,
    });
  }, [items, keys, options]);

  return useMemo(() => {
    if (!query || query.length < 2) {
      return items;
    }

    const results = fuse.search(query);
    return results.map((r) => r.item);
  }, [fuse, query, items]);
}

/**
 * Versão simplificada para buscas com campos de string
 */
export function useSimpleFuzzySearch<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  searchFields: (keyof T)[]
): T[] {
  return useFuzzySearch(items, query, searchFields);
}
