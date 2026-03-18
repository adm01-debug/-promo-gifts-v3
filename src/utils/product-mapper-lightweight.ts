/**
 * Lightweight Product Mapper
 * 
 * Maps LightweightProduct → Product with minimal fields for catalog grid display.
 * ~10x faster than full mapPromobrindToProduct since it skips enrichment.
 */
import type { Product } from '@/types/product';
import type { LightweightProduct } from '@/lib/external-db';

function getStockStatus(stock: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stock <= 0) return 'out-of-stock';
  if (stock < 10) return 'low-stock';
  return 'in-stock';
}

export function mapLightweightToProduct(p: LightweightProduct): Product {
  const imageUrl = p.primary_image_url || p.image_url || '/placeholder.svg';
  const price = p.sale_price ?? p.cost_price ?? 0;
  const stock = p.stock_quantity || 0;

  return {
    id: p.id,
    name: p.name,
    description: '',
    category_id: p.category_id || p.main_category_id,
    category_name: null,
    price,
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
