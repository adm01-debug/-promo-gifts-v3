import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { AccessSecurityManager } from "@/components/admin/AccessSecurityManager";
import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { ShieldCheck, Shield, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSegurancaPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Segurança</h1>
            <p className="text-muted-foreground">Central de segurança e restrições de acesso</p>
          </div>
        </div>

        <Tabs defaultValue="central" className="space-y-6">
          <TabsList className="h-auto p-1">
            <TabsTrigger value="central" className="gap-2 px-4 py-2.5">
              <Shield className="h-4 w-4" />
              Central de Segurança
            </TabsTrigger>
            <TabsTrigger value="restricoes" className="gap-2 px-4 py-2.5">
              <Lock className="h-4 w-4" />
              Restrições de Acesso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="central">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="restricoes">
            <AccessSecurityManager />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
