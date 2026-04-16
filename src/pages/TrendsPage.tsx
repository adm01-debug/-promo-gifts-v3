import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { untypedFrom } from "@/lib/supabase-untyped";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, Search, Package, Calendar, RefreshCw } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import { ActivityChart, ProductsTabContent, SearchesTabContent } from "./trends/TrendsCharts";
import { TrendsKpiCards } from "./trends/TrendsKpiCards";
import { UnmetDemandCard } from "@/components/intelligence/UnmetDemandCard";
import { ConversionFunnel } from "@/components/intelligence/ConversionFunnel";
import { calculateTrendingScore } from "@/lib/trending-score";

type DateRange = "7d" | "30d" | "90d";

const RANGE_TO_DAYS: Record<DateRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

interface ProductView {
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  view_type: string | null;
  created_at: string;
}

interface SearchRow {
  search_term: string;
  results_count: number;
  created_at: string;
}

interface AggregatedProduct {
  id: string;
  name: string;
  sku?: string;
  views: number;
  details: number;
  compares: number;
  favorites: number;
  recentViews: number;
  baselineViews: number;
  trendingScore: number;
  classification: 'rising' | 'stable' | 'falling' | 'new';
}

interface AggregatedSearch {
  term: string;
  count: number;
  totalResults: number;
  avgResults: number;
}

export default function TrendsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const days = RANGE_TO_DAYS[dateRange];

  // Janelas: período atual + período anterior (para deltas)
  const { sinceCurrent, sincePrevious, recentCutoff } = useMemo(() => {
    const now = new Date();
    return {
      sinceCurrent: subDays(now, days).toISOString(),
      sincePrevious: subDays(now, days * 2).toISOString(),
      // Para trending score: "recente" = últimos 1/3 da janela
      recentCutoff: subDays(now, Math.max(Math.floor(days / 3), 1)).toISOString(),
    };
  }, [days]);

  // ============================================
  // Top Products (com trending score)
  // ============================================
  const { data: topProducts, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["trends-products", dateRange],
    queryFn: async (): Promise<AggregatedProduct[]> => {
      const { data, error } = await untypedFrom("product_views")
        .select("product_id, product_name, product_sku, view_type, created_at")
        .gte("created_at", sincePrevious)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const productMap = new Map<string, AggregatedProduct>();
      const recentDays = Math.max(Math.floor(days / 3), 1);
      const baselineDays = days - recentDays;

      (data ?? []).forEach((view: ProductView) => {
        const key = view.product_id || view.product_name;
        if (!key) return;
        const isInCurrentWindow = view.created_at >= sinceCurrent;
        const isRecent = view.created_at >= recentCutoff;

        const existing = productMap.get(key) ?? {
          id: key,
          name: view.product_name ?? "Produto",
          sku: view.product_sku ?? undefined,
          views: 0, details: 0, compares: 0, favorites: 0,
          recentViews: 0, baselineViews: 0,
          trendingScore: 0, classification: 'stable' as const,
        };

        if (isInCurrentWindow) {
          existing.views += 1;
          if (view.view_type === "detail") existing.details += 1;
          if (view.view_type === "compare") existing.compares += 1;
          if (view.view_type === "favorite") existing.favorites += 1;
          if (isRecent) existing.recentViews += 1;
        } else {
          existing.baselineViews += 1;
        }
        productMap.set(key, existing);
      });

      // Calcula trending score
      const enriched = Array.from(productMap.values()).map(p => {
        const score = calculateTrendingScore({
          recentCount: p.recentViews,
          baselineCount: p.baselineViews,
          recentDays,
          baselineDays,
          totalVolume: p.views,
        });
        return { ...p, trendingScore: score.score, classification: score.classification };
      });

      // Ordena por score combinado: trending score * log(volume + 1)
      return enriched
        .filter(p => p.views > 0)
        .sort((a, b) => {
          const aScore = a.trendingScore * Math.log(a.views + 1);
          const bScore = b.trendingScore * Math.log(b.views + 1);
          return bScore - aScore;
        })
        .slice(0, 10);
    },
  });

  // ============================================
  // Top Searches (atual + anterior)
  // ============================================
  const { data: searchesData, isLoading: loadingSearches, refetch: refetchSearches } = useQuery({
    queryKey: ["trends-searches", dateRange],
    queryFn: async () => {
      const { data, error } = await untypedFrom("search_analytics")
        .select("search_term, results_count, created_at")
        .gte("created_at", sincePrevious)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const current = new Map<string, { count: number; totalResults: number }>();
      const previous = new Map<string, { count: number }>();

      (data ?? []).forEach((s: SearchRow) => {
        const term = (s.search_term ?? "").toLowerCase().trim();
        if (!term) return;
        if (s.created_at >= sinceCurrent) {
          const e = current.get(term) ?? { count: 0, totalResults: 0 };
          e.count += 1;
          e.totalResults += s.results_count ?? 0;
          current.set(term, e);
        } else {
          const e = previous.get(term) ?? { count: 0 };
          e.count += 1;
          previous.set(term, e);
        }
      });

      const currentArr: AggregatedSearch[] = Array.from(current.entries())
        .map(([term, d]) => ({
          term,
          count: d.count,
          totalResults: d.totalResults,
          avgResults: d.count > 0 ? Math.round(d.totalResults / d.count) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { current: currentArr, previousMap: previous, allCurrent: Array.from(current.values()) };
    },
  });

  const topSearches = searchesData?.current;

  // ============================================
  // Daily activity
  // ============================================
  const { data: dailyTrends, isLoading: loadingDaily } = useQuery({
    queryKey: ["trends-daily", dateRange],
    queryFn: async () => {
      const [{ data: views, error: ve }, { data: searches, error: se }] = await Promise.all([
        untypedFrom("product_views").select("created_at").gte("created_at", sinceCurrent),
        untypedFrom("search_analytics").select("created_at").gte("created_at", sinceCurrent),
      ]);
      if (ve || se) throw ve || se;
      const dayMap = new Map<string, { date: string; views: number; searches: number }>();
      for (let i = days - 1; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        dayMap.set(d, { date: d, views: 0, searches: 0 });
      }
      views?.forEach((v: { created_at: string }) => {
        const d = format(new Date(v.created_at), "yyyy-MM-dd");
        const e = dayMap.get(d); if (e) e.views += 1;
      });
      searches?.forEach((s: { created_at: string }) => {
        const d = format(new Date(s.created_at), "yyyy-MM-dd");
        const e = dayMap.get(d); if (e) e.searches += 1;
      });
      return Array.from(dayMap.values()).map(d => ({
        ...d,
        dateLabel: format(new Date(d.date), "dd/MM", { locale: ptBR }),
      }));
    },
  });

  // ============================================
  // KPIs atuais e anteriores (para deltas)
  // ============================================
  const { data: kpiSnapshot } = useQuery({
    queryKey: ["trends-kpi-snapshot", dateRange],
    queryFn: async () => {
      const [{ data: vAll }, { data: sAll }] = await Promise.all([
        untypedFrom("product_views").select("product_id, product_name, created_at").gte("created_at", sincePrevious),
        untypedFrom("search_analytics").select("search_term, created_at").gte("created_at", sincePrevious),
      ]);
      const split = (
        rows: Array<{ created_at: string }>,
        keyFn: (r: any) => string | null, // eslint-disable-line @typescript-eslint/no-explicit-any
      ) => {
        let curTotal = 0, prevTotal = 0;
        const curUnique = new Set<string>(), prevUnique = new Set<string>();
        rows?.forEach(r => {
          const k = keyFn(r);
          if (r.created_at >= sinceCurrent) {
            curTotal += 1;
            if (k) curUnique.add(k);
          } else {
            prevTotal += 1;
            if (k) prevUnique.add(k);
          }
        });
        return { curTotal, prevTotal, curUnique: curUnique.size, prevUnique: prevUnique.size };
      };
      const v = split(vAll ?? [], (r) => r.product_id || r.product_name);
      const s = split(sAll ?? [], (r) => (r.search_term ?? "").toLowerCase());
      return {
        current: {
          totalViews: v.curTotal,
          totalSearches: s.curTotal,
          uniqueProducts: v.curUnique,
          uniqueSearches: s.curUnique,
        },
        previous: {
          totalViews: v.prevTotal,
          totalSearches: s.prevTotal,
          uniqueProducts: v.prevUnique,
          uniqueSearches: s.prevUnique,
        },
      };
    },
  });

  const kpiCurrent = kpiSnapshot?.current ?? { totalViews: 0, totalSearches: 0, uniqueProducts: 0, uniqueSearches: 0 };
  const kpiPrevious = kpiSnapshot?.previous ?? { totalViews: 0, totalSearches: 0, uniqueProducts: 0, uniqueSearches: 0 };

  const handleRefresh = () => { refetchProducts(); refetchSearches(); };

  return (
    <MainLayout>
      <PageSEO title="Tendências" description="Analise tendências de produtos e buscas." path="/tendencias" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary" />
              Análise de Tendências
            </h1>
            <p className="text-muted-foreground mt-1">
              Crescimento, conversão e demanda reprimida em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[140px]"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Atualizar"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* KPIs com deltas */}
        <TrendsKpiCards current={kpiCurrent} previous={kpiPrevious} />

        {/* Funil + Demanda Reprimida */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConversionFunnel days={days} />
          <UnmetDemandCard days={days} />
        </div>

        <ActivityChart dailyTrends={dailyTrends} isLoading={loadingDaily} />

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" />Produtos em alta</TabsTrigger>
            <TabsTrigger value="searches" className="gap-2"><Search className="h-4 w-4" />Termos mais buscados</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="space-y-4">
            <ProductsTabContent topProducts={topProducts} isLoading={loadingProducts} />
          </TabsContent>
          <TabsContent value="searches" className="space-y-4">
            <SearchesTabContent topSearches={topSearches} isLoading={loadingSearches} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
