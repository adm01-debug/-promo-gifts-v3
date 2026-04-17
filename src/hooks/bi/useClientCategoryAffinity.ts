/**
 * useClientCategoryAffinity — agrega histórico do cliente por CATEGORIA.
 *
 * Reaproveita o RPC `get_client_top_products` (já usado em useClientAffinity)
 * e dobra o resultado por categoria via `categoryResolver`. Quando vazio,
 * cai para mock determinístico baseado em MOCK_CLIENT_STATS.topCategories.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveBICategory, type BICategorySlug } from "@/lib/bi/categoryResolver";
import { MOCK_CLIENT_STATS } from "@/lib/bi/mockData";

export interface ClientTopProductRow {
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  total_quantity: number;
  occurrences: number;
  total_revenue: number;
  avg_unit_price: number;
  last_quoted_at: string | null;
}

export interface CategoryAggregate {
  slug: BICategorySlug | "outros";
  label: string;
  occurrences: number;
  totalQuantity: number;
  totalRevenue: number;
  /** % da receita do cliente que essa categoria representa */
  revenueSharePct: number;
  /** Top produtos REAIS dessa categoria (até 5) */
  topProducts: Array<{
    productId: string | null;
    productName: string;
    imageUrl: string | null;
    quantity: number;
    revenue: number;
    avgPrice: number;
  }>;
}

export interface ClientCategoryAffinityResult {
  isMock: boolean;
  realProductsCount: number;
  /** Categorias ordenadas por receita desc */
  categories: CategoryAggregate[];
  /** Categoria favorita (top 1) — null se nenhuma */
  favorite: CategoryAggregate | null;
}

function buildMockResult(): ClientCategoryAffinityResult {
  const totalRev = MOCK_CLIENT_STATS.topCategories.reduce((s, c) => s + c.revenue, 0) || 1;
  const categories: CategoryAggregate[] = MOCK_CLIENT_STATS.topCategories.map((c) => {
    const meta = resolveBICategory(c.category, c.category);
    return {
      slug: meta.slug,
      label: c.category,
      occurrences: c.count,
      totalQuantity: c.count * 12,
      totalRevenue: c.revenue,
      revenueSharePct: (c.revenue / totalRev) * 100,
      topProducts: [],
    };
  });
  return {
    isMock: true,
    realProductsCount: 0,
    categories,
    favorite: categories[0] ?? null,
  };
}

export function useClientCategoryAffinity(clientId?: string) {
  const query = useQuery<ClientTopProductRow[]>({
    queryKey: ["bi-client-category-affinity-raw", clientId],
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.rpc("get_client_top_products", {
        _client_id: clientId,
        _limit: 50,
      });
      if (error) return [];
      return (Array.isArray(data) ? data : []) as ClientTopProductRow[];
    },
  });

  const result = useMemo<ClientCategoryAffinityResult>(() => {
    const rows = query.data ?? [];
    if (rows.length === 0) return buildMockResult();

    const byCat = new Map<string, CategoryAggregate>();
    for (const r of rows) {
      const meta = resolveBICategory(r.product_name);
      const key = meta.slug;
      const cur = byCat.get(key) ?? {
        slug: meta.slug,
        label: meta.label,
        occurrences: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        revenueSharePct: 0,
        topProducts: [],
      };
      cur.occurrences += Number(r.occurrences) || 0;
      cur.totalQuantity += Number(r.total_quantity) || 0;
      cur.totalRevenue += Number(r.total_revenue) || 0;
      cur.topProducts.push({
        productId: r.product_id,
        productName: r.product_name,
        imageUrl: r.product_image_url,
        quantity: Number(r.total_quantity) || 0,
        revenue: Number(r.total_revenue) || 0,
        avgPrice: Number(r.avg_unit_price) || 0,
      });
      byCat.set(key, cur);
    }

    const totalRev = Array.from(byCat.values()).reduce((s, c) => s + c.totalRevenue, 0) || 1;
    const categories = Array.from(byCat.values())
      .map((c) => ({
        ...c,
        revenueSharePct: (c.totalRevenue / totalRev) * 100,
        topProducts: c.topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      isMock: false,
      realProductsCount: rows.length,
      categories,
      favorite: categories[0] ?? null,
    };
  }, [query.data]);

  return { ...result, isLoading: query.isLoading };
}
