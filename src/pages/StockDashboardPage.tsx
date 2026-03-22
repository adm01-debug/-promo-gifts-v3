import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { StockDashboard } from "@/components/inventory/StockDashboard";

export default function StockDashboardPage() {
  return (
    <MainLayout>
      <PageSEO title="Estoque" description="Acompanhe níveis de estoque e disponibilidade dos produtos." path="/estoque" noIndex />
      <div className="container mx-auto py-6 px-4">
        <StockDashboard />
      </div>
    </MainLayout>
  );
}
