import { useMemo, useRef } from 'react';
import Fuse, { IFuseOptions } from 'fuse.js';
import type { Product } from './useProducts';

/**
 * Configuração do Fuse.js otimizada para busca de produtos
 * - Busca tolerante a erros de digitação (ex: "garafa" encontra "garrafa")
 * - Prioriza SKU e nome sobre outros campos
 */
const fuseOptions: IFuseOptions<Product> = {
  keys: [
    { name: 'sku', weight: 0.35 },
    { name: 'name', weight: 0.30 },
    { name: 'supplier_reference', weight: 0.10 },
    { name: 'brand', weight: 0.08 },
    { name: 'category_name', weight: 0.07 },
    { name: 'description', weight: 0.05 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  findAllMatches: true,
  useExtendedSearch: false,
};

/**
 * Hook para busca fuzzy de produtos
 * Usa Fuse.js para encontrar produtos mesmo com erros de digitação
 * 
 * Otimizações:
 * - Fuse index é recriado apenas quando os produtos mudam (referência estável)
 * - Busca com debounce deve ser feita pelo consumidor (ex: useDebounce)
 * - Match exato de SKU tem prioridade máxima
 * 
 * @param products - Lista de produtos para buscar
 * @param searchQuery - Termo de busca (idealmente já com debounce)
 * @returns Produtos filtrados (ordenados por relevância se houver busca)
 */
export function useProductFuzzySearch(
  products: Product[],
  searchQuery: string
): { results: Product[]; hasSearch: boolean } {
  // Memoizar referência dos produtos para evitar recriações do Fuse.js index
  const productsRef = useRef<Product[]>([]);
  const fuseRef = useRef<Fuse<Product> | null>(null);

  // Recriar Fuse index apenas quando a lista de produtos realmente muda
  const fuse = useMemo(() => {
    // Comparar por referência — se o React Query retorna a mesma referência, não recria
    if (productsRef.current === products && fuseRef.current) {
      return fuseRef.current;
    }
    productsRef.current = products;
    const newFuse = new Fuse(products, fuseOptions);
    fuseRef.current = newFuse;
    return newFuse;
  }, [products]);

  // Executar busca
  return useMemo(() => {
    const query = searchQuery?.trim() || '';
    
    if (!query || query.length < 2) {
      return { results: products, hasSearch: false };
    }

    const queryLower = query.toLowerCase();

    // 1) Match exato de SKU
    const exactSkuMatch = products.filter(p => 
      (p.sku || '').toLowerCase() === queryLower
    );
    if (exactSkuMatch.length > 0) {
      return { results: exactSkuMatch, hasSearch: true };
    }

    // 2) Produtos cujo NOME contém o termo — separados por relevância
    const nameStartsWith: Product[] = [];
    const nameIsExactWord: Product[] = [];
    const nameContains: Product[] = [];

    for (const p of products) {
      const nameLower = p.name.toLowerCase();
      if (nameLower.startsWith(queryLower)) {
        // Nome começa com o termo (ex: "CHAVEIRO DE METAL")
        nameStartsWith.push(p);
      } else {
        // Verificar se o termo aparece como palavra inteira (ex: "CANETA E CHAVEIRO")
        const wordBoundary = new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordBoundary.test(p.name)) {
          nameIsExactWord.push(p);
        } else if (nameLower.includes(queryLower)) {
          nameContains.push(p);
        }
      }
    }

    // 3) Busca fuzzy para pegar variações/erros de digitação (só resultados relevantes)
    const fuseResults = fuse.search(query);
    const fuzzyItems = fuseResults
      .filter(r => (r.score ?? 1) < 0.45)
      .map(r => r.item);

    // 4) Ordenar cada grupo pela posição do termo no nome (mais cedo = mais relevante)
    const sortByPosition = (arr: Product[]) =>
      arr.sort((a, b) => {
        const posA = a.name.toLowerCase().indexOf(queryLower);
        const posB = b.name.toLowerCase().indexOf(queryLower);
        return (posA === -1 ? 9999 : posA) - (posB === -1 ? 9999 : posB);
      });

    sortByPosition(nameStartsWith);
    sortByPosition(nameIsExactWord);
    sortByPosition(nameContains);

    // 5) Mesclar por ordem de relevância (sem duplicatas):
    //    começa com > palavra exata > contém > fuzzy
    const seenIds = new Set<string>();
    const combined: Product[] = [];

    for (const group of [nameStartsWith, nameIsExactWord, nameContains, fuzzyItems]) {
      for (const p of group) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          combined.push(p);
        }
      }
    }

    return { results: combined, hasSearch: true };
  }, [products, searchQuery, fuse]);
}

/**
 * Função utilitária para verificar se uma busca parece ser um código de produto
 * (números ou combinação específica de letras+números)
 */
export function looksLikeProductCode(query: string): boolean {
  const trimmed = query.trim();
  return /^\d+$/.test(trimmed) || /^[A-Za-z]{1,4}\d+$/.test(trimmed);
}
