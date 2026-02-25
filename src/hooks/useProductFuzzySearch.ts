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
  threshold: 0.35,
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

    // 2) Produtos cujo NOME contém o termo (prioridade máxima)
    const nameMatches = products.filter(p =>
      p.name.toLowerCase().includes(queryLower)
    );

    // 3) Busca fuzzy para pegar variações/erros de digitação
    const fuseResults = fuse.search(query);
    const fuzzyItems = fuseResults.map(r => r.item);

    // 4) Mesclar: nome exato primeiro, depois fuzzy (sem duplicatas)
    const seenIds = new Set(nameMatches.map(p => p.id));
    const combined = [
      ...nameMatches,
      ...fuzzyItems.filter(p => !seenIds.has(p.id)),
    ];

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
