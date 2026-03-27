/**
 * Demo data generators for Stock and Sales history charts.
 * Used when no real data is available so charts remain interactive for testing.
 */
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Deterministic seed from string
function hashSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return (n: number) => {
    const x = Math.sin(h + n) * 10000;
    return x - Math.floor(x);
  };
}

// ---------- Stock Demo ----------

export function generateDemoStockData(productId: string, days: number) {
  const seed = hashSeed(productId);
  const today = new Date();
  let stock = Math.round(200 + seed(0) * 800);

  return Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const depleted = Math.round(seed(i * 3 + 1) * 30);
    const restockChance = seed(i * 3 + 2);
    const restocked = restockChance > 0.85 ? Math.round(50 + seed(i * 3 + 3) * 150) : 0;
    stock = Math.max(5, stock - depleted + restocked);

    return {
      date: dateStr,
      dateFormatted: format(date, "dd/MM", { locale: ptBR }),
      fullDate: format(date, "dd/MM/yyyy", { locale: ptBR }),
      stockClose: stock,
      depleted,
      restocked,
      restockDetected: restocked > 0,
      costPriceClose: Number((8 + seed(i + 200) * 35).toFixed(2)),
    };
  });
}

export function generateDemoVelocity(productId: string) {
  const seed = hashSeed(productId);
  return {
    avg_daily_depletion_7d: Number((5 + seed(50) * 20).toFixed(1)),
    days_to_stockout: Math.round(10 + seed(51) * 50),
    velocity_trend: Number((0.6 + seed(52) * 0.9).toFixed(2)),
    price_changes_30d: seed(53) > 0.7 ? Math.round(1 + seed(54) * 3) : 0,
  };
}

export function generateDemoIntelligence(productId: string) {
  const seed = hashSeed(productId);
  const score = Math.round(20 + seed(60) * 80);
  return {
    total_current_stock: Math.round(100 + seed(61) * 900),
    abc_classification: score > 70 ? 'A' as const : score > 40 ? 'B' as const : 'C' as const,
    turnover_score: score,
    is_hot_product: seed(62) > 0.75,
    is_stockout_risk: seed(63) > 0.8,
    is_stagnant: seed(64) > 0.85,
    is_negotiation_opportunity: seed(65) > 0.8,
    has_frequent_restock: seed(66) > 0.6,
  };
}

// ---------- Sales Demo ----------

export interface DemoSalesDay {
  date: string;
  dateFormatted: string;
  fullDate: string;
  quotedQty: number;
  orderedQty: number;
  quotedValue: number;
  orderedValue: number;
  quoteCount: number;
  orderCount: number;
}

export function generateDemoSalesData(productId: string, days: number): DemoSalesDay[] {
  const seed = hashSeed(productId);
  const today = new Date();
  const unitPrice = 10 + seed(100) * 40;

  return Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const quoteChance = seed(i * 4 + 101);
    const quotedQty = quoteChance > 0.3 ? Math.round(5 + seed(i * 4 + 102) * 50) : 0;
    const orderChance = seed(i * 4 + 103);
    const orderedQty = orderChance > 0.5 ? Math.round(2 + seed(i * 4 + 104) * 30) : 0;

    return {
      date: dateStr,
      dateFormatted: format(date, "dd/MM", { locale: ptBR }),
      fullDate: format(date, "dd/MM/yyyy", { locale: ptBR }),
      quotedQty,
      orderedQty,
      quotedValue: quotedQty * unitPrice,
      orderedValue: orderedQty * unitPrice,
      quoteCount: quotedQty > 0 ? Math.ceil(seed(i + 200) * 3) : 0,
      orderCount: orderedQty > 0 ? Math.ceil(seed(i + 300) * 2) : 0,
    };
  });
}

export function generateDemoSalesKpis(data: DemoSalesDay[]) {
  const totalQuotedQty = data.reduce((s, d) => s + d.quotedQty, 0);
  const totalOrderedQty = data.reduce((s, d) => s + d.orderedQty, 0);
  const totalQuotedValue = data.reduce((s, d) => s + d.quotedValue, 0);
  const totalOrderedValue = data.reduce((s, d) => s + d.orderedValue, 0);
  const totalQuotes = data.reduce((s, d) => s + d.quoteCount, 0);
  const totalOrders = data.reduce((s, d) => s + d.orderCount, 0);

  const sellers = [
    { sellerId: 'demo-1', sellerName: 'Ana Silva', totalQty: Math.round(totalOrderedQty * 0.35), totalValue: totalOrderedValue * 0.35, quoteCount: Math.round(totalQuotes * 0.3), orderCount: Math.round(totalOrders * 0.35) },
    { sellerId: 'demo-2', sellerName: 'Carlos Souza', totalQty: Math.round(totalOrderedQty * 0.28), totalValue: totalOrderedValue * 0.28, quoteCount: Math.round(totalQuotes * 0.25), orderCount: Math.round(totalOrders * 0.28) },
    { sellerId: 'demo-3', sellerName: 'Marina Costa', totalQty: Math.round(totalOrderedQty * 0.22), totalValue: totalOrderedValue * 0.22, quoteCount: Math.round(totalQuotes * 0.25), orderCount: Math.round(totalOrders * 0.22) },
    { sellerId: 'demo-4', sellerName: 'Pedro Lima', totalQty: Math.round(totalOrderedQty * 0.15), totalValue: totalOrderedValue * 0.15, quoteCount: Math.round(totalQuotes * 0.2), orderCount: Math.round(totalOrders * 0.15) },
  ];

  return {
    totalQuotedQty,
    totalOrderedQty,
    totalQuotedValue,
    totalOrderedValue,
    conversionRate: totalQuotes > 0 ? (totalOrders / totalQuotes) * 100 : 0,
    uniqueSellers: 4,
    avgOrderValue: totalOrders > 0 ? totalOrderedValue / totalOrders : 0,
    topSellers: sellers,
  };
}
