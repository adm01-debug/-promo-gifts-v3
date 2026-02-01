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
  updated_at: string;
}

/**
 * Dados completos da variante com informações de estoque
 * JOIN entre product_variants e variant_supplier_sources
 */
export interface VariantWithSupplierData {
  variant: {
    id: string;
    product_id: string;
    sku: string;
    supplier_sku: string | null;
    color_name: string | null;
    color_hex: string | null;
    color_code: string | null;
    selected_thumbnail: string | null;
    images: string[] | null;
    stock_quantity: number | null;
  };
  supplierSource: VariantSupplierSource | null;
}

/**
 * Hook principal: Busca variantes de um produto com dados de estoque/reposição
 * Faz JOIN entre product_variants e variant_supplier_sources
 */
export function useProductVariantsWithStock(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-variants-with-stock', productId],
    queryFn: async (): Promise<VariantWithSupplierData[]> => {
      if (!productId) return [];

      // 1. Buscar variantes do produto
      const variantsResult = await invokeExternalDb<{
        id: string;
        product_id: string;
        sku: string;
        supplier_sku: string | null;
        color_name: string | null;
        color_hex: string | null;
        color_code: string | null;
        selected_thumbnail: string | null;
        images: string[] | null;
        selected_images: string[] | null;
        stock_quantity: number | null;
      }>({
        table: 'product_variants',
        operation: 'select',
        select: 'id, product_id, sku, supplier_sku, color_name, color_hex, color_code, selected_thumbnail, images, selected_images, stock_quantity',
        filters: { product_id: productId, is_active: true },
        limit: 100,
      });

      const variants = variantsResult.records;
      if (variants.length === 0) return [];

      // 2. Buscar supplier sources para cada variante INDIVIDUALMENTE
      // Isso é mais confiável do que buscar 5000 genéricos e filtrar
      const sourcesByVariantId = new Map<string, VariantSupplierSource>();
      
      // Processar em paralelo com Promise.all para performance
      const sourcePromises = variants.map(async (variant) => {
        try {
          const sourceResult = await invokeExternalDb<VariantSupplierSource>({
            table: 'variant_supplier_sources',
            operation: 'select',
            select: 'id, variant_id, supplier_id, supplier_sku, quantity, reserved_quantity, next_quantity_1, next_date_1, next_quantity_2, next_date_2, next_quantity_3, next_date_3, is_active, updated_at',
            filters: { variant_id: variant.id, is_active: true },
            limit: 1,
          });
          
          if (sourceResult.records[0]) {
            sourcesByVariantId.set(variant.id, sourceResult.records[0]);
          }
        } catch (err) {
          console.warn(`Não foi possível buscar supplier source para variante ${variant.id}:`, err);
        }
      });
      
      await Promise.all(sourcePromises);

      // 3. Combinar dados
      return variants.map(variant => ({
        variant: {
          ...variant,
          images: variant.selected_images?.length ? variant.selected_images : variant.images,
        },
        supplierSource: sourcesByVariantId.get(variant.id) || null,
      }));
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Interface para entrada de reposição processada (para UI)
 */
export interface ProcessedStockEntry {
  id: string;
  variantId: string;
  sku: string;
  supplierSku: string;
  colorName: string;
  colorHex: string;
  thumbnail: string | null;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  expectedDate: string;
  expectedQuantity: number;
  entryIndex: 1 | 2 | 3;
}

/**
 * Processa dados de variantes + supplier sources em entradas de reposição para UI
 */
export function processStockEntries(
  variantsWithStock: VariantWithSupplierData[]
): ProcessedStockEntry[] {
  const entries: ProcessedStockEntry[] = [];

  variantsWithStock.forEach(({ variant, supplierSource }) => {
    if (!supplierSource) return;

    const baseEntry = {
      variantId: variant.id,
      sku: variant.sku,
      supplierSku: supplierSource.supplier_sku || variant.supplier_sku || variant.sku,
      colorName: variant.color_name || 'Sem cor',
      colorHex: variant.color_hex || '#CCCCCC',
      thumbnail: variant.selected_thumbnail || variant.images?.[0] || null,
      currentStock: supplierSource.quantity,
      reservedStock: supplierSource.reserved_quantity,
      availableStock: Math.max(0, supplierSource.quantity - supplierSource.reserved_quantity),
    };

    // Adicionar cada entrada de reposição que existe
    if (supplierSource.next_quantity_1 && supplierSource.next_date_1) {
      entries.push({
        ...baseEntry,
        id: `${supplierSource.id}-1`,
        expectedDate: supplierSource.next_date_1,
        expectedQuantity: supplierSource.next_quantity_1,
        entryIndex: 1,
      });
    }

    if (supplierSource.next_quantity_2 && supplierSource.next_date_2) {
      entries.push({
        ...baseEntry,
        id: `${supplierSource.id}-2`,
        expectedDate: supplierSource.next_date_2,
        expectedQuantity: supplierSource.next_quantity_2,
        entryIndex: 2,
      });
    }

    if (supplierSource.next_quantity_3 && supplierSource.next_date_3) {
      entries.push({
        ...baseEntry,
        id: `${supplierSource.id}-3`,
        expectedDate: supplierSource.next_date_3,
        expectedQuantity: supplierSource.next_quantity_3,
        entryIndex: 3,
      });
    }
  });

  // Ordenar por data mais próxima primeiro
  return entries.sort(
    (a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
  );
}

/**
 * Calcula resumo de cores com estoque e previsões
 */
export function calculateColorSummary(
  variantsWithStock: VariantWithSupplierData[],
  stockEntries: ProcessedStockEntry[]
) {
  const colorMap = new Map<string, {
    name: string;
    hex: string;
    thumbnail: string | null;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    incomingCount: number;
    incomingTotal: number;
  }>();

  variantsWithStock.forEach(({ variant, supplierSource }) => {
    const colorName = variant.color_name || 'Sem cor';
    const existing = colorMap.get(colorName);
    
    const currentStock = supplierSource?.quantity ?? variant.stock_quantity ?? 0;
    const reservedStock = supplierSource?.reserved_quantity ?? 0;
    
    if (existing) {
      existing.currentStock += currentStock;
      existing.reservedStock += reservedStock;
      existing.availableStock += Math.max(0, currentStock - reservedStock);
    } else {
      colorMap.set(colorName, {
        name: colorName,
        hex: variant.color_hex || '#CCCCCC',
        thumbnail: variant.selected_thumbnail || variant.images?.[0] || null,
        currentStock,
        reservedStock,
        availableStock: Math.max(0, currentStock - reservedStock),
        incomingCount: 0,
        incomingTotal: 0,
      });
    }
  });

  // Adicionar dados de reposição
  stockEntries.forEach(entry => {
    const color = colorMap.get(entry.colorName);
    if (color) {
      color.incomingCount += 1;
      color.incomingTotal += entry.expectedQuantity;
    }
  });

  return Array.from(colorMap.values());
}
