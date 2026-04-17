/**
 * PerformanceDashboard — Admin-only dashboard showing real production Web Vitals data.
 * Aggregates LCP/INP/CLS/FCP/TTFB from the `web_vitals` table via SECURITY DEFINER RPC.
 */
import { useState } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebVitalsSummary } from "@/hooks/useWebVitalsSummary";
import { VitalsKpiGrid } from "@/components/admin/performance/VitalsKpiGrid";
import { VitalsDistributionChart } from "@/components/admin/performance/VitalsDistributionChart";
import { VitalsTrendChart } from "@/components/admin/performance/VitalsTrendChart";
import { SlowestPagesTable } from "@/components/admin/performance/SlowestPagesTable";

const RANGES = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

export default function PerformanceDashboard() {
  const [days, setDays] = useState("7");
  const { data, isLoading, isFetching, refetch, error } = useWebVitalsSummary(Number(days));

  return (
    <MainLayout>
      <PageSEO
        title="Performance Runtime"
        description="Análise de Core Web Vitals (LCP, INP, CLS) com dados reais de produção."
        path="/admin/performance"
        noIndex
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-tight">Performance Runtime</h1>
              <p className="text-xs text-muted-foreground">
                Core Web Vitals (LCP, INP, CLS, FCP, TTFB) com dados reais de produção.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={days} onValueChange={setDays}>
              <TabsList className="h-9">
                {RANGES.map((r) => (
                  <TabsTrigger key={r.value} value={r.value} className="text-xs px-3">
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-destructive">
                Erro ao carregar métricas: {(error as Error).message}
              </p>
            </CardContent>
          </Card>
        ) : !data || data.total_samples === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-sm font-medium">Sem dados de Web Vitals para o período selecionado.</p>
              <p className="text-xs text-muted-foreground">
                As métricas são coletadas automaticamente em produção. Aguarde tráfego real ou amplie o range.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {data.total_samples.toLocaleString("pt-BR")} amostras coletadas nos últimos {data.days} dias.
            </div>

            <VitalsKpiGrid percentiles={data.percentiles} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <VitalsDistributionChart distribution={data.distribution} />
              <VitalsTrendChart trend={data.daily_trend} />
            </div>

            <SlowestPagesTable pages={data.slowest_pages} />
          </>
        )}
      </div>
    </MainLayout>
  );
}
