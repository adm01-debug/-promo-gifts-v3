import { useState, useCallback } from "react";

import { PageSEO } from "@/components/seo/PageSEO";
import { NoveltyStatsCards } from "@/components/novelties/NoveltyStatsCards";
import { NoveltyProductGrid } from "@/components/novelties/NoveltyProductGrid";
import { ExpiringNoveltiesWidget } from "@/components/novelties/ExpiringNoveltiesWidget";
import { EnhancedErrorBoundary } from "@/components/errors/EnhancedErrorBoundary";

export default function NoveltiesPage() {
  const [products, setProducts] = useState<any[] | undefined>(undefined);
  const [isGridLoading, setIsGridLoading] = useState(false);

  const handleFilteredChange = useCallback((newProducts: any[], isLoading: boolean) => {
    setProducts(newProducts);
    setIsGridLoading(isLoading);
  }, []);

  return (
    <EnhancedErrorBoundary scope="pages.novelties">
      <PageSEO title="Novidades" description="Confira os produtos mais recentes adicionados ao catálogo de brindes promocionais." path="/novidades" />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">

        {/* Título acessível mantido para SEO/E2E (oculto visualmente) */}
        <h1 data-testid="page-title-novidades" className="sr-only">
          Novidades
        </h1>

        {/* KPIs focados em chegadas */}
        <NoveltyStatsCards filteredProducts={products} isRefreshing={isGridLoading} />


        {/* Layout principal — grid ocupa mais espaço */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3 sm:gap-4">
          {/* Grid de produtos */}
          <div className="order-2 xl:order-1 min-w-0">
            <NoveltyProductGrid onFilteredChange={handleFilteredChange} />
          </div>

          {/* Widget sidebar — compacto */}
          <div className="order-1 xl:order-2 xl:sticky xl:top-4 xl:self-start">
            <ExpiringNoveltiesWidget />
          </div>
        </div>
      </div>
    </EnhancedErrorBoundary>
  );
}
