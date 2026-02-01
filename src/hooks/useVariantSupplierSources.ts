import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

/**
 * Dados de estoque e previsão de reposição do fornecedor
 * Tabela: variant_supplier_sources (BD externo Promobrind)
 */
export interface VariantSupplierSource {
  id: string;
  variant_id: string;
  supplier_id: string;
  supplier_sku: string;
  quantity: number;
  reserved_quantity: number;
  // Previsão de reposição 1
  next_quantity_1: number | null;
  next_date_1: string | null;
  // Previsão de reposição 2
  next_quantity_2: number | null;
  next_date_2: string | null;
  // Previsão de reposição 3
  next_quantity_3: number | null;
  next_date_3: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Busca dados de estoque e previsões de reposição para uma variante específica
 */
export function useVariantSupplierSource(variantId: string | undefined) {
  return useQuery({
    queryKey: ['variant-supplier-source', variantId],
    queryFn: async (): Promise<VariantSupplierSource | null> => {
      if (!variantId) return null;

      const result = await invokeExternalDb<VariantSupplierSource>({
        table: 'variant_supplier_sources',
        operation: 'select',
        filters: { variant_id: variantId, is_active: true },
        limit: 1,
      });

      return result.records[0] || null;
    },
    enabled: !!variantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Busca dados de estoque e previsões de reposição para múltiplas variantes (por produto)
 */
export function useVariantSupplierSourcesByVariantIds(variantIds: string[]) {
  return useQuery({
    queryKey: ['variant-supplier-sources', variantIds],
    queryFn: async (): Promise<VariantSupplierSource[]> => {
      if (!variantIds.length) return [];

      const result = await invokeExternalDb<VariantSupplierSource>({
        table: 'variant_supplier_sources',
        operation: 'select',
        filters: { is_active: true },
        limit: 500,
      });

      // Filtrar pelo array de variant_ids no cliente
      return result.records.filter(r => variantIds.includes(r.variant_id));
    },
    enabled: variantIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Interface para dados combinados de variante + estoque + previsão
 */
export interface VariantWithStock {
  variantId: string;
  sku: string;
  supplierSku: string;
  colorName: string | null;
  colorHex: string | null;
  thumbnail: string | null;
  // Estoque
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  // Previsões
  nextEntries: {
    quantity: number;
    date: string;
  }[];
}

/**
 * Combina dados de variantes externas com dados de estoque/reposição
 */
export function combineVariantWithStock(
  variant: {
    id: string;
    sku: string;
    supplier_sku: string | null;
    color_name: string | null;
    color_hex: string | null;
    selected_thumbnail: string | null;
    stock_quantity: number | null;
  },
  supplierSource: VariantSupplierSource | null
): VariantWithStock {
  const nextEntries: { quantity: number; date: string }[] = [];

  if (supplierSource) {
    if (supplierSource.next_quantity_1 && supplierSource.next_date_1) {
      nextEntries.push({
        quantity: supplierSource.next_quantity_1,
        date: supplierSource.next_date_1,
      });
    }
    if (supplierSource.next_quantity_2 && supplierSource.next_date_2) {
      nextEntries.push({
        quantity: supplierSource.next_quantity_2,
        date: supplierSource.next_date_2,
      });
    }
    if (supplierSource.next_quantity_3 && supplierSource.next_date_3) {
      nextEntries.push({
        quantity: supplierSource.next_quantity_3,
        date: supplierSource.next_date_3,
      });
    }
  }

  const currentStock = supplierSource?.quantity ?? variant.stock_quantity ?? 0;
  const reservedStock = supplierSource?.reserved_quantity ?? 0;

  return {
    variantId: variant.id,
    sku: variant.sku,
    supplierSku: variant.supplier_sku ?? variant.sku,
    colorName: variant.color_name,
    colorHex: variant.color_hex,
    thumbnail: variant.selected_thumbnail,
    currentStock,
    reservedStock,
    availableStock: Math.max(0, currentStock - reservedStock),
    nextEntries,
  };
}
