/**
 * useCatalogRealStats — Fetches real aggregate counts from the external DB
 * for products, variants, categories, and suppliers.
 * Single batch call, cached for 30 minutes.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeBatchBridge } from '@/lib/external-db/bridge';

export interface CatalogRealStats {
  totalProducts: number;
  totalVariants: number;
  totalCategories: number;
  totalSuppliers: number;
}

const HIDDEN_CATEGORY_PATTERNS = [
  'matéria', 'prima', 'gravações', 'personalização',
  'suprimentos', 'insumos', 'gravação | mochila',
];

function isHiddenCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return HIDDEN_CATEGORY_PATTERNS.some(p => lower.includes(p));
}

export function useCatalogRealStats() {
  return useQuery<CatalogRealStats>({
    queryKey: ['catalog-real-stats', 'v3'],
    queryFn: async () => {
      // Batch doesn't support countMode, so we fetch records to count them.
      // Products: use the catalog's totalEstimate instead (already available).
      // Variants/Categories/Suppliers: fetch IDs to count.
      const queries = [
        {
          table: 'product_variants',
          operation: 'select' as const,
          select: 'id',
          filters: {},
          limit: 50000,
          offset: 0,
        },
        {
          table: 'categories',
          operation: 'select' as const,
          select: 'id,name',
          filters: { active: true },
          limit: 1000,
          offset: 0,
        },
        {
          table: 'suppliers',
          operation: 'select' as const,
          select: 'id',
          filters: { active: true },
          limit: 500,
          offset: 0,
        },
      ];

      try {
        const results = await invokeBatchBridge(queries);

        // Variants: count records directly
        const variantsCount = results[0]?.success && results[0]?.data?.records
          ? results[0].data.records.length
          : 0;

        // Categories: filter hidden ones, count visible
        let categoriesCount = 0;
        if (results[1]?.success && results[1]?.data?.records) {
          const allCategories = results[1].data.records as Array<{ id: string; name: string }>;
          const visible = allCategories.filter(c => !isHiddenCategory(c.name || ''));
          categoriesCount = visible.length;
        }

        // Suppliers: count records directly
        const suppliersCount = results[2]?.success && results[2]?.data?.records
          ? results[2].data.records.length
          : 0;

        return {
          totalProducts: 0, // Will use totalEstimate from catalog hook
          totalVariants: variantsCount,
          totalCategories: categoriesCount,
          totalSuppliers: suppliersCount,
        };
      } catch {
        return { totalProducts: 0, totalVariants: 0, totalCategories: 0, totalSuppliers: 0 };
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
