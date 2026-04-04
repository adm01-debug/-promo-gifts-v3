import { TrendingUp, FileText, ShoppingCart, DollarSign, Target, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { useCommercialKPIs } from "@/hooks/useCommercialIntelligence";
import { Skeleton } from "@/components/ui/skeleton";

export function IntelligenceOverview({ days = 30, categoryId, supplierId }: { days?: number; categoryId?: string | null; supplierId?: string | null }) {
  const { data: kpis, isLoading } = useCommercialKPIs(days, categoryId, supplierId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Faturamento Total"
          value={formatCurrency(kpis.totalRevenue)}
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
          subtitle={`${formatCurrency(kpis.revenueThisMonth)} este mês`}
        />
        <KpiCard
          title="Pedidos"
          value={kpis.totalOrders}
          icon={ShoppingCart}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          subtitle={`${kpis.ordersThisMonth} este mês`}
        />
        <KpiCard
          title="Orçamentos"
          value={kpis.totalQuotes}
          icon={FileText}
          iconColor="text-warning"
          iconBg="bg-warning/10"
          subtitle={`${kpis.quotesThisMonth} este mês`}
        />
        <KpiCard
          title="Conversão"
          value={`${kpis.conversionRate}%`}
          icon={Target}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          subtitle={`Ticket médio: ${formatCurrency(kpis.averageTicket)}`}
        />
      </div>
    </div>
  );
}