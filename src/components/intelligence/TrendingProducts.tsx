import { TrendingUp, TrendingDown, Minus, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingProducts } from "@/hooks/useCommercialIntelligence";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TrendingProducts() {
  const { data: products, isLoading } = useTrendingProducts();
  const navigate = useNavigate();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const trendIcon = {
    up: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
    down: <TrendingDown className="h-3.5 w-3.5 text-red-500" />,
    stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  if (!products?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Ainda não há dados de vendas para ranquear produtos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          🔥 Produtos em Alta
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {products.map((product, index) => (
            <div
              key={product.productSku || product.productId}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => product.productId && navigate(`/produto/${product.productId}`)}
            >
              {/* Rank */}
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                index === 0 && "bg-amber-500/20 text-amber-600",
                index === 1 && "bg-slate-300/30 text-slate-500",
                index === 2 && "bg-orange-400/20 text-orange-600",
                index > 2 && "bg-muted text-muted-foreground",
              )}>
                {index + 1}
              </span>

              {/* Image */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border/50 shrink-0">
                {product.productImage ? (
                  <img src={product.productImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.productName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{product.totalQuantity} un.</span>
                  <span>·</span>
                  <span>{product.orderCount} pedidos</span>
                </div>
              </div>

              {/* Revenue + Trend */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</p>
                <div className="flex items-center gap-1 justify-end">
                  {trendIcon[product.trend]}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {product.conversionRate}% conv.
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
