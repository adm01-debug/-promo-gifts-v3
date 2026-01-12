import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchPromobrindProducts, fetchPromobrindProductById, PromobrindProduct, getProductImageUrl, getProductPrice, getProductStock } from '@/lib/external-db';

// Tipo de cor compatível com o formato mock
export interface ProductColor {
  name: string;
  hex: string;
  group: string;
}

// Interface adaptada para compatibilidade com o sistema E componentes mock
export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  price: number;
  image_url?: string;
  images: string[];
  sku: string;
  stock: number;
  created_at?: string;
  updated_at?: string;
  colors: ProductColor[];
  materials: string[];
  supplier_reference?: string | null;
  brand?: string | null;
  is_active?: boolean;
  // Campos adicionais para compatibilidade com componentes mock
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  featured: boolean;
  newArrival: boolean;
  onSale: boolean;
  isKit: boolean;
  category: { id: number; name: string };
  supplier: { id: string; name: string };
  tags: {
    publicoAlvo: string[];
    datasComemorativas: string[];
    endomarketing: string[];
  };
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

// Converte array de cores para formato padronizado
function normalizeColors(colors: any[] | undefined): ProductColor[] {
  if (!colors || !Array.isArray(colors)) return [];
  
  return colors.map((c: any) => ({
    name: c.name || c.color_name || 'Sem cor',
    hex: c.hex || c.hex_code || c.color_hex || '#CCCCCC',
    group: c.group || c.color_group || c.name || 'Outros',
  }));
}

// Determina status do estoque baseado na quantidade
function getStockStatus(stock: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stock <= 0) return 'out-of-stock';
  if (stock < 10) return 'low-stock';
  return 'in-stock';
}

// Parse materials string to array
function parseMaterials(materials: any): string[] {
  if (!materials) return [];
  if (Array.isArray(materials)) return materials.filter(Boolean);
  if (typeof materials === 'string') {
    return materials.split(/[,;|]/).map(m => m.trim()).filter(Boolean);
  }
  return [];
}

// Converte produto Promobrind para formato interno
function mapPromobrindToProduct(p: PromobrindProduct): Product {
  const imageUrl = getProductImageUrl(p);
  const stock = getProductStock(p);
  const colors = normalizeColors(p.colors);
  
  // Extrair imagens do produto
  let images: string[] = [];
  if (p.images && Array.isArray(p.images)) {
    images = p.images.map((img: any) => {
      if (typeof img === 'string') return img;
      return img.url || img.src || img.image_url || '';
    }).filter(Boolean);
  }
  if (images.length === 0 && imageUrl) {
    images = [imageUrl];
  }
  if (images.length === 0) {
    images = ['/placeholder.svg'];
  }
  
  return {
    id: p.id,
    name: p.name,
    description: p.description || p.short_description,
    category_id: p.category_id || p.main_category_id,
    category_name: p.category_name || null,
    price: getProductPrice(p),
    image_url: images[0],
    images,
    sku: p.sku,
    stock,
    colors,
    materials: parseMaterials(p.materials),
    supplier_reference: p.supplier_reference,
    brand: p.brand,
    is_active: p.is_active || p.active,
    // Campos mock para compatibilidade
    stockStatus: getStockStatus(stock),
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category: { 
      id: parseInt(p.category_id || p.main_category_id || '0') || 0, 
      name: p.category_name || 'Sem categoria' 
    },
    supplier: { 
      id: p.supplier_reference || p.brand || 'unknown', 
      name: p.brand || 'Fornecedor' 
    },
    tags: {
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
    },
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
