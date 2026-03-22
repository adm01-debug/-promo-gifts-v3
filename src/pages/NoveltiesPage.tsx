import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { NoveltyStatsCards } from "@/components/novelties/NoveltyStatsCards";
import { NoveltyProductGrid } from "@/components/novelties/NoveltyProductGrid";
import { ExpiringNoveltiesWidget } from "@/components/novelties/ExpiringNoveltiesWidget";
import { Sparkles } from "lucide-react";

export default function NoveltiesPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Header responsivo */}
        <PageHeader
          title="Novidades"
          description="Produtos adicionados nos últimos 30 dias"
          icon={<Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-success" />}
        />

        {/* Stats Cards - Grid responsivo */}
        <NoveltyStatsCards />

        {/* Layout principal - Stack em mobile, Grid em desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Grid de produtos - 3 colunas em desktop */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <NoveltyProductGrid />
          </div>

          {/* Widget lateral - Expirando em breve */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <ExpiringNoveltiesWidget />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
