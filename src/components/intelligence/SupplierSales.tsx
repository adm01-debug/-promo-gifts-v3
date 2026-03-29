import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplierSales } from "@/hooks/useCommercialIntelligence";

interface SupplierSaleData {
  supplierName: string;
  orderCount: number;
  revenue: number;
  productCount: number;
}

const MOCK_SUPPLIER_SALES: SupplierSaleData[] = [
  { supplierName: 'Brasil Brindes', orderCount: 142, revenue: 89400, productCount: 38 },
  { supplierName: 'Master Promo', orderCount: 98, revenue: 67200, productCount: 25 },
  { supplierName: 'Premium Gifts', orderCount: 76, revenue: 54800, productCount: 19 },
  { supplierName: 'XBZ Distribuidora', orderCount: 54, revenue: 38500, productCount: 31 },
  { supplierName: 'Top Line Brindes', orderCount: 41, revenue: 28900, productCount: 14 },
  { supplierName: 'Criative Promo', orderCount: 28, revenue: 19200, productCount: 11 },
];

export function SupplierSales({ days = 30, categoryId, supplierId, productId, categoryName }: { days?: number; categoryId?: string | null; supplierId?: string | null; productId?: string | null; categoryName?: string | null }) {
  const { data: realSuppliers, isLoading } = useSupplierSales(days, categoryId, supplierId);

  const hasRealData = !!(realSuppliers?.length);
  const isDemo = !hasRealData && !isLoading;
  const suppliers = hasRealData ? realSuppliers : MOCK_SUPPLIER_SALES;

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

  const maxRevenue = Math.max(...suppliers.map(s => s.revenue));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Truck className="h-3.5 w-3.5 text-white" />
          </div>
          📦 Vendas por Fornecedor
          {isDemo && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">demo</Badge>}
        </CardTitle>
        <CardDescription className="text-xs">
          {categoryName ? `Fornecedores de "${categoryName}"` : 'Faturamento acumulado por fornecedor'} · {days} dias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suppliers.map((supplier, i) => {
          const pct = maxRevenue > 0 ? (supplier.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={supplier.supplierName + i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 truncate flex-1 mr-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-medium truncate">{supplier.supplierName}</span>
                </div>
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
