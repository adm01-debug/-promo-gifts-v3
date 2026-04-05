import { TrendingUp, TrendingDown, Minus, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingProducts } from "@/hooks/useCommercialIntelligence";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TrendingProducts({ days = 30, categoryId, supplierId, productId, categoryName }: { days?: number; categoryId?: string | null; supplierId?: string | null; productId?: string | null; categoryName?: string | null }) {
  const { data: products, isLoading } = useTrendingProducts(days, categoryId, supplierId, productId, 7);
  const navigate = useNavigate();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const trendIcon = {
    up: <TrendingUp className="h-3 w-3 text-primary" />,
    down: <TrendingDown className="h-3 w-3 text-destructive" />,
    stable: <Minus className="h-3 w-3 text-muted-foreground" />,
  };

  const hasData = !!(products?.length);


  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
              🔥 Produtos em Alta
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {categoryName ? `Top em "${categoryName}"` : 'Top 7 por faturamento'} · {days} dias
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!hasData ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Sem dados de vendas para o período</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {products!.map((product, index) => (
              <div
                key={product.productSku || product.productId}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => product.productId && navigate(`/produto/${product.productId}`)}
              >
                {/* Rank */}
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  index === 0 && "bg-amber-500/20 text-amber-600",
                  index === 1 && "bg-slate-300/30 text-slate-500",
                  index === 2 && "bg-orange-400/20 text-orange-600",
                  index > 2 && "bg-muted text-muted-foreground",
                )}>
                  {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                </span>

                {/* Image */}
                <div className="w-9 h-9 rounded-md overflow-hidden bg-muted border border-border/50 shrink-0">
                  {product.productImage ? (
                    
<img src={product.productImage} alt="Imagem do produto" className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{product.productName}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{product.totalQuantity.toLocaleString('pt-BR')} un.</span>
                    <span>·</span>
                    <span>{product.orderCount} ped.</span>
                  </div>
                </div>

                {/* Revenue + Trend */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold">{formatCurrency(product.totalRevenue)}</p>
                  <div className="flex items-center gap-1 justify-end">
                    {trendIcon[product.trend]}
                    <span className="text-[9px] text-muted-foreground">{product.conversionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
