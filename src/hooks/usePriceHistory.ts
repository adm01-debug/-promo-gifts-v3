/**
 * Hook for product price history via external DB bridge.
 * Reads from price_history table in the external catalog DB.
 * 
 * The external price_history table uses variant_id (not product_id).
 * This hook first resolves product → variant_ids, then queries price_history.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PriceHistoryEntry {
  id: string;
  variant_id: string;
  variant_sku?: string | null;
  old_price: number | null;
  new_price: number;
  price_type?: string | null;
  changed_at?: string | null;
  source?: string | null;
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
    if (!productId || !user) return;
    setIsLoading(true);
    try {
      // Step 1: Get variant IDs for this product
      const variantsResult = await bridgeInvoke({
        table: 'product_variants',
        operation: 'select',
        select: 'id',
        filters: { product_id: productId },
        limit: 50,
      });

      const variantIds = (variantsResult.data?.records || []).map(
        (v: { id: string }) => v.id
      );

      if (variantIds.length === 0) {
        setHistory([]);
        return;
      }

      // Step 2: Query price_history by variant_id(s)
      const result = await bridgeInvoke({
        table: BRIDGE_TABLE,
        operation: 'select',
        filters: { variant_id: variantIds.length === 1 ? variantIds[0] : variantIds },
        limit: 200,
        orderBy: { column: 'changed_at', ascending: true },
      });

      setHistory((result.data?.records as PriceHistoryEntry[]) || []);
    } catch (err) {
      console.error("Error fetching price history:", err);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [productId, user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * Records a price change for a variant.
   */
  const recordPriceChange = useCallback(
    async (params: {
      variantId: string;
      oldPrice?: number;
      newPrice: number;
      priceType?: string;
      source?: string;
    }) => {
      if (!user) return;
      if (params.oldPrice !== undefined && params.oldPrice === params.newPrice) return;

      try {
        await bridgeInvoke({
          table: BRIDGE_TABLE,
          operation: 'insert',
          data: {
            variant_id: params.variantId,
            old_price: params.oldPrice ?? null,
            new_price: params.newPrice,
            price_type: params.priceType || 'cost',
            source: params.source || 'manual',
          },
        });
        fetchHistory();
      } catch (err) {
        console.error("Error recording price change:", err);
      }
    },
    [user, fetchHistory]
  );

  return { history, isLoading, recordPriceChange, refetch: fetchHistory };
}
