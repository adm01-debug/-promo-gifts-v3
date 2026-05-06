import { useState } from 'react';
import Fuse from 'fuse.js';
import { useDebounce } from '@/hooks/useDebounce';
import { dedupeById, createProductFuseOptions, rankProductSearchResults } from '@/utils/product-search';
import { mapQuoteSearchProduct, type Product } from '@/lib/quote/product-mapper';

export function useQuoteProductSearch() {
  const [productSearch, setProductSearch] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null);
  
  const debouncedProductSearch = useDebounce(productSearch, 400);

  const loadSearchProducts = async (search: string): Promise<Product[]> => {
    const { fetchPromobrindProducts, getProductImageUrl } = await import('@/lib/external-db');
    const normalizedSearch = search.trim();

    if (!normalizedSearch) {
      const productsData = await fetchPromobrindProducts({ limit: 20 });
      return productsData.map((p) => mapQuoteSearchProduct(p, getProductImageUrl));
    }

    const [prefixMatches, broadMatches] = await Promise.all([
      fetchPromobrindProducts({ filters: { _name_prefix: normalizedSearch }, limit: 200 }),
      fetchPromobrindProducts({ search: normalizedSearch, limit: 500 }),
    ]);

    const mergedProducts = dedupeById([...prefixMatches, ...broadMatches]).map((product) =>
      mapQuoteSearchProduct(product, getProductImageUrl),
    );
    const fuse = new Fuse(mergedProducts, createProductFuseOptions<Product>());

    return rankProductSearchResults(mergedProducts, normalizedSearch, fuse);
  };

  return {
    productSearch,
    setProductSearch,
    productSearchOpen,
    setProductSearchOpen,
    selectedProductForColor,
    setSelectedProductForColor,
    debouncedProductSearch,
    loadSearchProducts,
  };
}
