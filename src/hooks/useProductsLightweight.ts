/**
 * useProductsLightweight — Minimal product data for selectors
 * 
 * Loads ~10x faster than useProducts (no color/variant enrichment).
 */
import { useQuery } from '@tanstack/react-query';
import { fetchPromobrindProductsLightweight, LightweightProduct } from '@/lib/external-db';

// Re-export type for consumers
export type { ProductLightweight } from '@/types/product-catalog';
import type { ProductLightweight } from '@/types/product-catalog';

function mapLightweight(p: LightweightProduct): ProductLightweight {
  const price = (p.sale_price ?? p.cost_price ?? 0);
  const imageUrl = p.primary_image_url || p.image_url || '/placeholder.svg';

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: typeof price === 'number' ? price : 0,
    image_url: imageUrl,
    stock: p.stock_quantity ?? 0,
    brand: p.brand,
    category_id: p.category_id || p.main_category_id,
    is_active: p.is_active || p.active,
  };
}

/**
 * Hook leve para buscar lista de produtos com campos mínimos.
 */
export function useProductsLightweight() {
  return useQuery<ProductLightweight[]>({
    queryKey: ['promobrind-products-lightweight'],
    queryFn: async () => {
      const products = await fetchPromobrindProductsLightweight();
      return products.map(mapLightweight);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
