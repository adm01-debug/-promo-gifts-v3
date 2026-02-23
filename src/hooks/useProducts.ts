import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchPromobrindProducts, fetchPromobrindProductById, PromobrindProduct, getProductImageUrl, getProductPrice, getProductStock } from '@/lib/external-db';

// Tipo de cor compatível com o formato mock
export interface ProductColor {
  name: string;
  hex: string;
  group: string;
  /** Slug do grupo de cor vindo do banco (ex: "rosa", "azul") */
  groupSlug?: string;
  /** Slug da variação de cor vindo do banco (ex: "rosa-flamingo", "azul-marinho") */
  variationSlug?: string;
  /** Código do fornecedor (supplier_code) — usado para vincular imagens à cor */
  code?: string;
  /** Imagem principal desta cor (thumbnail da variante) */
  image?: string;
  /** Todas as imagens desta cor */
  images?: string[];
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
  /** Briefing v3: imagem OG (is_og_image=true, cor individual) para cards e compartilhamento */
  og_image_url?: string;
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
    capacity_ml?: number | null;
  };

  // Campos de embalagem especial
  packingType?: string | null;
  packingClassification?: string | null;
  hasCommercialPackaging?: boolean | null;
  repackingType?: string | null;
  packagingContext?: 'always' | 'with_customization' | 'without_customization' | null;
  boxImage?: string | null;
  boxWidthMm?: number | null;
  boxHeightMm?: number | null;
  boxLengthMm?: number | null;
  boxWeightKg?: number | null;
  boxQuantity?: number | null;
  boxVolumeCm3?: number | null;

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
  'Verde': ['verde', 'green', 'limão', 'menta', 'musgo', 'oliva', 'esmeralda', 'lime', 'neon'],
  'Vermelho': ['vermelho', 'red', 'bordô', 'vinho', 'cereja', 'coral', 'carmim', 'rubi'],
  'Amarelo': ['amarelo', 'yellow', 'dourado', 'ouro', 'gold', 'mostarda'],
  'Laranja': ['laranja', 'orange', 'tangerina', 'pêssego'],
  'Rosa': ['rosa', 'pink', 'magenta', 'fúcsia', 'salmão', 'flamingo', 'rosa bebê'],
  'Roxo': ['roxo', 'purple', 'lilás', 'violeta', 'lavanda', 'uva'],
  'Preto': ['preto', 'black', 'negro', 'grafite', 'chumbo'],
  'Branco': ['branco', 'white', 'off-white', 'creme', 'gelo', 'pérola', 'neve'],
  'Cinza': ['cinza', 'gray', 'grey', 'prata', 'silver', 'acetinado', 'fosco', 'cromado'],
  'Marrom': ['marrom', 'brown', 'chocolate', 'café', 'caramelo', 'bege', 'nude', 'areia', 'natural', 'palha', 'terra'],
  'Transparente': ['transparente', 'transparent', 'cristal', 'clear', 'incolor'],
};

// Mapeamento de cores conhecidas para hexadecimais (para fallback quando a API não retorna hex)
const KNOWN_COLOR_HEX: Record<string, string> = {
  // Cores básicas
  'preto': '#000000',
  'branco': '#FFFFFF',
  'cinza': '#808080',
  'cinza claro': '#C0C0C0',
  'cinza grafite': '#2F2F2F',
  
  // Azuis
  'azul': '#0000FF',
  'azul royal': '#4169E1',
  'azul marinho': '#000080',
  'azul celeste': '#87CEEB',
  'azul petróleo': '#0D4F5C',
  
  // Vermelhos
  'vermelho': '#FF0000',
  'vermelho bordô': '#800020',
  'vinho': '#722F37',
  
  // Verdes
  'verde': '#008000',
  'verde neon': '#39FF14',
  'verde claro': '#90EE90',
  'verde musgo': '#556B2F',
  'verde militar': '#4B5320',
  
  // Amarelos
  'amarelo': '#FFFF00',
  'dourado': '#FFD700',
  'mostarda': '#FFDB58',
  
  // Laranjas
  'laranja': '#EF941B',
  'coral': '#FF7F50',
  'salmão': '#FA8072',
  
  // Rosas
  'rosa': '#FFC0CB',
  'rosa flamingo': '#FC8EAC',
  'rosa bebê': '#F4C2C2',
  'magenta': '#FF00FF',
  'fúcsia': '#FF00FF',
  
  // Roxos
  'roxo': '#800080',
  'lilás': '#C8A2C8',
  'violeta': '#EE82EE',
  'lavanda': '#E6E6FA',
  
  // Marrons e beges
  'marrom': '#8B4513',
  'bege': '#F5F5DC',
  'bege palha': '#CCAA92',
  'natural': '#BB8B64',
  'nude': '#E3BC9A',
  'caramelo': '#FFD59A',
  'chocolate': '#7B3F00',
  'café': '#6F4E37',
  
  // Metálicos
  'prata': '#C0C0C0',
  'prata cromado': '#D8DBDE',
  'prata acetinado (fosco)': '#868686',
  'cromado': '#E8E8E8',
  'ouro': '#FFD700',
};

// Busca hex em mapeamento conhecido
export function findKnownHex(colorName: string): string | null {
  if (!colorName) return null;
  const nameLower = colorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  // Busca exata
  for (const [key, hex] of Object.entries(KNOWN_COLOR_HEX)) {
    const keyNormalized = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (keyNormalized === nameLower) {
      return hex;
    }
  }
  
  // Busca parcial - nome contém a cor conhecida
  for (const [key, hex] of Object.entries(KNOWN_COLOR_HEX)) {
    const keyNormalized = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (nameLower.includes(keyNormalized) || keyNormalized.includes(nameLower)) {
      return hex;
    }
  }
  
  return null;
}

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
      // Tenta encontrar hex em mapeamento conhecido
      const knownHex = findKnownHex(name);
      return {
        name,
        hex: knownHex || '#CCCCCC',
        group: detectColorGroup(name),
        code: undefined,
      };
    }
    
    // Se c é um objeto com propriedades
    const name = c.name || c.color_name || 'Sem cor';
    // Priorizar grupo vindo do banco de dados (groupSlug/groupName) sobre keyword detection
    const groupSlug = c.groupSlug || undefined;
    const variationSlug = c.variationSlug || undefined;
    const group = c.groupName || c.group || c.color_group || detectColorGroup(name);
    
    // Prioriza hex do objeto, depois busca em mapeamento conhecido
    let hex = c.hex || c.hex_code || c.color_hex;
    if (!hex || hex === '#CCCCCC') {
      const knownHex = findKnownHex(name);
      if (knownHex) hex = knownHex;
    }
    
    const code = c.code || c.color_code || c.supplier_code || undefined;
    
    // Preservar imagem e imagens da cor (vêm do enriquecimento em external-db)
    const image = c.image || undefined;
    const images = c.images?.length ? c.images : undefined;
    
    return {
      name,
      hex: hex || '#CCCCCC',
      group,
      groupSlug,
      variationSlug,
      code,
      image,
      images,
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
    og_image_url: p.og_image_url || undefined,
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
      capacity_ml: p.capacity_ml,
    },
    
    // Campos de embalagem especial
    packingType: p.packing_type,
    packingClassification: p.packing_classification,
    hasCommercialPackaging: p.has_commercial_packaging,
    repackingType: p.repacking_type,
    packagingContext: p.packaging_context as Product['packagingContext'],
    boxImage: p.box_image,
    boxWidthMm: p.box_width_mm,
    boxHeightMm: p.box_height_mm,
    boxLengthMm: p.box_length_mm,
    boxWeightKg: p.box_weight_kg,
    boxQuantity: p.box_quantity,
    boxVolumeCm3: p.box_volume_cm3,
    
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
