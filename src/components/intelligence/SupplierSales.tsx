import { Truck, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplierSales } from "@/hooks/useCommercialIntelligence";
import { cn } from "@/lib/utils";

export function SupplierSales({ days = 30, categoryId, supplierId, productId, categoryName }: { days?: number; categoryId?: string | null; supplierId?: string | null; productId?: string | null; categoryName?: string | null }) {
  const { data: suppliers, isLoading } = useSupplierSales(days, categoryId, supplierId, productId);

  const hasData = !!(suppliers?.length);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);


  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = hasData ? Math.max(...suppliers!.map(s => s.revenue)) : 0;
  const totalRevenue = hasData ? suppliers!.reduce((s, su) => s + su.revenue, 0) : 0;

  // Use opacity-based approach so bars follow the skin
  const getBarOpacity = (i: number) => Math.max(1 - i * 0.07, 0.4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Truck className="h-3.5 w-3.5 text-white" />
              </div>
              📦 Vendas por Fornecedor
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {categoryName ? `Fornecedores de "${categoryName}"` : 'Faturamento por fornecedor'} · {days} dias
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {!hasData ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Sem dados de vendas para o período</p>
          </div>
        ) : (
          suppliers!.map((supplier, i) => {
            const pct = maxRevenue > 0 ? (supplier.revenue / maxRevenue) * 100 : 0;
            const share = totalRevenue > 0 ? ((supplier.revenue / totalRevenue) * 100).toFixed(1) : '0';
            return (
              <div key={supplier.supplierName + i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 truncate flex-1 mr-2">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      i < 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </span>
                    <span className="font-medium truncate text-xs">{supplier.supplierName}</span>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {share}%
                    </Badge>
                    <span className="text-xs font-semibold text-foreground">{formatCurrency(supplier.revenue)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                        barColors[i % barColors.length]
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 w-20 text-right">
                    {supplier.productCount} prod. · {supplier.orderCount} it.
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
