import { findKnownHex } from '@/hooks/useProducts';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[] | null;
  colors?: { name: string; hex?: string; stock?: number }[];
  minQuantity?: number;
  totalStock?: number;
}

interface RawProductColor {
  name?: string;
  hex?: string;
  stock?: number;
}

export function mapQuoteSearchProduct(
  p: any, // PromobrindProduct type
  getProductImageUrl: (product: any) => string | null,
): Product {
  const imgUrl = getProductImageUrl(p);
  const images = p.images && p.images.length > 0 ? p.images : imgUrl ? [imgUrl] : [];

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.sale_price ?? p.base_price ?? 0,
    images,
    colors: (p.colors || []).map((c: string | RawProductColor) => {
      const name = typeof c === 'string' ? c : c.name || '';
      const hex = (typeof c === 'string' ? undefined : c.hex) || findKnownHex(name) || undefined;
      return { name, hex, stock: typeof c === 'string' ? undefined : c.stock };
    }),
    minQuantity: p.min_quantity ?? 1,
    totalStock:
      p.stock_quantity ??
      (p.colors || []).reduce(
        (sum: number, c: string | RawProductColor) =>
          sum + (typeof c === 'object' ? (c.stock ?? 0) : 0),
        0,
      ),
  };
}
