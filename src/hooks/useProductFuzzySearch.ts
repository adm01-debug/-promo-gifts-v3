import { useMemo } from 'react';
import Fuse, { IFuseOptions } from 'fuse.js';
import type { Product } from './useProducts';

/**
 * Configuração do Fuse.js otimizada para busca de produtos
 * - Busca tolerante a erros de digitação (ex: "garafa" encontra "garrafa")
 * - Prioriza SKU e nome sobre outros campos
 */
const fuseOptions: IFuseOptions<Product> = {
  keys: [
    { name: 'sku', weight: 0.35 },                    // SKU tem maior peso
    { name: 'name', weight: 0.30 },                   // Nome é segundo
    { name: 'supplier_reference', weight: 0.10 },     // Ref. fornecedor
    { name: 'brand', weight: 0.08 },                  // Marca
    { name: 'category_name', weight: 0.07 },          // Categoria
    { name: 'description', weight: 0.05 },            // Descrição
    { name: 'short_description', weight: 0.05 },      // Descrição curta
  ],
  threshold: 0.35,           // 0 = exato, 1 = muito tolerante. 0.35 = bom equilíbrio
  distance: 100,             // Distância máxima entre caracteres
  includeScore: true,        // Inclui score para ordenação
  minMatchCharLength: 2,     // Mínimo 2 caracteres
  ignoreLocation: true,      // Busca em qualquer posição do texto
  findAllMatches: true,      // Encontra todos os matches
  useExtendedSearch: false,  // Desabilitado para manter simplicidade
};

/**
 * Hook para busca fuzzy de produtos
 * Usa Fuse.js para encontrar produtos mesmo com erros de digitação
 * 
 * @param products - Lista de produtos para buscar
 * @param searchQuery - Termo de busca
 * @returns Produtos filtrados (ordenados por relevância se houver busca)
 */
export function useProductFuzzySearch(
  products: Product[],
  searchQuery: string
): { results: Product[]; hasSearch: boolean } {
  // Pré-processar produtos para incluir campo de materiais como string
  const enrichedProducts = useMemo(() => {
    return products.map(p => ({
      ...p,
      // Criar campo searchable_materials para busca
      searchable_materials: Array.isArray(p.materials) 
        ? p.materials.join(' ') 
        : (p.materials || ''),
      // Adicionar nome do fornecedor como campo buscável
      supplier_name: p.supplier?.name || '',
    }));
  }, [products]);

  // Criar instância do Fuse com campos adicionais
  const fuse = useMemo(() => {
    const extendedOptions: IFuseOptions<typeof enrichedProducts[0]> = {
      ...fuseOptions,
      keys: [
        ...(fuseOptions.keys as any[]),
        { name: 'searchable_materials', weight: 0.05 },
        { name: 'supplier_name', weight: 0.05 },
      ],
    };
    return new Fuse(enrichedProducts, extendedOptions);
  }, [enrichedProducts]);

  // Executar busca
  const results = useMemo(() => {
    const query = searchQuery?.trim() || '';
    
    if (!query || query.length < 2) {
      // Sem busca ou termo muito curto: retorna todos
      return { results: products, hasSearch: false };
    }

    // Primeiro: tentar match exato de SKU (alta prioridade)
    const exactSkuMatch = products.filter(p => 
      (p.sku || '').toLowerCase() === query.toLowerCase()
    );
    
    if (exactSkuMatch.length > 0) {
      // Se encontrou SKU exato, retorna só ele
      return { results: exactSkuMatch, hasSearch: true };
    }

    // Segundo: busca fuzzy
    const fuseResults = fuse.search(query);
    
    // Mapear resultados de volta para Product (sem campos extras)
    const mappedResults = fuseResults.map(r => {
      const { searchable_materials, supplier_name, ...originalProduct } = r.item;
      return originalProduct as Product;
    });

    // Se fuzzy não encontrou nada, tentar busca parcial clássica como fallback
    if (mappedResults.length === 0) {
      const queryLower = query.toLowerCase();
      const fallbackResults = products.filter(p => {
        if ((p.sku || '').toLowerCase().includes(queryLower)) return true;
        if ((p.supplier_reference || '').toLowerCase().includes(queryLower)) return true;
        if (p.name.toLowerCase().includes(queryLower)) return true;
        if ((p.brand || '').toLowerCase().includes(queryLower)) return true;
        return false;
      });
      return { results: fallbackResults, hasSearch: true };
    }

    return { results: mappedResults, hasSearch: true };
  }, [products, searchQuery, fuse]);

  return results;
}

/**
 * Função utilitária para verificar se uma busca parece ser um código de produto
 * (números ou combinação específica de letras+números)
 */
export function looksLikeProductCode(query: string): boolean {
  const trimmed = query.trim();
  // Padrão: apenas números, ou letras seguidas de números
  return /^\d+$/.test(trimmed) || /^[A-Za-z]{1,4}\d+$/.test(trimmed);
}
