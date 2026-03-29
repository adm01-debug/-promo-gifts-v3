/**
 * useSimilarProducts — Fetches products in the same product_group.
 * Uses the local `product_group_members` table to find siblings,
 * then fetches their details from the external catalog.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchPromobrindProductById } from '@/lib/external-db';
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

export function useSimilarProducts(productId: string | undefined) {
  return useQuery<SimilarProductItem[]>({
    queryKey: ['similar-products', productId],
    queryFn: async () => {
      if (!productId) return [];

      // 1. Find the group(s) this product belongs to
      const { data: memberships, error: memberErr } = await supabase
        .from('product_group_members')
        .select('product_group_id')
        .eq('product_id', productId);

      if (memberErr || !memberships?.length) return [];

      const groupIds = memberships.map(m => m.product_group_id);

      // 2. Fetch all members of those groups
      const { data: allMembers, error: allErr } = await supabase
        .from('product_group_members')
        .select('product_id')
        .in('product_group_id', groupIds);

      if (allErr || !allMembers?.length) return [];

      // 3. Get unique sibling product IDs (exclude current)
      const siblingIds = [...new Set(
        allMembers
          .map(m => m.product_id)
          .filter(id => id !== productId)
      )];

      if (siblingIds.length === 0) return [];

      // 4. Fetch product details from external catalog (parallel, max 20)
      const idsToFetch = siblingIds.slice(0, 20);
      const results = await Promise.allSettled(
        idsToFetch.map(id => fetchPromobrindProductById(id))
      );

      const items: SimilarProductItem[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const product = mapPromobrindToProduct(result.value);
          items.push(mapToSimilarItem(product));
        }
      }

      return items;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!productId,
  });
}
