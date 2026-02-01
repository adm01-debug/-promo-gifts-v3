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

  /** Quantidade mínima (compatibilidade com telas antigas/mock). */
  minQuantity: number;

  // Dimensões físicas do produto
  dimensions?: {
    height_cm?: number | null;
    width_cm?: number | null;
    length_cm?: number | null;
    diameter_cm?: number | null;
    weight_g?: number | null;
  };

  // Campos adicionais para compatibilidade com componentes mock
  stockStatus: "in-stock" | "low-stock" | "out-of-stock";
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
    ramo: string[];
    nicho: string[];
  };

  // Campos opcionais (disponíveis apenas no dataset mock)
  subcategory?: string;
  groups?: Array<{ id: number; name: string }>;
  variations?: any[];
  kitItems?: any[];
  video?: string;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

// Cores base para detecção de grupo
const COLOR_GROUP_KEYWORDS: Record<string, string[]> = {
  'Azul': ['azul', 'blue', 'marinho', 'celeste', 'royal', 'turquesa', 'petróleo', 'navy'],
  'Verde': ['verde', 'green', 'limão', 'menta', 'musgo', 'oliva', 'esmeralda', 'lime'],
  'Vermelho': ['vermelho', 'red', 'bordô', 'vinho', 'cereja', 'coral', 'carmim', 'rubi'],
  'Amarelo': ['amarelo', 'yellow', 'dourado', 'ouro', 'gold', 'mostarda'],
  'Laranja': ['laranja', 'orange', 'tangerina', 'pêssego'],
  'Rosa': ['rosa', 'pink', 'magenta', 'fúcsia', 'salmão'],
  'Roxo': ['roxo', 'purple', 'lilás', 'violeta', 'lavanda', 'uva'],
  'Preto': ['preto', 'black', 'negro', 'grafite', 'chumbo'],
  'Branco': ['branco', 'white', 'off-white', 'creme', 'gelo', 'pérola', 'neve'],
  'Cinza': ['cinza', 'gray', 'grey', 'prata', 'silver', 'chumbo'],
  'Marrom': ['marrom', 'brown', 'chocolate', 'café', 'caramelo', 'bege', 'nude', 'areia', 'natural', 'palha', 'terra'],
  'Transparente': ['transparente', 'transparent', 'cristal', 'clear', 'incolor'],
};

function detectColorGroup(colorName: string): string {
  const nameLower = colorName.toLowerCase().trim();
  
  for (const [group, keywords] of Object.entries(COLOR_GROUP_KEYWORDS)) {
    if (keywords.some(kw => nameLower.includes(kw))) {
      return group;
    }
  }
  
  // Fallback: usar primeira palavra como grupo
  const firstWord = nameLower.split(/[\s-]+/)[0];
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

// Converte array de cores para formato padronizado
// Suporta arrays de strings ["Branco", "Azul"] ou objetos [{name, hex, group}]
function normalizeColors(colors: any[] | undefined): ProductColor[] {
  if (!colors || !Array.isArray(colors)) return [];
  
  return colors.map((c: any) => {
    // Se c é uma string simples (ex: "Branco"), converte para objeto
    if (typeof c === 'string') {
      const name = c || 'Sem cor';
      return {
        name,
        hex: '#CCCCCC', // Cor padrão - será substituída se disponível
        group: detectColorGroup(name),
      };
    }
    
    // Se c é um objeto com propriedades
    const name = c.name || c.color_name || 'Sem cor';
    const group = c.group || c.color_group || detectColorGroup(name);
    
    return {
      name,
      hex: c.hex || c.hex_code || c.color_hex || '#CCCCCC',
      group,
    };
  });
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

  // Mapear variações (cores com estoque e imagens) para o formato esperado pelo ProductGallery
  // A estrutura do p.colors quando vem enriquecida do external-db tem: name, hex, code, sku, stock, image, images
  const variations: any[] = [];
  if (p.colors && Array.isArray(p.colors)) {
    p.colors.forEach((c: any, index: number) => {
      if (typeof c === 'object' && c.name) {
        variations.push({
          id: `${p.id}-${index}`,
          sku: c.sku || p.sku,
          color: {
            name: c.name,
            hex: c.hex || '#CCCCCC',
          },
          stock: c.stock ?? 0,
          image: c.image || null,
          images: c.images || [],
          videos: [],
        });
      }
    });
  }
  
  return {
    id: p.id,
    name: p.name,
    description: p.description || p.short_description || p.meta_description,
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

    // Compat
    minQuantity: p.min_quantity || 1,
    stockStatus: getStockStatus(stock),
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category: {
      id: parseInt(p.category_id || p.main_category_id || "0") || 0,
      name: p.category_name || "Sem categoria",
    },
    supplier: {
      id: p.supplier_id || p.supplier_reference || p.brand || "unknown",
      name: p.supplier_name || p.brand || "Fornecedor",
    },
    tags: {
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
      ramo: [],
      nicho: [],
    },
    
    // Dimensões físicas
    dimensions: {
      height_cm: p.height_cm,
      width_cm: p.width_cm,
      length_cm: p.length_cm,
      diameter_cm: p.diameter_cm,
      weight_g: p.weight_g,
    },
    
    // Variações (para exibir estoque por cor e thumbnails na galeria)
    variations: variations.length > 0 ? variations : undefined,
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
        // Sem limite - busca todos os produtos
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
