import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchPromobrindProducts, fetchPromobrindProductById, PromobrindProduct, getProductImageUrl, getProductPrice, getProductStock } from '@/lib/external-db';

// Interface adaptada para compatibilidade com o sistema
export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  price: number;
  image_url?: string;
  images?: string[];
  sku: string;
  stock?: number | null;
  created_at?: string;
  updated_at?: string;
  colors?: any[];
  materials?: string | null;
  supplier_reference?: string | null;
  brand?: string | null;
  is_active?: boolean;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

// Converte produto Promobrind para formato interno
function mapPromobrindToProduct(p: PromobrindProduct): Product {
  const imageUrl = getProductImageUrl(p);
  return {
    id: p.id,
    name: p.name,
    description: p.description || p.short_description,
    category_id: p.category_id || p.main_category_id,
    category_name: null, // Schema não tem category_name
    price: getProductPrice(p),
    image_url: imageUrl ?? undefined,
    images: p.images || (imageUrl ? [imageUrl] : []),
    sku: p.sku,
    stock: getProductStock(p),
    colors: p.colors || [],
    materials: p.materials,
    supplier_reference: p.supplier_reference,
    brand: p.brand,
    is_active: p.is_active || p.active,
  };
}

/**
 * Hook para buscar produtos do banco Promobrind
 */
export function useProducts(
  filters?: ProductFilters,
  options?: Omit<UseQueryOptions<Product[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product[]>({
    queryKey: ['promobrind-products', filters],
    queryFn: async () => {
      const products = await fetchPromobrindProducts({
        search: filters?.search,
        limit: 500,
      });

      let result = products.map(mapPromobrindToProduct);

      // Aplicar filtros locais
      if (filters?.category) {
        result = result.filter(p => 
          p.category_name?.toLowerCase().includes(filters.category!.toLowerCase()) ||
          p.category_id === filters.category
        );
      }

      if (filters?.minPrice !== undefined) {
        result = result.filter(p => p.price >= filters.minPrice!);
      }

      if (filters?.maxPrice !== undefined) {
        result = result.filter(p => p.price <= filters.maxPrice!);
      }

      if (filters?.inStock) {
        result = result.filter(p => (p.stock || 0) > 0);
      }

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook para buscar um produto específico por ID
 */
export function useProduct(id: string) {
  return useQuery<Product | null>({
    queryKey: ['promobrind-product', id],
    queryFn: async () => {
      const product = await fetchPromobrindProductById(id);
      return product ? mapPromobrindToProduct(product) : null;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}
