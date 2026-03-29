/**
 * Hook para Inteligência de Mercado MACRO (agregada por todos os produtos).
 * Consome stock_daily_summary via external-db-bridge.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import type { StockDailySummary } from './useStockHistory';

export interface MacroMarketPoint {
  date: string;
  stockClose: number;
  depleted: number;
  restocked: number;
}

export interface MacroMarketKpis {
  totalDepleted7d: number;
  totalDepleted30d: number;
  totalRestocked30d: number;
  totalCurrentStock: number;
  avgDailyDepletion: number;
  topDepletionDay: { date: string; value: number } | null;
}

/**
 * Busca stock_daily_summary agregado (macro) para visão de mercado.
 * Filtra opcionalmente por supplier_id.
 */
export function useMarketIntelligenceMacro(days = 30, supplierId?: string | null) {
  return useQuery({
    queryKey: ['market-intelligence-macro', days, supplierId],
    queryFn: async (): Promise<{ daily: MacroMarketPoint[]; kpis: MacroMarketKpis }> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const filters: Record<string, unknown> = {};
      if (supplierId) filters.supplier_id = supplierId;

      // Fetch recent summaries — aggregate across all products
      const result = await invokeExternalDb<StockDailySummary>({
        table: 'stock_daily_summary',
        operation: 'select',
        select: 'summary_date, stock_close, units_depleted, units_restocked',
        filters,
        limit: 5000,
        orderBy: { column: 'summary_date', ascending: true },
      });

      // Aggregate by date
      const dateMap = new Map<string, MacroMarketPoint>();

      for (const row of result.records) {
        if (row.summary_date < cutoffStr) continue;
        const existing = dateMap.get(row.summary_date);
        if (existing) {
          existing.stockClose += row.stock_close;
          existing.depleted += row.units_depleted;
          existing.restocked += row.units_restocked;
        } else {
          dateMap.set(row.summary_date, {
            date: row.summary_date,
            stockClose: row.stock_close,
            depleted: row.units_depleted,
            restocked: row.units_restocked,
          });
        }
      }

      const daily = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // KPIs
      const now = new Date();
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
      const d7Str = d7.toISOString().split('T')[0];

      let totalDepleted7d = 0;
      let totalDepleted30d = 0;
      let totalRestocked30d = 0;
      let latestStock = 0;
      let topDepletionDay: { date: string; value: number } | null = null;

      for (const d of daily) {
        totalDepleted30d += d.depleted;
        totalRestocked30d += d.restocked;
        if (d.date >= d7Str) totalDepleted7d += d.depleted;
        latestStock = d.stockClose; // last day's aggregate
        if (!topDepletionDay || d.depleted > topDepletionDay.value) {
          topDepletionDay = { date: d.date, value: d.depleted };
        }
      }

      const activeDays = daily.filter(d => d.depleted > 0).length;
      const avgDailyDepletion = activeDays > 0 ? totalDepleted30d / activeDays : 0;

      return {
        daily,
        kpis: {
          totalDepleted7d,
          totalDepleted30d,
          totalRestocked30d,
          totalCurrentStock: latestStock,
          avgDailyDepletion,
          topDepletionDay,
        },
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
