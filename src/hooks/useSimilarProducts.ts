/**
 * useSimilarProducts — Fetches products in the same product_group.
 * Falls back to related products (same supplier/category) when no groups exist.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      // 1. Try product_group_members first
      const { data: memberships } = await supabase
        .from('product_group_members')
        .select('product_group_id')
        .eq('product_id', productId);

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.product_group_id);
        const { data: allMembers } = await supabase
          .from('product_group_members')
          .select('product_id')
          .in('product_group_id', groupIds);

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

      // 2. Fallback: fetch related products from same supplier or category
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
