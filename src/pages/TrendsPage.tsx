import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { untypedFrom } from "@/lib/supabase-untyped";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, Search, Eye, Package, Calendar, Sparkles, RefreshCw } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import { ActivityChart, ProductsTabContent, SearchesTabContent } from "./trends/TrendsCharts";

type DateRange = "7d" | "30d" | "90d";

export default function TrendsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const dateFilter = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return subDays(new Date(), days).toISOString();
  }, [dateRange]);

  const { data: topProducts, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["trends-products", dateRange],
    queryFn: async () => {
      const { data, error } = await untypedFrom("product_views")
        .select("product_id, product_name, product_sku, view_type")
        .gte("created_at", dateFilter).order("created_at", { ascending: false });
      if (error) throw error;
      const productMap = new Map<string, { name: string; sku?: string; views: number; details: number; compares: number; favorites: number }>();
      data?.forEach((view) => {
        const key = view.product_id || view.product_name;
        const existing = productMap.get(key) || { name: view.product_name, sku: view.product_sku || undefined, views: 0, details: 0, compares: 0, favorites: 0 };
        existing.views++;
        if (view.view_type === "detail") existing.details++;
        if (view.view_type === "compare") existing.compares++;
        if (view.view_type === "favorite") existing.favorites++;
        productMap.set(key, existing);
      });
      return Array.from(productMap.entries()).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.views - a.views).slice(0, 10);
    },
  });

  const { data: topSearches, isLoading: loadingSearches, refetch: refetchSearches } = useQuery({
    queryKey: ["trends-searches", dateRange],
    queryFn: async () => {
      const { data, error } = await untypedFrom("search_analytics")
        .select("search_term, results_count").gte("created_at", dateFilter).order("created_at", { ascending: false });
      if (error) throw error;
      const searchMap = new Map<string, { count: number; avgResults: number; totalResults: number }>();
      data?.forEach((s) => {
        const term = s.search_term.toLowerCase();
        const existing = searchMap.get(term) || { count: 0, avgResults: 0, totalResults: 0 };
        existing.count++;
        existing.totalResults += s.results_count || 0;
        existing.avgResults = Math.round(existing.totalResults / existing.count);
        searchMap.set(term, existing);
      });
      return Array.from(searchMap.entries()).map(([term, d]) => ({ term, ...d })).sort((a, b) => b.count - a.count).slice(0, 10);
    },
  });

  const { data: dailyTrends, isLoading: loadingDaily } = useQuery({
    queryKey: ["trends-daily", dateRange],
    queryFn: async () => {
      const { data: views, error: ve } = await untypedFrom("product_views").select("created_at").gte("created_at", dateFilter);
      const { data: searches, error: se } = await untypedFrom("search_analytics").select("created_at").gte("created_at", dateFilter);
      if (ve || se) throw ve || se;
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const dayMap = new Map<string, { date: string; views: number; searches: number }>();
      for (let i = days - 1; i >= 0; i--) { const d = format(subDays(new Date(), i), "yyyy-MM-dd"); dayMap.set(d, { date: d, views: 0, searches: 0 }); }
      views?.forEach((v) => { const d = format(new Date(v.created_at), "yyyy-MM-dd"); const e = dayMap.get(d); if (e) e.views++; });
      searches?.forEach((s) => { const d = format(new Date(s.created_at), "yyyy-MM-dd"); const e = dayMap.get(d); if (e) e.searches++; });
      return Array.from(dayMap.values()).map(d => ({ ...d, dateLabel: format(new Date(d.date), "dd/MM", { locale: ptBR }) }));
    },
  });

  const stats = useMemo(() => ({
    totalViews: topProducts?.reduce((s, p) => s + p.views, 0) || 0,
    totalSearches: topSearches?.reduce((s, t) => s + t.count, 0) || 0,
    uniqueProducts: topProducts?.length || 0,
    uniqueSearches: topSearches?.length || 0,
  }), [topProducts, topSearches]);

  const handleRefresh = () => { refetchProducts(); refetchSearches(); };

  return (
    <MainLayout>
      <PageSEO title="Tendências" description="Analise tendências de produtos e buscas." path="/tendencias" noIndex />
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary" />Análise de Tendências
            </h1>
            <p className="text-muted-foreground mt-1">Acompanhe os produtos mais buscados e acessados</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Eye, label: "Visualizações", value: stats.totalViews, color: "primary" },
            { icon: Search, label: "Buscas", value: stats.totalSearches, color: "chart-2" },
            { icon: Package, label: "Produtos únicos", value: stats.uniqueProducts, color: "chart-3" },
            { icon: Sparkles, label: "Termos únicos", value: stats.uniqueSearches, color: "chart-4" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className={`bg-gradient-to-br from-${color}/10 to-${color}/5 border-${color}/20`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${color}/20 rounded-lg`}><Icon className={`h-5 w-5 text-${color}`} /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <ActivityChart dailyTrends={dailyTrends} isLoading={loadingDaily} />

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" />Produtos mais vistos</TabsTrigger>
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
