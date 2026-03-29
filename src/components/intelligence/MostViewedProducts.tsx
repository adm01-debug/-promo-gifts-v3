import { Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMostViewedProducts } from "@/hooks/useCommercialIntelligence";

export function MostViewedProducts({ days = 30, categoryId, supplierId }: { days?: number; categoryId?: string | null; supplierId?: string | null }) {
  const { data: products, isLoading } = useMostViewedProducts(days, categoryId, supplierId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
        </CardContent>
      </Card>
    );
  }

  if (!products?.length) return null;

  const maxViews = Math.max(...products.map(p => p.viewCount));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Eye className="h-3.5 w-3.5 text-white" />
          </div>
          👁️ Mais Visualizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {products.map((product, i) => {
          const pct = maxViews > 0 ? (product.viewCount / maxViews) * 100 : 0;
          return (
            <div key={product.productId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1 mr-2">{product.productName}</span>
                <span className="text-xs text-muted-foreground font-medium shrink-0">{product.viewCount} views</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
