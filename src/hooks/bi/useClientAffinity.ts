/**
 * useClientAffinity — categorias preferidas do cliente + produtos similares.
 * Hoje usa mock (depende de order_items com category). UI marca como "simulado".
 */
import { useQuery } from "@tanstack/react-query";
import { MOCK_CLIENT_STATS } from "@/lib/bi/mockData";

export interface AffinityCategory {
  category: string;
  count: number;
  revenue: number;
  suggestions: Array<{
    name: string;
    priceFrom: number;
    priceTo: number;
    reason: string;
  }>;
}

export interface ClientAffinityResult {
  isMock: boolean;
  categories: AffinityCategory[];
}

const SUGGESTIONS_BY_CATEGORY: Record<string, AffinityCategory["suggestions"]> = {
  "Garrafas e Squeezes": [
    { name: "Garrafa Térmica Inox 750ml", priceFrom: 45, priceTo: 95, reason: "Upgrade da linha que ele já compra" },
    { name: "Squeeze Esportivo Premium", priceFrom: 22, priceTo: 48, reason: "Categoria favorita do cliente" },
    { name: "Garrafa Vidro com Capa Silicone", priceFrom: 30, priceTo: 65, reason: "Novidade na categoria preferida" },
  ],
  "Canetas Premium": [
    { name: "Caneta Roller Premium", priceFrom: 28, priceTo: 75, reason: "Próximo nível em canetas executivas" },
    { name: "Kit Caneta + Lapiseira", priceFrom: 45, priceTo: 120, reason: "Bundle dentro da categoria forte" },
    { name: "Caneta Bambu Sustentável", priceFrom: 12, priceTo: 30, reason: "Alternativa ESG" },
  ],
  "Mochilas e Bolsas": [
    { name: "Mochila Antifurto Premium", priceFrom: 95, priceTo: 220, reason: "Upgrade da linha mochilas" },
    { name: "Bolsa Térmica Executiva", priceFrom: 55, priceTo: 130, reason: "Complemento natural" },
    { name: "Sling Bag Compacta", priceFrom: 38, priceTo: 90, reason: "Tendência atual" },
  ],
  "Agendas": [
    { name: "Agenda Permanente Couro", priceFrom: 60, priceTo: 150, reason: "Linha premium da categoria" },
    { name: "Planner Mensal A4", priceFrom: 25, priceTo: 65, reason: "Variação útil" },
  ],
  "Brindes Tecnológicos": [
    { name: "Carregador Wireless 15W", priceFrom: 40, priceTo: 110, reason: "Tech atualizado" },
    { name: "Caixa de Som Bluetooth", priceFrom: 60, priceTo: 180, reason: "Categoria em alta" },
  ],
};

export function useClientAffinity(clientId?: string) {
  return useQuery<ClientAffinityResult>({
    queryKey: ["bi-client-affinity", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      // Quando order_items tiver category populada:
      // 1. Buscar order_items WHERE order.client_id = clientId
      // 2. Agrupar por categoria, contar e somar
      // 3. Para cada top categoria, buscar 3 produtos similares no catálogo
      const categories: AffinityCategory[] = MOCK_CLIENT_STATS.topCategories.map((c) => ({
        ...c,
        suggestions: SUGGESTIONS_BY_CATEGORY[c.category] ?? [],
      }));
      return { isMock: true, categories };
    },
    staleTime: 10 * 60 * 1000,
  });
}
