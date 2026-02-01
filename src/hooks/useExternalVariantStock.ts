import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

export interface ExternalVariantStock {
  id: string;
  product_id: string;
  sku: string;
  supplier_sku: string | null;
  color_code: string | null;
  color_name: string | null;
  color_hex: string | null;
  stock_quantity: number | null;
  // Campos de próxima entrada (se existirem no schema do fornecedor)
  next_entry_date: string | null;
  next_entry_quantity: number | null;
  selected_thumbnail: string | null;
  images: string[] | null;
}

/**
 * Busca variantes de um produto do banco externo Promobrind
 * com informações de estoque e cores
 */
export function useExternalVariantStock(productId: string | undefined) {
  return useQuery({
    queryKey: ['external-variant-stock', productId],
    queryFn: async (): Promise<ExternalVariantStock[]> => {
      if (!productId) return [];

      const result = await invokeExternalDb<{
        id: string;
        product_id: string;
        sku: string;
        supplier_sku: string | null;
        color_code: string | null;
        color_name: string | null;
        color_hex: string | null;
        stock_quantity: number | null;
        selected_thumbnail: string | null;
        images: string[] | null;
        selected_images: string[] | null;
      }>({
        table: 'product_variants',
        operation: 'select',
        select: 'id, product_id, sku, supplier_sku, color_code, color_name, color_hex, stock_quantity, selected_thumbnail, images, selected_images',
        filters: { product_id: productId, is_active: true },
        limit: 100,
      });

      return result.records.map(v => ({
        ...v,
        // Por enquanto esses campos não existem no Promobrind,
        // mas deixamos preparado para quando forem adicionados
        next_entry_date: null,
        next_entry_quantity: null,
        images: v.selected_images?.length ? v.selected_images : v.images,
      }));
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
