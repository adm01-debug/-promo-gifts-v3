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
    queryKey: ['catalog-real-stats', 'v2'],
    queryFn: async () => {
      const queries = [
        {
          table: 'products',
          operation: 'select' as const,
          select: 'id',
          filters: { active: true },
          limit: 1,
          offset: 0,
          countMode: 'exact',
        },
        {
          table: 'product_variants',
          operation: 'select' as const,
          select: 'id',
          filters: {},
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

        // Products count
        const productsCount = results[0]?.success && results[0]?.data?.count != null
          ? (results[0].data.count as number)
          : 0;

        // Variants count
        const variantsCount = results[1]?.success && results[1]?.data?.count != null
          ? (results[1].data.count as number)
          : 0;

        // Categories — filter hidden ones
        let categoriesCount = 0;
        if (results[2]?.success && results[2]?.data?.records) {
          const allCategories = results[2].data.records as Array<{ id: string; name: string }>;
          const visible = allCategories.filter(c => !isHiddenCategory(c.name || ''));
          categoriesCount = visible.length;
        } else if (results[2]?.success && results[2]?.data?.count != null) {
          categoriesCount = results[2].data.count as number;
        }

        // Suppliers count
        const suppliersCount = results[3]?.success && results[3]?.data?.count != null
          ? (results[3].data.count as number)
          : 0;

        return {
          totalProducts: productsCount,
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
