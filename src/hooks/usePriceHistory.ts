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

export function usePriceHistory(productId: string | undefined) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_price_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setHistory((data as PriceHistoryEntry[]) || []);
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
        await supabase.from("product_price_history").insert({
          product_id: params.productId,
          product_sku: params.productSku || null,
          product_name: params.productName || null,
          old_price: params.oldPrice ?? null,
          new_price: params.newPrice,
          recorded_by: user.id,
          source: params.source || "manual",
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
