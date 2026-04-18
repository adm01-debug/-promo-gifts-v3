import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { IntelligenceFilterBar, type IntelligenceFilters } from "@/components/intelligence/IntelligenceFilterBar";
import { IntelligenceKPICards } from "@/components/intelligence/IntelligenceKPICards";
import { MarketIntelligenceInsightsCard } from "@/components/intelligence/MarketIntelligenceInsightsCard";
import { MarketIntelligenceChart } from "@/components/intelligence/MarketIntelligenceChart";
import { SalesOverviewChart } from "@/components/intelligence/SalesOverviewChart";
import { TrendingProducts } from "@/components/intelligence/TrendingProducts";
import { ProductRankingSearch } from "@/components/intelligence/ProductRankingSearch";
import { CategoryRanking } from "@/components/intelligence/CategoryRanking";
import { SupplierSales } from "@/components/intelligence/SupplierSales";
import { Brain, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CommercialIntelligencePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filters, setFilters] = useState<IntelligenceFilters>({
    days: 30,
    categoryId: null,
    categoryName: null,
    supplierId: null,
    supplierName: null,
    productId: null,
    productName: null,
  });

  const handleGlobalRefresh = async () => {
    await queryClient.invalidateQueries();
    setLastRefresh(new Date());
    toast({ title: "Dados atualizados", description: "Todos os painéis foram recarregados." });
  };

  const formatRelative = (d: Date) => {
    const diff = Math.round((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    return `há ${Math.floor(diff / 3600)}h`;
  };

  return (
    <MainLayout>
      <PageSEO
        title="Inteligência de Mercado"
        description="Painel estratégico com insights de mercado para decisões comerciais."
        path="/inteligencia-comercial"
        noIndex
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground">Inteligência de Mercado</h1>
            <p className="text-sm text-muted-foreground">Produtos & Fornecedores · comportamento do mercado + vendas internas</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Atualizado {formatRelative(lastRefresh)}</span>
            <Button variant="outline" size="sm" onClick={handleGlobalRefresh} className="h-8 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filters — sticky no scroll */}
        <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 lg:-mx-6 xl:-mx-8 px-3 sm:px-4 lg:px-6 xl:px-8 py-2 bg-background/85 backdrop-blur-md border-b border-border/40">
          <IntelligenceFilterBar filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* KPI Summary */}
        <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <IntelligenceKPICards
            days={filters.days}
            categoryId={filters.categoryId}
            supplierId={filters.supplierId}
            productId={filters.productId}
            categoryName={filters.categoryName}
            supplierName={filters.supplierName}
          />
        </div>

        {/* AI Insights */}
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <MarketIntelligenceInsightsCard
            days={filters.days}
            categoryId={filters.categoryId}
            supplierId={filters.supplierId}
            productId={filters.productId}
            categoryName={filters.categoryName}
            supplierName={filters.supplierName}
            productName={filters.productName}
          />
        </div>

        {/* 1. Market Intelligence */}
        <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
          <MarketIntelligenceChart days={filters.days} supplierId={filters.supplierId} productId={filters.productId} />
        </div>

        {/* 2. Product Ranking Search — main feature */}
        <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <ProductRankingSearch />
        </div>

        {/* 3. Ranking de Categorias */}
        <div className="animate-fade-in" style={{ animationDelay: "250ms" }}>
          <CategoryRanking days={filters.days} categoryId={filters.categoryId} supplierId={filters.supplierId} productId={filters.productId} categoryName={filters.categoryName} />
        </div>

        {/* 4+5. Produtos em Alta + Vendas por Fornecedor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <TrendingProducts days={filters.days} categoryId={filters.categoryId} supplierId={filters.supplierId} productId={filters.productId} categoryName={filters.categoryName} />
          <SupplierSales days={filters.days} categoryId={filters.categoryId} supplierId={filters.supplierId} productId={filters.productId} categoryName={filters.categoryName} />
        </div>

        {/* 5. Vendas Internas */}
        <div className="animate-fade-in" style={{ animationDelay: "350ms" }}>
          <SalesOverviewChart days={filters.days} productId={filters.productId} />
        </div>
      </div>
    </MainLayout>
  );
}
