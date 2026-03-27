/**
 * Hook para histórico de estoque e inteligência de produto (fornecedor).
 * Consome: stock_daily_summary, mv_stock_velocity, mv_product_intelligence
 * via external-db-bridge no banco externo.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

// ---------- Types ----------

export interface StockDailySummary {
  id: number;
  variant_supplier_source_id: string;
  supplier_id: string;
  supplier_branch_id: string | null;
  variant_id: string;
  product_id: string;
  summary_date: string;
  stock_open: number;
  stock_close: number;
  stock_min: number;
  stock_max: number;
  net_change: number;
  units_depleted: number;
  units_restocked: number;
  restock_detected: boolean;
  restock_quantity: number;
  restock_count: number;
  cost_price_open: number | null;
  cost_price_close: number | null;
  price_changed: boolean;
  sync_count: number;
}

export interface StockVelocity {
  variant_supplier_source_id: string;
  supplier_id: string;
  product_id: string;
  variant_id: string;
  current_stock: number;
  avg_daily_depletion_7d: number;
  avg_daily_depletion_30d: number;
  avg_daily_depletion_90d: number;
  velocity_trend: number;
  days_to_stockout: number | null;
  total_depleted_7d: number;
  total_depleted_30d: number;
  total_depleted_90d: number;
  total_restocked_30d: number;
  restock_events_30d: number;
  avg_days_between_restocks: number | null;
  price_changes_30d: number;
  active_days_7d: number;
  active_days_30d: number;
  active_days_90d: number;
}

export interface ProductIntelligenceData {
  product_id: string;
  supplier_count: number;
  total_current_stock: number;
  total_depleted_7d: number;
  total_depleted_30d: number;
  total_depleted_90d: number;
  total_restocked_30d: number;
  avg_velocity_7d: number;
  avg_velocity_30d: number;
  max_velocity_trend: number;
  min_days_to_stockout: number | null;
  turnover_score: number;
  abc_classification: 'A' | 'B' | 'C';
  is_hot_product: boolean;
  is_stockout_risk: boolean;
  is_stagnant: boolean;
  is_negotiation_opportunity: boolean;
  has_frequent_restock: boolean;
}

// ---------- Hooks ----------

/**
 * Busca o histórico diário de estoque de um produto.
 */
export function useStockDailySummary(productId: string | undefined, days = 90) {
  return useQuery({
    queryKey: ['stock-daily-summary', productId, days],
    queryFn: async (): Promise<StockDailySummary[]> => {
      if (!productId) return [];

      const result = await invokeExternalDb<StockDailySummary>({
        table: 'stock_daily_summary',
        operation: 'select',
        filters: { product_id: productId },
        limit: days * 10, // multiple suppliers
        orderBy: { column: 'summary_date', ascending: true },
      });

      return result.records;
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca métricas de velocidade de estoque de um produto.
 */
export function useStockVelocity(productId: string | undefined) {
  return useQuery({
    queryKey: ['stock-velocity', productId],
    queryFn: async (): Promise<StockVelocity[]> => {
      if (!productId) return [];

      const result = await invokeExternalDb<StockVelocity>({
        table: 'mv_stock_velocity',
        operation: 'select',
        filters: { product_id: productId },
        limit: 50,
      });

      return result.records;
    },
    enabled: !!productId,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Busca inteligência agregada de um produto.
 */
export function useProductIntelligenceData(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-intelligence-data', productId],
    queryFn: async (): Promise<ProductIntelligenceData | null> => {
      if (!productId) return null;

      const result = await invokeExternalDb<ProductIntelligenceData>({
        table: 'mv_product_intelligence',
        operation: 'select',
        filters: { product_id: productId },
        limit: 1,
      });

      return result.records[0] || null;
    },
    enabled: !!productId,
    staleTime: 30 * 60 * 1000,
  });
}

// ---------- Helpers ----------

export type IntelligenceFlag = 
  | 'hot-product'
  | 'stockout-risk'
  | 'stagnant'
  | 'negotiation-opportunity'
  | 'frequent-restock'
  | 'class-a';

export function getActiveFlags(data: ProductIntelligenceData | null): IntelligenceFlag[] {
  if (!data) return [];
  const flags: IntelligenceFlag[] = [];
  if (data.is_hot_product) flags.push('hot-product');
  if (data.is_stockout_risk) flags.push('stockout-risk');
  if (data.is_stagnant) flags.push('stagnant');
  if (data.is_negotiation_opportunity) flags.push('negotiation-opportunity');
  if (data.has_frequent_restock) flags.push('frequent-restock');
  if (data.abc_classification === 'A') flags.push('class-a');
  return flags;
}

/**
 * Agrega stock_daily_summary por data (soma de todos os fornecedores).
 */
export function aggregateDailySummaryByDate(summaries: StockDailySummary[]) {
  const map = new Map<string, {
    date: string;
    stockClose: number;
    depleted: number;
    restocked: number;
    restockDetected: boolean;
    costPriceClose: number | null;
  }>();

  for (const s of summaries) {
    const existing = map.get(s.summary_date);
    if (existing) {
      existing.stockClose += s.stock_close;
      existing.depleted += s.units_depleted;
      existing.restocked += s.units_restocked;
      if (s.restock_detected) existing.restockDetected = true;
      // Keep the most recent cost price
      if (s.cost_price_close != null) existing.costPriceClose = s.cost_price_close;
    } else {
      map.set(s.summary_date, {
        date: s.summary_date,
        stockClose: s.stock_close,
        depleted: s.units_depleted,
        restocked: s.units_restocked,
        restockDetected: s.restock_detected,
        costPriceClose: s.cost_price_close,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
