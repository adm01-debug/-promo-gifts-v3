import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { IntelligenceOverview } from "@/components/intelligence/IntelligenceOverview";
import { TrendingProducts } from "@/components/intelligence/TrendingProducts";
import { OpportunityFinder } from "@/components/intelligence/OpportunityFinder";
import { SegmentAnalysis } from "@/components/intelligence/SegmentAnalysis";
import { RevenueTrendChart } from "@/components/intelligence/RevenueTrendChart";
import { MostViewedProducts } from "@/components/intelligence/MostViewedProducts";
import { Brain } from "lucide-react";

export default function CommercialIntelligencePage() {
  return (
    <MainLayout>
      <PageSEO
        title="Inteligência Comercial"
        description="Painel estratégico com insights para decisões comerciais."
        path="/inteligencia-comercial"
        noIndex
      />
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Inteligência Comercial</h1>
            <p className="text-sm text-muted-foreground">Insights estratégicos para acelerar suas vendas</p>
          </div>
        </div>

        {/* KPIs */}
        <IntelligenceOverview />

        {/* Trend Chart */}
        <RevenueTrendChart />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendingProducts />
          <OpportunityFinder />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SegmentAnalysis />
          <MostViewedProducts />
        </div>
      </div>
    </MainLayout>
  );
}
