/**
 * Batch sparkline sales data provider.
 * Fetches aggregated daily sales (qty) for multiple products in a single query,
 * avoiding N+1 when rendering many ProductCards in the catalog.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Per-product sparkline data
export interface SparklineSalesData {
  /** Daily quantities (ordered by date ascending), last 30 days */
  dailyQty: number[];
  totalQty: number;
  totalValue: number;
}

type SparklineMap = Record<string, SparklineSalesData>;

const SparklineCtx = createContext<SparklineMap>({});

export function useSparklineData(productId: string): SparklineSalesData | undefined {
  const map = useContext(SparklineCtx);
  return map[productId];
}

interface Props {
  productIds: string[];
  children: ReactNode;
}

/**
 * Wrap a product list/grid with this provider.
 * It fetches quote_items + order_items for the given product IDs in bulk.
 */
export function SparklineSalesProvider({ productIds, children }: Props) {
  // Stable key: sort + dedupe
  const stableIds = useMemo(() => {
    const unique = [...new Set(productIds)];
    unique.sort();
    return unique;
  }, [productIds]);

  const { data: sparkMap } = useQuery({
    queryKey: ["sparkline-sales-batch", stableIds],
    queryFn: () => fetchSparklineBatch(stableIds),
    enabled: stableIds.length > 0,
    staleTime: 5 * 60 * 1000,
    // Don't refetch on every window focus for catalog perf
    refetchOnWindowFocus: false,
  });

  const value = sparkMap ?? {};

  return <SparklineCtx.Provider value={value}>{children}</SparklineCtx.Provider>;
}

// ---------- Data fetching ----------

async function fetchSparklineBatch(productIds: string[]): Promise<SparklineMap> {
  if (!productIds.length) return {};

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();

  // Fetch quote_items and order_items in parallel
  const [{ data: quoteItems }, { data: orderItems }] = await Promise.all([
    supabase
      .from("quote_items")
      .select("product_id, quantity, unit_price, subtotal, created_at")
      .in("product_id", productIds)
      .gte("created_at", cutoffStr),
    supabase
      .from("order_items")
      .select("product_id, quantity, unit_price, created_at")
      .in("product_id", productIds)
      .gte("created_at", cutoffStr),
  ]);

  // Build per-product, per-date map
  // Key: productId → dateStr → { qty, value }
  const map: Record<string, Record<string, { qty: number; value: number }>> = {};

  const ensure = (pid: string, date: string) => {
    if (!map[pid]) map[pid] = {};
    if (!map[pid][date]) map[pid][date] = { qty: 0, value: 0 };
  };

  for (const qi of quoteItems || []) {
    if (!qi.product_id) continue;
    const date = qi.created_at.substring(0, 10);
    ensure(qi.product_id, date);
    map[qi.product_id][date].qty += qi.quantity || 0;
    map[qi.product_id][date].value += qi.subtotal || (qi.quantity || 0) * (qi.unit_price || 0);
  }

  for (const oi of orderItems || []) {
    if (!oi.product_id) continue;
    const date = oi.created_at.substring(0, 10);
    ensure(oi.product_id, date);
    map[oi.product_id][date].qty += oi.quantity || 0;
    map[oi.product_id][date].value += (oi.quantity || 0) * (oi.unit_price || 0);
  }

  // Generate contiguous 30-day arrays
  const result: SparklineMap = {};
  const today = new Date();

  for (const pid of productIds) {
    const dailyQty: number[] = [];
    let totalQty = 0;
    let totalValue = 0;
    const dateMap = map[pid] || {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().substring(0, 10);
      const entry = dateMap[ds];
      dailyQty.push(entry?.qty ?? 0);
      totalQty += entry?.qty ?? 0;
      totalValue += entry?.value ?? 0;
    }

    result[pid] = { dailyQty, totalQty, totalValue };
  }

  return result;
}
