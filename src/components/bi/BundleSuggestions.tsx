/**
 * BundleSuggestions — "Compram juntos com o que esse cliente já levou"
 * Usa RPC get_bundle_suggestions(_product_id) sobre o top produto do cliente.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package2, ShoppingBasket, TrendingUp } from "lucide-react";
import { useClientAffinity } from "@/hooks/bi/useClientAffinity";

interface Props {
  clientId: string;
}

interface BundleRow {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  cooccurrence_count: number;
  frequency_percent: number;
}

export function BundleSuggestions({ clientId }: Props) {
  const affinity = useClientAffinity(clientId);
  const anchorProduct = affinity.data?.topProducts?.[0];
  const anchorId = anchorProduct?.product_id ?? null;
  const anchorName = anchorProduct?.product_name ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["bi-bundle-suggestions", anchorId],
    enabled: !!anchorId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<BundleRow[]> => {
      if (!anchorId) return [];
      const { data, error } = await supabase.rpc("get_bundle_suggestions", { _product_id: anchorId });
      if (error || !Array.isArray(data)) return [];
      return data as BundleRow[];
    },
  });

  if (!anchorId) return null;
  if (isLoading) {
    return (
      <Card className="border-[1.5px]">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <Card className="border-[1.5px]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShoppingBasket className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Compram juntos com {anchorName}</h2>
              <p className="text-xs text-muted-foreground">
                Bundles sugeridos a partir de pedidos reais de outros clientes que compraram este produto
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]">
            <TrendingUp className="h-3 w-3" /> Cross-sell
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.map((b) => (
            <div
              key={b.product_id}
              className="p-3 rounded-lg border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {b.product_image_url ? (
                <div className="aspect-square rounded-md overflow-hidden bg-muted/40 mb-2 border">
                  <img
                    src={b.product_image_url}
                    alt={b.product_name}
                    loading="lazy"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-square rounded-md bg-muted/40 flex items-center justify-center mb-2">
                  <Package2 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="text-xs font-medium line-clamp-2 leading-snug min-h-[2rem]">
                {b.product_name}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{b.cooccurrence_count}× junto</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {Math.round(b.frequency_percent)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
