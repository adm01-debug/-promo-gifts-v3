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
      <PageSEO title="Novidades" description="Confira os produtos mais recentes adicionados ao catálogo de brindes promocionais." path="/novidades" />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-24 md:pb-6">

        {/* KPIs focados em chegadas */}
        <NoveltyStatsCards />

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Grid de produtos */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <NoveltyProductGrid />
          </div>

          {/* Widget + Recentes */}
          <div className="lg:col-span-1 order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
            <ExpiringNoveltiesWidget />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
