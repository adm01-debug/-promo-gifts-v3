import { useQuery } from '@tanstack/react-query';
import { fetchPromobrindProductsLightweight, LightweightProduct, getProductPrice } from '@/lib/external-db';

/**
 * Produto leve para uso em seletores — sem cores, imagens ou variantes enriquecidas.
 * Carrega ~10x mais rápido que useProducts (sem enriquecimento de imagens/variantes/cores).
 */
export interface ProductLightweight {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string;
  stock: number;
  brand: string | null;
  category_id: string | null;
  is_active: boolean;
}

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
 * Ideal para seletores e buscas rápidas onde cores/imagens não são necessárias no listing.
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
