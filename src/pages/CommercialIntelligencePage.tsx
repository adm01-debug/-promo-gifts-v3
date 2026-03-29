import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { IntelligenceFilterBar, type IntelligenceFilters } from "@/components/intelligence/IntelligenceFilterBar";
import { MarketIntelligenceChart } from "@/components/intelligence/MarketIntelligenceChart";
import { SalesOverviewChart } from "@/components/intelligence/SalesOverviewChart";
import { Brain } from "lucide-react";

export default function CommercialIntelligencePage() {
  const [filters, setFilters] = useState<IntelligenceFilters>({
    days: 30,
    categoryId: null,
    categoryName: null,
    supplierId: null,
    supplierName: null,
  });

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
            <p className="text-sm text-muted-foreground">Comportamento do mercado + vendas internas · visão macro</p>
          </div>
        </div>

        {/* Filters */}
        <IntelligenceFilterBar filters={filters} onFiltersChange={setFilters} />

        {/* Market Intelligence — what competitors/market is buying */}
        <MarketIntelligenceChart days={filters.days} supplierId={filters.supplierId} />

        {/* Internal Sales — our sales macro */}
        <SalesOverviewChart days={filters.days} />
      </div>
    </MainLayout>
  );
}
