import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useBIMetrics } from "@/hooks/useBIMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, MiniStatCard } from "@/components/ui/stat-card";
import { SalesGoalsCard } from "@/components/goals/SalesGoalsCard";
import { NoveltiesSection } from "@/components/novelties/NoveltiesSection";
import { Package, Palette, Layers, DollarSign, Star, Percent, Factory, FolderOpen, CheckCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CategoryChart, StockStatusChart, PriceRangeChart,
  ColorsSection, BottomSection, RecentProductsCard,
} from "./bi-dashboard/BIDashboardCharts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default function BIDashboard() {
  const { data: metrics, isLoading } = useBIMetrics();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <PageSEO title="Dashboard BI" description="Painel de Business Intelligence com métricas e indicadores do catálogo." path="/bi" noIndex />

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard de Produtos</h1>
          <p className="text-muted-foreground mt-1">Visão geral do catálogo de produtos</p>
        </div>

        <NoveltiesSection />

        {/* Main KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</>
          ) : (
            <>
              <StatCard title="Total de Produtos" value={metrics?.totalProducts?.toLocaleString("pt-BR") || "0"} icon={Package} variant="orange" className="cursor-pointer" onClick={() => navigate("/")} />
              <StatCard title="Produtos Ativos" value={metrics?.totalActiveProducts?.toLocaleString("pt-BR") || "0"} subtitle={`${metrics?.totalProducts ? Math.round((metrics.totalActiveProducts / metrics.totalProducts) * 100) : 0}% do total`} icon={CheckCircle} variant="success" />
              <StatCard title="Kits" value={metrics?.totalKits?.toLocaleString("pt-BR") || "0"} icon={Layers} variant="info" />
              <StatCard title="Preço Médio" value={metrics ? formatCurrency(metrics.averagePrice) : "R$ 0,00"} icon={DollarSign} variant="warning" />
            </>
          )}
        </div>

        {/* Secondary KPIs */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {isLoading ? (
            <>{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</>
          ) : (
            <>
              <MiniStatCard title="Destaques" value={metrics?.featuredCount || 0} icon={Star} variant="warning" />
              <MiniStatCard title="Novidades" value={metrics?.newArrivalCount || 0} icon={Sparkles} variant="success" />
              <MiniStatCard title="Em Promoção" value={metrics?.onSaleCount || 0} icon={Percent} variant="danger" />
              <MiniStatCard title="Categorias" value={metrics?.productsByCategory?.length || 0} icon={FolderOpen} variant="info" />
              <MiniStatCard title="Fornecedores" value={metrics?.productsBySupplier?.length || 0} icon={Factory} variant="orange" />
              <MiniStatCard title="Cores" value={metrics?.productsByColor?.length || 0} icon={Palette} variant="default" />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-4">
          <SalesGoalsCard />
          <CategoryChart metrics={metrics} isLoading={isLoading} />
          <StockStatusChart metrics={metrics} isLoading={isLoading} />
        </div>

        <PriceRangeChart metrics={metrics} isLoading={isLoading} />
        <ColorsSection metrics={metrics} isLoading={isLoading} />
        <BottomSection metrics={metrics} isLoading={isLoading} />
        <RecentProductsCard metrics={metrics} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
}
