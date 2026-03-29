import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplierSales } from "@/hooks/useCommercialIntelligence";

export function SupplierSales({ days = 30, categoryId, supplierId }: { days?: number; categoryId?: string | null; supplierId?: string | null }) {
  const { data: suppliers, isLoading } = useSupplierSales(days, categoryId, supplierId);

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

  if (!suppliers?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Truck className="h-3.5 w-3.5 text-white" />
            </div>
            📦 Vendas por Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma venda no período.</p>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...suppliers.map(s => s.revenue));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Truck className="h-3.5 w-3.5 text-white" />
          </div>
          📦 Vendas por Fornecedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suppliers.map((supplier, i) => {
          const pct = maxRevenue > 0 ? (supplier.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={supplier.supplierName + i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1 mr-2 font-medium">{supplier.supplierName}</span>
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(supplier.revenue)}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {supplier.productCount} prod. · {supplier.orderCount} itens
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
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
