/**
 * useProductsLightweight — Minimal product data for selectors & catalog
 * 
 * Loads ~10x faster than useProducts (no color/variant enrichment).
 */
import { useQuery } from '@tanstack/react-query';
import { fetchPromobrindProductsLightweight, LightweightProduct } from '@/lib/external-db';

// Re-export type for consumers
export type { ProductLightweight } from '@/types/product-catalog';
import type { ProductLightweight } from '@/types/product-catalog';
import type { Product } from '@/types/product';

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

function getStockStatus(stock: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stock <= 0) return 'out-of-stock';
  if (stock < 10) return 'low-stock';
  return 'in-stock';
}

function mapLightweightToProduct(p: LightweightProduct): Product {
  const imageUrl = p.primary_image_url || p.image_url || '/placeholder.svg';
  const price = p.sale_price ?? p.cost_price ?? 0;
  const stock = p.stock_quantity || 0;

  return {
    id: p.id,
    name: p.name,
    description: '',
    category_id: p.category_id || p.main_category_id,
    category_name: null,
    price: typeof price === 'number' ? price : 0,
    image_url: imageUrl,
    images: [imageUrl],
    sku: p.sku,
    stock,
    colors: [],
    materials: [],
    supplier_reference: undefined,
    brand: p.brand,
    is_active: p.is_active || p.active,
    minQuantity: p.min_quantity || 1,
    stockStatus: getStockStatus(stock),
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category: {
      id: parseInt(p.category_id || p.main_category_id || "0") || 0,
      name: "Sem categoria",
    },
    supplier: {
      id: p.supplier_id || p.brand || "unknown",
      name: p.brand || "Fornecedor",
    },
    tags: {
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
      ramo: [],
      nicho: [],
    },
    dimensions: {},
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

/**
 * Hook leve que retorna Product[] — para uso no catálogo/Index.
 * ~10x mais rápido que useProducts (sem enriquecimento de cores/imagens/variantes).
 */
export function useProductsCatalog(filters?: { search?: string }) {
  return useQuery<Product[]>({
    queryKey: ['promobrind-products-catalog', filters?.search || ''],
    queryFn: async () => {
      const products = await fetchPromobrindProductsLightweight({
        search: filters?.search,
      });
      return products.map(mapLightweightToProduct);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
