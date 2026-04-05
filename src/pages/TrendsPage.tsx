import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Search, 
  Eye, 
  Package, 
  BarChart3, 
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PageSEO } from "@/components/seo/PageSEO";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

type DateRange = "7d" | "30d" | "90d";

export default function TrendsPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const dateFilter = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return subDays(new Date(), days).toISOString();
  }, [dateRange]);

  // Fetch most viewed products
  const { data: topProducts, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["trends-products", dateRange],
    queryFn: async () => {
      const { data, error } = await untypedFrom("product_views")
        .select("product_id, product_name, product_sku, view_type")
        .gte("created_at", dateFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Aggregate by product
      const productMap = new Map<string, { name: string; sku?: string; views: number; details: number; compares: number; favorites: number }>();
      
      data?.forEach((view) => {
        const key = view.product_id || view.product_name;
        const existing = productMap.get(key) || { 
          name: view.product_name, 
          sku: view.product_sku || undefined, 
          views: 0, 
          details: 0, 
          compares: 0, 
          favorites: 0 
        };
        existing.views++;
        if (view.view_type === "detail") existing.details++;
        if (view.view_type === "compare") existing.compares++;
        if (view.view_type === "favorite") existing.favorites++;
        productMap.set(key, existing);
      });

      return Array.from(productMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    },
  });

  // Fetch top searches
  const { data: topSearches, isLoading: loadingSearches, refetch: refetchSearches } = useQuery({
    queryKey: ["trends-searches", dateRange],
    queryFn: async () => {
      const { data, error } = await untypedFrom("search_analytics")
        .select("search_term, results_count")
        .gte("created_at", dateFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Aggregate by search term
      const searchMap = new Map<string, { count: number; avgResults: number; totalResults: number }>();
      
      data?.forEach((search) => {
        const term = search.search_term.toLowerCase();
        const existing = searchMap.get(term) || { count: 0, avgResults: 0, totalResults: 0 };
        existing.count++;
        existing.totalResults += search.results_count || 0;
        existing.avgResults = Math.round(existing.totalResults / existing.count);
        searchMap.set(term, existing);
      });

      return Array.from(searchMap.entries())
        .map(([term, data]) => ({ term, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Fetch daily trends
  const { data: dailyTrends, isLoading: loadingDaily } = useQuery({
    queryKey: ["trends-daily", dateRange],
    queryFn: async () => {
      const { data: views, error: viewsError } = await untypedFrom("product_views")
        .select("created_at")
        .gte("created_at", dateFilter);

      const { data: searches, error: searchesError } = await untypedFrom("search_analytics")
        .select("created_at")
        .gte("created_at", dateFilter);

      if (viewsError || searchesError) throw viewsError || searchesError;

      // Group by day
      const dayMap = new Map<string, { date: string; views: number; searches: number }>();
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;

      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        dayMap.set(date, { date, views: 0, searches: 0 });
      }

      views?.forEach((v) => {
        const date = format(new Date(v.created_at), "yyyy-MM-dd");
        const existing = dayMap.get(date);
        if (existing) existing.views++;
      });

      searches?.forEach((s) => {
        const date = format(new Date(s.created_at), "yyyy-MM-dd");
        const existing = dayMap.get(date);
        if (existing) existing.searches++;
      });

      return Array.from(dayMap.values()).map(d => ({
        ...d,
        dateLabel: format(new Date(d.date), "dd/MM", { locale: ptBR })
      }));
    },
  });

  // Stats summary
  const stats = useMemo(() => {
    const totalViews = topProducts?.reduce((sum, p) => sum + p.views, 0) || 0;
    const totalSearches = topSearches?.reduce((sum, s) => sum + s.count, 0) || 0;
    const uniqueProducts = topProducts?.length || 0;
    const uniqueSearches = topSearches?.length || 0;

    return { totalViews, totalSearches, uniqueProducts, uniqueSearches };
  }, [topProducts, topSearches]);

  const handleRefresh = () => {
    refetchProducts();
    refetchSearches();
  };

  return (
    <MainLayout>
      <PageSEO title="Tendências" description="Analise tendências de produtos e buscas." path="/tendencias" noIndex />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary" />
              Análise de Tendências
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe os produtos mais buscados e acessados
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Atualizar"><RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalViews}</p>
                  <p className="text-xs text-muted-foreground">Visualizações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-2/20 rounded-lg">
                  <Search className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSearches}</p>
                  <p className="text-xs text-muted-foreground">Buscas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-3/20 rounded-lg">
                  <Package className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.uniqueProducts}</p>
                  <p className="text-xs text-muted-foreground">Produtos únicos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-4/20 rounded-lg">
                  <Sparkles className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.uniqueSearches}</p>
                  <p className="text-xs text-muted-foreground">Termos únicos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Atividade ao Longo do Tempo
            </CardTitle>
            <CardDescription>Visualizações e buscas por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <Skeleton className="h-[300px] w-full" />
            ) : dailyTrends && dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyTrends}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dateLabel" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    name="Visualizações"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorViews)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="searches" 
                    name="Buscas"
                    stroke="hsl(var(--chart-2))" 
                    fillOpacity={1} 
                    fill="url(#colorSearches)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado disponível</p>
                  <p className="text-sm">As tendências aparecerão conforme você navegar pelo catálogo</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Products and Searches */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos mais vistos
            </TabsTrigger>
            <TabsTrigger value="searches" className="gap-2">
              <Search className="h-4 w-4" />
              Termos mais buscados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Produtos</CardTitle>
                  <CardDescription>Produtos com mais visualizações</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProducts ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : topProducts && topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          className="text-xs"
                          width={120}
                          tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum produto visualizado ainda</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product List */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento</CardTitle>
                  <CardDescription>Breakdown por tipo de interação</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProducts ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : topProducts && topProducts.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {topProducts.map((product, index) => (
                        <div 
                          key={product.id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => product.id && navigate(`/produto/${product.id}`)}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <Badge variant="secondary" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              {product.views}
                            </Badge>
                            {product.compares > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Comp: {product.compares}
                              </Badge>
                            )}
                            {product.favorites > 0 && (
                              <Badge variant="outline" className="text-xs text-primary">
                                ♥ {product.favorites}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="searches" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Search Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Buscas</CardTitle>
                  <CardDescription>Termos mais pesquisados</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSearches ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : topSearches && topSearches.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topSearches.slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="term" 
                          className="text-xs"
                          width={100}
                          tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="count" name="Buscas" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma busca registrada ainda</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Search List */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento de Buscas</CardTitle>
                  <CardDescription>Quantidade de buscas e resultados médios</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSearches ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : topSearches && topSearches.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {topSearches.map((search, index) => (
                        <div 
                          key={search.term} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-chart-2/10 text-chart-2 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">"{search.term}"</p>
                            <p className="text-xs text-muted-foreground">
                              Média de {search.avgResults} resultados
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {search.count}x
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
