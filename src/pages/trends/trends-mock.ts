/**
 * Mock data para o módulo Tendências.
 * Ativado via querystring `?demo=1` em /tendencias.
 * Permite avaliar viabilidade visual do módulo sem depender de eventos reais.
 */
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface MockProduct {
  id: string;
  name: string;
  sku?: string;
  views: number;
  details: number;
  compares: number;
  favorites: number;
  recentViews: number;
  baselineViews: number;
  trendingScore: number;
  classification: "rising" | "stable" | "falling" | "new";
}

export interface MockSearch {
  term: string;
  count: number;
  totalResults: number;
  avgResults: number;
}

export const MOCK_KPI_CURRENT = {
  totalViews: 12_847,
  totalSearches: 3_421,
  uniqueProducts: 687,
  uniqueSearches: 542,
};

export const MOCK_KPI_PREVIOUS = {
  totalViews: 9_633,
  totalSearches: 2_984,
  uniqueProducts: 612,
  uniqueSearches: 498,
};

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: "p1", name: "Squeeze Térmica Inox 750ml", sku: "SQZ-750-PRT", views: 1284, details: 412, compares: 89, favorites: 156, recentViews: 720, baselineViews: 564, trendingScore: 2.4, classification: "rising" },
  { id: "p2", name: "Caneca Cerâmica Personalizada 325ml", sku: "CAN-325-BCO", views: 1102, details: 380, compares: 71, favorites: 142, recentViews: 612, baselineViews: 490, trendingScore: 2.1, classification: "rising" },
  { id: "p3", name: "Caneta Metal Premium Touch", sku: "CAN-MTL-AZL", views: 987, details: 298, compares: 64, favorites: 98, recentViews: 320, baselineViews: 667, trendingScore: 0.6, classification: "falling" },
  { id: "p4", name: "Mochila Executiva Notebook 15”", sku: "MCH-EXE-PRT", views: 856, details: 312, compares: 102, favorites: 134, recentViews: 510, baselineViews: 346, trendingScore: 2.8, classification: "rising" },
  { id: "p5", name: "Power Bank 10000mAh USB-C", sku: "PWR-10K-PRT", views: 743, details: 256, compares: 88, favorites: 121, recentViews: 380, baselineViews: 363, trendingScore: 1.2, classification: "stable" },
  { id: "p6", name: "Bloco de Notas Eco Capa Kraft", sku: "BLO-ECO-NAT", views: 692, details: 201, compares: 42, favorites: 87, recentViews: 460, baselineViews: 232, trendingScore: 3.1, classification: "rising" },
  { id: "p7", name: "Camiseta Dry Fit Personalizada", sku: "CAM-DRY-VRD", views: 634, details: 189, compares: 56, favorites: 104, recentViews: 290, baselineViews: 344, trendingScore: 0.95, classification: "stable" },
  { id: "p8", name: "Kit Escritório Sustentável", sku: "KIT-ESC-001", views: 521, details: 178, compares: 38, favorites: 76, recentViews: 410, baselineViews: 111, trendingScore: 4.2, classification: "new" },
  { id: "p9", name: "Necessaire Compacta Lona", sku: "NEC-LON-PRT", views: 487, details: 142, compares: 29, favorites: 61, recentViews: 245, baselineViews: 242, trendingScore: 1.05, classification: "stable" },
  { id: "p10", name: "Garrafa Vidro Borossilicato 500ml", sku: "GAR-VDR-500", views: 432, details: 134, compares: 31, favorites: 58, recentViews: 310, baselineViews: 122, trendingScore: 3.6, classification: "rising" },
];

export const MOCK_SEARCHES: MockSearch[] = [
  { term: "squeeze personalizada", count: 287, totalResults: 12_614, avgResults: 44 },
  { term: "caneca brinde", count: 241, totalResults: 9_881, avgResults: 41 },
  { term: "mochila notebook", count: 198, totalResults: 7_524, avgResults: 38 },
  { term: "kit escritório", count: 176, totalResults: 5_280, avgResults: 30 },
  { term: "caneta metal", count: 154, totalResults: 8_932, avgResults: 58 },
  { term: "power bank", count: 142, totalResults: 4_544, avgResults: 32 },
  { term: "ecobag personalizada", count: 128, totalResults: 3_840, avgResults: 30 },
  { term: "camiseta promocional", count: 119, totalResults: 6_188, avgResults: 52 },
  { term: "garrafa térmica", count: 108, totalResults: 4_212, avgResults: 39 },
  { term: "bloco de notas", count: 97, totalResults: 3_201, avgResults: 33 },
];

export function buildMockDaily(days: number) {
  const seed = (i: number, base: number, amp: number) =>
    Math.round(base + Math.sin(i / 2.3) * amp + (Math.random() - 0.4) * (amp / 2));

  const current = Array.from({ length: days }).map((_, idx) => {
    const i = days - 1 - idx;
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    return {
      date,
      dateLabel: format(subDays(new Date(), i), "dd/MM", { locale: ptBR }),
      views: Math.max(80, seed(idx, 380, 140)),
      searches: Math.max(20, seed(idx, 110, 45)),
    };
  });

  const previous = Array.from({ length: days }).map((_, idx) => ({
    date: "",
    views: Math.max(60, seed(idx + 7, 290, 110)),
    searches: Math.max(15, seed(idx + 7, 92, 38)),
  }));

  return { current, previous };
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}
