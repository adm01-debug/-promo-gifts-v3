import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ShieldCheck, Code, FileText, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const inventoryData = [
  {
    module: "Segurança e Identidade",
    items: [
      { name: "RBAC Multinível", path: "src/hooks/useRBAC.tsx", snippet: "export type RoleName = 'dev' | 'supervisor' | 'agente';", status: "✅ Implementado" },
      { name: "MFA Enforcement", path: "src/contexts/AuthContext.tsx", snippet: "currentAAL === 'aal2'", status: "✅ Implementado" },
      { name: "RLS Policies", path: "supabase/migrations/", snippet: "CREATE POLICY ...", status: "✅ Implementado" }
    ]
  },
  {
    module: "Inteligência Artificial",
    items: [
      { name: "AI Mockup Studio", path: "supabase/functions/generate-mockup-nanobanana/index.ts", snippet: "Integration with NanoBanana API", status: "✅ Implementado" },
      { name: "Edge Detection", path: "src/lib/product-bounds-detector.ts", snippet: "Transparency detection logic", status: "✅ Implementado" }
    ]
  },
  {
    module: "Vendas e Finanças",
    items: [
      { name: "Pricing Engine", path: "src/lib/personalization/calculators.ts", snippet: "export function calculatePrice", status: "✅ Implementado" },
      { name: "E-Signature", path: "src/pages/PublicQuoteApprovalPage.tsx", snippet: "Hash and IP capturing", status: "✅ Implementado" }
    ]
  }
];

export default function ComplianceEvidencePage() {
  return (
    <MainLayout>
      <PageSEO title="Dossiê de Evidências" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Painel de Compliance</h1>
            <p className="text-muted-foreground">Evidências técnicas e mapeamento de inventário de auditoria</p>
          </div>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inventory" className="gap-2">
              <FileText className="h-4 w-4" />
              Inventário de Funcionalidades
            </TabsTrigger>
            <TabsTrigger value="rls" className="gap-2">
              <Activity className="h-4 w-4" />
              Status de RLS Realtime
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            {inventoryData.map((module) => (
              <Card key={module.module}>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{module.module}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {module.items.map((item) => (
                      <div key={item.name} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.name}</span>
                            <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Code className="h-3 w-3" />
                            {item.path}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-black/80 text-green-400 font-mono text-[10px] max-w-md overflow-hidden truncate">
                          {item.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="rls">
            <Card>
              <CardHeader>
                <CardTitle>Monitoramento de Segurança de Dados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Relatório de integridade RLS gerado automaticamente em cada build.</p>
                  <p className="text-sm">Verifique o arquivo /mnt/documents/RLS_INTEGRITY_REPORT.txt para evidências cruas.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
