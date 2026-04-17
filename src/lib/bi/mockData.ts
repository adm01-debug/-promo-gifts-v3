/**
 * Dados mockados realistas para fallback quando histórico real está vazio.
 * Sinalizados claramente na UI com badge "Dados simulados".
 */

export interface MockClientStats {
  ltv: number;
  avgTicket: number;
  ordersCount: number;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  topCategories: Array<{ category: string; count: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    date: string;
    total: number;
    itemsCount: number;
    productPreview: string;
  }>;
}

export const MOCK_CLIENT_STATS: MockClientStats = {
  ltv: 48750,
  avgTicket: 3250,
  ordersCount: 15,
  lastOrderDate: new Date(Date.now() - 22 * 86400000).toISOString(),
  daysSinceLastOrder: 22,
  topCategories: [
    { category: "Garrafas e Squeezes", count: 6, revenue: 18200 },
    { category: "Canetas Premium", count: 4, revenue: 12300 },
    { category: "Mochilas e Bolsas", count: 3, revenue: 11500 },
    { category: "Agendas", count: 2, revenue: 4750 },
    { category: "Brindes Tecnológicos", count: 1, revenue: 2000 },
  ],
  recentOrders: [
    { id: "PED-25-0042", date: new Date(Date.now() - 22 * 86400000).toISOString(), total: 4200, itemsCount: 3, productPreview: "Garrafa Térmica + Caneta Premium" },
    { id: "PED-25-0031", date: new Date(Date.now() - 58 * 86400000).toISOString(), total: 2800, itemsCount: 2, productPreview: "Mochila Notebook + Squeeze" },
    { id: "PED-25-0019", date: new Date(Date.now() - 95 * 86400000).toISOString(), total: 5100, itemsCount: 4, productPreview: "Kit Escritório Premium" },
    { id: "PED-24-0287", date: new Date(Date.now() - 142 * 86400000).toISOString(), total: 3650, itemsCount: 3, productPreview: "Agendas + Canetas" },
    { id: "PED-24-0265", date: new Date(Date.now() - 198 * 86400000).toISOString(), total: 2950, itemsCount: 2, productPreview: "Garrafas Personalizadas" },
  ],
};

export interface MockIndustryTrend {
  productName: string;
  category: string;
  unitsSold: number;
  ordersCount: number;
  avgPrice: number;
  trend: "up" | "stable" | "down";
}

/** Gera tendências mockadas baseadas no ramo */
export function getMockIndustryTrends(ramo?: string | null): MockIndustryTrend[] {
  const base: MockIndustryTrend[] = [
    { productName: "Garrafa Térmica Inox 500ml", category: "Garrafas", unitsSold: 1240, ordersCount: 18, avgPrice: 52, trend: "up" },
    { productName: "Caneta Metálica Executive", category: "Canetas", unitsSold: 3500, ordersCount: 24, avgPrice: 14, trend: "up" },
    { productName: "Mochila Notebook Premium", category: "Mochilas", unitsSold: 480, ordersCount: 12, avgPrice: 95, trend: "stable" },
    { productName: "Agenda Couro 2025", category: "Agendas", unitsSold: 720, ordersCount: 9, avgPrice: 68, trend: "up" },
    { productName: "Power Bank 10000mAh", category: "Eletrônicos", unitsSold: 380, ordersCount: 8, avgPrice: 75, trend: "up" },
    { productName: "Squeeze Esportivo 750ml", category: "Garrafas", unitsSold: 890, ordersCount: 11, avgPrice: 28, trend: "stable" },
    { productName: "Kit Escritório 5 peças", category: "Kits", unitsSold: 215, ordersCount: 7, avgPrice: 145, trend: "up" },
    { productName: "Bloco A5 com Caneta", category: "Blocos", unitsSold: 1850, ordersCount: 15, avgPrice: 12, trend: "stable" },
    { productName: "Necessaire Premium", category: "Necessaires", unitsSold: 320, ordersCount: 6, avgPrice: 38, trend: "down" },
    { productName: "Bone Bordado Aba Curva", category: "Vestuário", unitsSold: 540, ordersCount: 9, avgPrice: 22, trend: "stable" },
  ];
  // pequena variação cosmética por ramo
  if (ramo?.toLowerCase().includes("tecnolog")) {
    base[4].unitsSold = 1200;
    base[2].unitsSold = 950;
  }
  return base;
}
