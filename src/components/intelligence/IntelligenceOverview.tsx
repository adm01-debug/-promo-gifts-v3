import { TrendingUp, FileText, ShoppingCart, DollarSign, Target, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { useCommercialKPIs } from "@/hooks/useCommercialIntelligence";
import { Skeleton } from "@/components/ui/skeleton";

export function IntelligenceOverview({ days = 30 }: { days?: number }) {
  const { data: kpis, isLoading } = useCommercialKPIs(days);

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
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          subtitle={`${formatCurrency(kpis.revenueThisMonth)} este mês`}
        />
        <KpiCard
          title="Pedidos"
          value={kpis.totalOrders}
          icon={ShoppingCart}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          subtitle={`${kpis.ordersThisMonth} este mês`}
        />
        <KpiCard
          title="Orçamentos"
          value={kpis.totalQuotes}
          icon={FileText}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          subtitle={`${kpis.quotesThisMonth} este mês`}
        />
        <KpiCard
          title="Conversão"
          value={`${kpis.conversionRate}%`}
          icon={Target}
          iconColor="text-violet-500"
          iconBg="bg-violet-500/10"
          subtitle={`Ticket médio: ${formatCurrency(kpis.averageTicket)}`}
        />
      </div>
    </div>
  );
}
