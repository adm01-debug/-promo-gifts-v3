/**
 * useSimilarProducts — Fetches similar products via the external DB.
 * 
 * Strategy:
 * 1. Query `product_relationships` (107k+ cross-supplier pairs) for direct similar matches
 * 2. Fallback: Query `product_group_members` for group-based siblings
 * 3. Last resort: Related products from same supplier/category
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import { fetchPromobrindProductById, fetchPromobrindProducts } from '@/lib/external-db';
import { mapPromobrindToProduct } from '@/utils/product-mapper';
import type { Product } from '@/types/product-catalog';

export interface SimilarProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string;
  supplier_name: string;
  category_name: string;
  colors_count?: number;
  stock?: number;
}

function mapToSimilarItem(p: Product): SimilarProductItem {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    image_url: p.images?.[0] || p.image_url || '',
    supplier_name: p.supplier?.name || 'Fornecedor',
    category_name: p.category?.name || '',
    colors_count: p.colors?.length || 0,
    stock: p.stock,
  };
}

export function useSimilarProducts(product: Product | null | undefined) {
  const productId = product?.id;
  const supplierId = product?.supplier?.id;
  const categoryId = product?.category_id;

  return useQuery<SimilarProductItem[]>({
    queryKey: ['similar-products', productId],
    queryFn: async () => {
      if (!productId) return [];

      // 1. Try product_relationships (direct pairs — fastest, 107k+ records)
      try {
        const { records: relationships } = await invokeExternalDb<{
          related_product_id: string;
        }>({
          table: 'product_relationships',
          operation: 'select',
          select: 'related_product_id',
          filters: {
            product_id: productId,
            relationship_type: 'similar',
          },
          limit: 50,
        });

        if (relationships && relationships.length > 0) {
          const relatedIds = relationships.map(r => r.related_product_id);
          const results = await Promise.allSettled(
            relatedIds.map(id => fetchPromobrindProductById(id))
          );
          const items: SimilarProductItem[] = [];
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
              const mapped = mapPromobrindToProduct(result.value);
              // Only include products with valid price and images
              if (mapped.price > 0) {
                items.push(mapToSimilarItem(mapped));
              }
            }
          }
          if (items.length > 0) return items;
        }
      } catch (err) {
        console.warn('[useSimilarProducts] product_relationships query failed, trying groups:', err);
      }

      // 2. Try product_group_members (group-based siblings)
      try {
        const { records: memberships } = await invokeExternalDb<{
          group_id: string;
        }>({
          table: 'product_group_members',
          operation: 'select',
          select: 'group_id',
          filters: { product_id: productId },
          limit: 10,
        });

        if (memberships && memberships.length > 0) {
          const groupIds = memberships.map(m => m.group_id);
          
          // Fetch all members of those groups
          const { records: allMembers } = await invokeExternalDb<{
            product_id: string;
            supplier_id: string;
          }>({
            table: 'product_group_members',
            operation: 'select',
            select: 'product_id,supplier_id',
            filters: {
              group_id: `in.(${groupIds.join(',')})`,
            },
            limit: 100,
          });

          const siblingIds = [...new Set(
            (allMembers || [])
              .map(m => m.product_id)
              .filter(id => id !== productId)
          )];

          if (siblingIds.length > 0) {
            const results = await Promise.allSettled(
              siblingIds.map(id => fetchPromobrindProductById(id))
            );
            const items: SimilarProductItem[] = [];
            for (const result of results) {
              if (result.status === 'fulfilled' && result.value) {
                items.push(mapToSimilarItem(mapPromobrindToProduct(result.value)));
              }
            }
            if (items.length > 0) return items;
          }
        }
      } catch (err) {
        console.warn('[useSimilarProducts] product_group_members query failed, using fallback:', err);
      }

      // 3. Fallback: fetch related products from same supplier or category
      const filters: Record<string, unknown> = {};
      if (supplierId && supplierId !== 'unknown') {
        filters.supplier_id = supplierId;
      } else if (categoryId) {
        filters.main_category_id = categoryId;
      }

      const raw = await fetchPromobrindProducts({
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        limit: 500,
        orderBy: { column: 'name', ascending: true },
      });

      return raw
        .map(mapPromobrindToProduct)
        .filter(p => p.id !== productId)
        .map(mapToSimilarItem);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!product,
  });
}
