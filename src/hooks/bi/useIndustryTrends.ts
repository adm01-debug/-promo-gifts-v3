/**
 * useIndustryTrends — top produtos vendidos para empresas do mesmo ramo.
 * Hoje retorna mock (orders ainda não tem volume). UI marca como "simulado".
 */
import { useQuery } from "@tanstack/react-query";
import { getMockIndustryTrends, type MockIndustryTrend } from "@/lib/bi/mockData";

export interface IndustryTrendsResult {
  isMock: boolean;
  trends: MockIndustryTrend[];
}

export function useIndustryTrends(ramoAtividade?: string | null) {
  return useQuery<IndustryTrendsResult>({
    queryKey: ["bi-industry-trends", ramoAtividade],
    enabled: !!ramoAtividade,
    queryFn: async () => {
      // Quando o sistema de pedidos amadurecer:
      // 1. Buscar IDs de companies com mesmo ramo_atividade
      // 2. JOIN orders + order_items filtrando por client_id IN (...)
      // 3. Agregar por product_id, ordenar por unitsSold
      // Por enquanto: mock determinístico por ramo.
      return {
        isMock: true,
        trends: getMockIndustryTrends(ramoAtividade),
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
