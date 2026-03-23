import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invokeBatchBridge } from '@/lib/external-db';
import { mapLightweightToProduct } from '@/hooks/useProductsLightweight';

/**
 * Prefetch do catálogo SOMENTE após autenticação (#6).
 * Evita chamadas à bridge sem JWT.
 */
export function useCatalogPrefetch() {
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || prefetchedRef.current) return;
    prefetchedRef.current = true;

    queryClient.prefetchInfiniteQuery({
      queryKey: ['promobrind-products-catalog', ''],
      queryFn: async () => {
        const batchQueries = Array.from({ length: 4 }, (_, i) => ({
          table: 'products',
          operation: 'select' as const,
          select: 'id, name, sku, sale_price, cost_price, primary_image_url, supplier_id, category_id, main_category_id, brand, is_active, active, stock_quantity, min_quantity',
          filters: { active: true },
          orderBy: { column: 'name', ascending: true },
          limit: 500,
          offset: i * 500,
          ...(i === 0 ? { countMode: 'planned' } : {}),
        }));
        const batchResults = await invokeBatchBridge(batchQueries);
        const products: any[] = [];
        let totalEstimate: number | null = null;
        let lastPageSize = 0;
        for (const result of batchResults) {
          if (result.success && result.data?.records) {
            products.push(...(result.data.records as unknown[]).map(mapLightweightToProduct));
            lastPageSize = result.data.records.length;
            if (result.data.count != null && totalEstimate === null) {
              totalEstimate = result.data.count as number;
            }
          }
        }
        return {
          products,
          nextOffset: lastPageSize === 500 ? 2000 : null,
          totalEstimate,
        };
      },
      initialPageParam: 0,
      staleTime: 10 * 60 * 1000,
    });
  }, [isAuthenticated, isLoading, queryClient]);
}
