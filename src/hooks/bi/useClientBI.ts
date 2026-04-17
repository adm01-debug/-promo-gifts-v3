/**
 * useClientBI — orquestra estatísticas 360° do cliente.
 * Tenta dados reais (orders); se vazio, retorna mock com flag `isMock: true`.
 */
import { useMemo } from "react";
import { useClientOrdersHistory } from "@/hooks/useClientOrdersHistory";
import { MOCK_CLIENT_STATS } from "@/lib/bi/mockData";

export interface ClientBI {
  isMock: boolean;
  ltv: number;
  avgTicket: number;
  ordersCount: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  topCategories: Array<{ category: string; count: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    date: string;
    total: number;
    itemsCount: number;
    productPreview: string;
  }>;
  isLoading: boolean;
}

export function useClientBI(clientId?: string): ClientBI {
  const { data, isLoading } = useClientOrdersHistory(clientId);

  return useMemo(() => {
    if (!data || data.ordersCount === 0) {
      return {
        isMock: true,
        ...MOCK_CLIENT_STATS,
        lastOrderDate: MOCK_CLIENT_STATS.lastOrderDate,
        daysSinceLastOrder: MOCK_CLIENT_STATS.daysSinceLastOrder,
        isLoading,
      };
    }

    const daysSince = data.lastOrderAt
      ? Math.floor((Date.now() - new Date(data.lastOrderAt).getTime()) / 86400000)
      : null;

    return {
      isMock: false,
      ltv: data.totalLtv,
      avgTicket: data.avgTicket,
      ordersCount: data.ordersCount,
      lastOrderDate: data.lastOrderAt,
      daysSinceLastOrder: daysSince,
      // Categorias reais ainda não temos (depende de order_items + categoria) — fallback mock parcial
      topCategories: MOCK_CLIENT_STATS.topCategories,
      recentOrders: data.orders.slice(0, 5).map((o) => ({
        id: o.order_number,
        date: o.created_at,
        total: o.total ?? 0,
        itemsCount: 1,
        productPreview: o.notes?.slice(0, 60) ?? "Pedido",
      })),
      isLoading,
    };
  }, [data, isLoading]);
}
