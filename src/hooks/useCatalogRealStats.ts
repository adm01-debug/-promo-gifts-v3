/**
 * useCatalogRealStats — Fetches real aggregate counts from the external DB
 * for variants, categories, and suppliers (data not available in lightweight loader).
 */
import { useQuery } from '@tanstack/react-query';
import { invokeBatchBridge } from '@/lib/external-db/bridge';

interface CatalogRealStats {
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
    queryKey: ['catalog-real-stats', 'v1'],
    queryFn: async () => {
      const queries = [
        {
          table: 'product_variants',
          operation: 'select' as const,
          select: 'id',
          filters: { active: true },
          limit: 1,
          offset: 0,
          countMode: 'exact',
        },
        {
          table: 'categories',
          operation: 'select' as const,
          select: 'id,name',
          filters: { active: true },
          limit: 1000,
          offset: 0,
          countMode: 'exact',
        },
        {
          table: 'suppliers',
          operation: 'select' as const,
          select: 'id',
          filters: { active: true },
          limit: 1,
          offset: 0,
          countMode: 'exact',
        },
      ];

      try {
        const results = await invokeBatchBridge(queries);

        // Variants count
        const variantsCount = results[0]?.success && results[0]?.data?.count != null
          ? (results[0].data.count as number)
          : 0;

        // Categories — filter hidden ones
        let categoriesCount = 0;
        if (results[1]?.success && results[1]?.data?.records) {
          const allCategories = results[1].data.records as Array<{ id: string; name: string }>;
          const visible = allCategories.filter(c => !isHiddenCategory(c.name || ''));
          categoriesCount = visible.length;
        } else if (results[1]?.success && results[1]?.data?.count != null) {
          categoriesCount = results[1].data.count as number;
        }

        // Suppliers count
        const suppliersCount = results[2]?.success && results[2]?.data?.count != null
          ? (results[2].data.count as number)
          : 0;

        return {
          totalVariants: variantsCount,
          totalCategories: categoriesCount,
          totalSuppliers: suppliersCount,
        };
      } catch {
        return { totalVariants: 0, totalCategories: 0, totalSuppliers: 0 };
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
