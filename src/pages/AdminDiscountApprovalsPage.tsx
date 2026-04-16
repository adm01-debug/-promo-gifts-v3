/**
 * AdminDiscountApprovalsPage — página administrativa para gerenciar limites e fila de aprovações de desconto.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellerDiscountLimitsPanel } from "@/components/admin/SellerDiscountLimitsPanel";
import { DiscountApprovalQueue } from "@/components/admin/DiscountApprovalQueue";
import { PageSEO } from "@/components/seo/PageSEO";
import { ShieldAlert, Percent } from "lucide-react";

export default function AdminDiscountApprovalsPage() {
  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <PageSEO title="Aprovações de Desconto" description="Gerencie limites de desconto por vendedor e responda solicitações pendentes." />
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">Aprovações de Desconto</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie limites por vendedor e responda solicitações que excedem o autorizado.
        </p>
      </header>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            <ShieldAlert className="h-4 w-4 mr-1" /> Fila de aprovações
          </TabsTrigger>
          <TabsTrigger value="limits">
            <Percent className="h-4 w-4 mr-1" /> Limites por vendedor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <DiscountApprovalQueue />
        </TabsContent>
        <TabsContent value="limits" className="mt-4">
          <SellerDiscountLimitsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
