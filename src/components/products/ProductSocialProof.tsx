import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Eye, Zap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductSocialProofProps {
  productId: string;
  totalStock: number;
  className?: string;
}

/**
 * Displays social proof indicators:
 * - View count from product_views table
 * - Urgency alert when stock is low
 */
export function ProductSocialProof({ productId, totalStock, className }: ProductSocialProofProps) {
  const { data: viewCount = 0 } = useQuery({
    queryKey: ["product-views-count", productId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count } = await supabase
        .from("product_views")
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const showViews = viewCount > 3;
  const showUrgency = totalStock > 0 && totalStock <= 50;

  if (!showViews && !showUrgency) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {showViews && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-info/10 text-info"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Orçado {viewCount}× nos últimos 30 dias</span>
        </motion.div>
      )}

      {showUrgency && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Últimas {totalStock} unidades!</span>
        </motion.div>
      )}
    </div>
  );
}
