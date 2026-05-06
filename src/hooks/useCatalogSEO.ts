import { useMemo } from 'react';
import type { Product } from '@/hooks/useProducts';

export function useCatalogSEO(
  searchQuery: string,
  filteredProducts: Product[],
  totalEstimate: number | null,
  paginatedProducts: Product[]
) {
  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: searchQuery
        ? `Resultados para "${searchQuery}" - Catálogo`
        : 'Catálogo de Brindes Promocionais',
      description: searchQuery
        ? `Encontramos ${filteredProducts.length} brindes promocionais para sua busca "${searchQuery}".`
        : 'Explore nosso catálogo com mais de 15.000 brindes personalizáveis. Filtre por categoria, material, cor e preço.',
      url: window.location.href,
      numberOfItems: totalEstimate || filteredProducts.length,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: paginatedProducts.slice(0, 10).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${window.location.origin}/produto/${p.id}`,
          name: p.name,
        })),
      },
    }),
    [searchQuery, filteredProducts.length, totalEstimate, paginatedProducts]
  );

  return {
    title: searchQuery ? `Busca: ${searchQuery}` : 'Catálogo de Produtos',
    description: searchQuery
      ? `Resultados de busca para ${searchQuery} em Brindes Promocionais. Melhores preços e variedades.`
      : 'Explore nosso catálogo com mais de 15.000 brindes promocionais. Filtre por categoria, cor e preço.',
    structuredData
  };
}
