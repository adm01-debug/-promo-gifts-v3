import { DollarSign, ShoppingCart, Receipt, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/ui/kpi-card";
import { useCommercialKPIs } from "@/hooks/useCommercialIntelligence";

interface Props {
  days: number;
  categoryId?: string | null;
  supplierId?: string | null;
  categoryName?: string | null;
  supplierName?: string | null;
}

export function IntelligenceKPICards({ days, categoryId, supplierId, categoryName, supplierName }: Props) {
  const { data: kpis, isLoading } = useCommercialKPIs(days, categoryId, supplierId);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const filterLabel = categoryName || supplierName || null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Resumo</span>
          {filterLabel && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
              {filterLabel}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
            {days} dias
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard
            icon={DollarSign}
            label="Faturamento"
            value={formatCurrency(kpis.totalRevenue)}
            sub={`${formatCurrency(kpis.revenueThisMonth)} este mês`}
            highlight
          />
          <KpiCard
            icon={ShoppingCart}
            label="Pedidos"
            value={String(kpis.totalOrders)}
            sub={`${kpis.ordersThisMonth} este mês`}
          />
          <KpiCard
            icon={Receipt}
            label="Orçamentos"
            value={String(kpis.totalQuotes)}
            sub={`${kpis.quotesThisMonth} este mês`}
          />
          <KpiCard
            icon={TrendingUp}
            label="Conversão"
            value={`${kpis.conversionRate}%`}
            sub="orçamento → pedido"
            highlight={kpis.conversionRate >= 50}
            warning={kpis.conversionRate > 0 && kpis.conversionRate < 30}
            alert={kpis.conversionRate === 0 && kpis.totalQuotes > 0}
          />
          <KpiCard
            icon={DollarSign}
            label="Ticket Médio"
            value={formatCurrency(kpis.averageTicket)}
            sub="por pedido"
          />
        </div>
      </CardContent>
    </Card>
  );
}
