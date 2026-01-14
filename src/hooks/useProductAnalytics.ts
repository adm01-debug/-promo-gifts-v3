import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TrackViewParams {
  productId?: string;
  productSku?: string;
  productName: string;
  viewType: "detail" | "card" | "compare" | "favorite";
}

interface TrackSearchParams {
  searchTerm: string;
  resultsCount: number;
  filtersUsed?: Record<string, unknown>;
}

export function useProductAnalytics() {
  const { user } = useAuth();

  const trackProductView = useCallback(
    async ({ productId, productSku, productName, viewType }: TrackViewParams) => {
      if (!user?.id) return;

      try {
        // Using type assertion since table was just created
        const { error } = await (supabase.from("product_views") as any).insert({
          product_id: productId,
          product_sku: productSku,
          product_name: productName,
          seller_id: user.id,
          view_type: viewType,
        });
        
        // Ignore conflict errors (409) - this is expected behavior for analytics
        if (error && error.code !== '23505' && error.message?.indexOf('409') === -1) {
          console.error("Error tracking product view:", error);
        }
      } catch (error) {
        // Silently ignore tracking errors to not affect UX
        console.warn("Analytics tracking failed:", error);
      }
    },
    [user?.id]
  );

  const trackSearch = useCallback(
    async ({ searchTerm, resultsCount, filtersUsed = {} }: TrackSearchParams) => {
      if (!user?.id || !searchTerm.trim()) return;

      try {
        // Using type assertion since table was just created
        await (supabase.from("search_analytics") as any).insert({
          search_term: searchTerm.toLowerCase().trim(),
          results_count: resultsCount,
          seller_id: user.id,
          filters_used: filtersUsed,
        });
      } catch (error) {
        console.error("Error tracking search:", error);
      }
    },
    [user?.id]
  );

  return { trackProductView, trackSearch };
}
