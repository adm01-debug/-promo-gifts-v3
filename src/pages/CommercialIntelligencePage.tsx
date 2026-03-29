import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { IntelligenceFilterBar, type IntelligenceFilters } from "@/components/intelligence/IntelligenceFilterBar";
import { MarketIntelligenceChart } from "@/components/intelligence/MarketIntelligenceChart";
import { SalesOverviewChart } from "@/components/intelligence/SalesOverviewChart";
import { TrendingProducts } from "@/components/intelligence/TrendingProducts";
import { OpportunityFinder } from "@/components/intelligence/OpportunityFinder";
import { SupplierSales } from "@/components/intelligence/SupplierSales";
import { Brain } from "lucide-react";

export default function CommercialIntelligencePage() {
  const [filters, setFilters] = useState<IntelligenceFilters>({
    days: 30,
    categoryId: null,
    categoryName: null,
    supplierId: null,
    supplierName: null,
    productId: null,
    productName: null,
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
            <p className="text-sm text-muted-foreground">Produtos & Fornecedores · comportamento do mercado + vendas internas</p>
          </div>
        </div>

        {/* Filters */}
        <IntelligenceFilterBar filters={filters} onFiltersChange={setFilters} />

        {/* 1. Market Intelligence — estoque dos concorrentes (macro) */}
        <MarketIntelligenceChart days={filters.days} supplierId={filters.supplierId} productId={filters.productId} />

        {/* 2+3. Produtos em Alta + Vendas por Fornecedor (side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendingProducts days={filters.days} categoryId={filters.categoryId} supplierId={filters.supplierId} productId={filters.productId} categoryName={filters.categoryName} />
          <SupplierSales days={filters.days} categoryId={filters.categoryId} supplierId={filters.supplierId} productId={filters.productId} categoryName={filters.categoryName} />
        </div>

        {/* 4. Oportunidades de Conversão — cotados mas não vendidos */}
        <OpportunityFinder days={filters.days} categoryId={filters.categoryId} supplierId={filters.supplierId} productId={filters.productId} categoryName={filters.categoryName} />

        {/* 5. Vendas Internas (macro) — orçamentos vs pedidos */}
        <SalesOverviewChart days={filters.days} productId={filters.productId} />
      </div>
    </MainLayout>
  );
}
