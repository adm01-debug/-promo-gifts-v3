import { MainLayout } from "@/components/layout/MainLayout";
import { StockDashboard } from "@/components/inventory/StockDashboard";

export default function StockDashboardPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4">
        <StockDashboard />
      </div>
    </MainLayout>
  );
}
