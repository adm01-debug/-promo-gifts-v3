/**
 * Hook for product price history via external DB bridge.
 * Reads from price_history table in the external catalog DB.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PriceHistoryEntry {
  id: string;
  product_id: string;
  product_sku: string | null;
  product_name: string | null;
  old_price: number | null;
  new_price: number;
  price_change_percent: number | null;
  source: string;
  created_at: string;
}

const BRIDGE_TABLE = 'price_history';

async function bridgeInvoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', { body });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro na operação');
  return data;
}

export function usePriceHistory(productId: string | undefined) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    try {
      const result = await bridgeInvoke({
        table: BRIDGE_TABLE,
        operation: 'select',
        filters: { product_id: productId },
        limit: 100,
        orderBy: { column: 'created_at', ascending: true },
      });
      setHistory((result.data?.records as PriceHistoryEntry[]) || []);
    } catch (err) {
      console.error("Error fetching price history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * Records a price change for a product.
   * Called when a price difference is detected (e.g., during product view or sync).
   */
  const recordPriceChange = useCallback(
    async (params: {
      productId: string;
      productSku?: string;
      productName?: string;
      oldPrice?: number;
      newPrice: number;
      source?: string;
    }) => {
      if (!user) return;

      // Don't record if prices are the same
      if (params.oldPrice !== undefined && params.oldPrice === params.newPrice) return;

      try {
        await bridgeInvoke({
          table: BRIDGE_TABLE,
          operation: 'insert',
          data: {
            product_id: params.productId,
            product_sku: params.productSku || null,
            product_name: params.productName || null,
            old_price: params.oldPrice ?? null,
            new_price: params.newPrice,
            source: params.source || "manual",
          },
        });

        // Refresh history after recording
        fetchHistory();
      } catch (err) {
        console.error("Error recording price change:", err);
      }
    },
    [user, fetchHistory]
  );

  return { history, isLoading, recordPriceChange, refetch: fetchHistory };
}
