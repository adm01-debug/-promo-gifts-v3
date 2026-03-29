import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { IntelligenceOverview } from "@/components/intelligence/IntelligenceOverview";
import { TrendingProducts } from "@/components/intelligence/TrendingProducts";
import { OpportunityFinder } from "@/components/intelligence/OpportunityFinder";
import { SegmentAnalysis } from "@/components/intelligence/SegmentAnalysis";
import { RevenueTrendChart } from "@/components/intelligence/RevenueTrendChart";
import { MostViewedProducts } from "@/components/intelligence/MostViewedProducts";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "15d", days: 15 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "120d", days: 120 },
  { label: "150d", days: 150 },
  { label: "180d", days: 180 },
  { label: "1 ano", days: 360 },
];

export default function CommercialIntelligencePage() {
  const [days, setDays] = useState(30);

  return (
    <MainLayout>
      <PageSEO
        title="Inteligência Comercial"
        description="Painel estratégico com insights para decisões comerciais."
        path="/inteligencia-comercial"
        noIndex
      />
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header + Period Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Inteligência Comercial</h1>
              <p className="text-sm text-muted-foreground">Insights estratégicos para acelerar suas vendas</p>
            </div>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/50 overflow-x-auto">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p.days}
                variant={days === p.days ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs px-2.5 rounded-lg shrink-0 transition-all",
                  days === p.days && "bg-primary shadow-sm"
                )}
                onClick={() => setDays(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <IntelligenceOverview days={days} />

        {/* Trend Chart */}
        <RevenueTrendChart days={days} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendingProducts days={days} />
          <OpportunityFinder days={days} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SegmentAnalysis days={days} />
          <MostViewedProducts days={days} />
        </div>
      </div>
    </MainLayout>
  );
}
