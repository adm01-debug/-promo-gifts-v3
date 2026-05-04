import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ShieldCheck, Code, FileText, Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const checklistItems = [
  { item: "Isolamento de Tenant", priority: "P0", status: "✅ Implementado", acceptance: "Agente A não lê dados de B via API" },
  { item: "Integridade de Preço", priority: "P0", status: "✅ Implementado", acceptance: "Margem bate com calculadora core" },
  { item: "E-Signature Validada", priority: "P1", status: "✅ Implementado", acceptance: "Hash de assinatura e IP registrados" },
  { item: "Finance Hub", priority: "P0", status: "⏳ Roadmap Q3", acceptance: "Checkout Mercado Pago integrado" },
];

const evidenceData = [
  {
    module: "Segurança e Identidade",
    items: [
      { name: "RBAC Multinível", path: "src/hooks/useRBAC.tsx", snippet: "RoleName = 'dev' | 'supervisor' | 'agente'", status: "✅" },
      { name: "MFA Enforcement", path: "src/contexts/AuthContext.tsx", snippet: "currentAAL === 'aal2'", status: "✅" },
      { name: "RLS Policies", path: "supabase/migrations/", snippet: "CREATE POLICY ...", status: "✅" }
    ]
  },
  {
    module: "Vendas e Finanças",
    items: [
      { name: "Pricing Engine", path: "src/lib/personalization/calculators.ts", snippet: "calculatePrice(tiers, quantity)", status: "✅" },
      { name: "CRM Bridge", path: "supabase/functions/crm-db-bridge/", snippet: "Bitrix24 Bi-sync", status: "✅" }
    ]
  }
];

export default function ComplianceEvidencePage() {
  return (
    <MainLayout>
      <PageSEO title="Dossiê de Evidências | Compliance" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-border/50">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 shadow-glow-primary/10">
              <ShieldCheck className="h-9 w-9 text-primary animate-pulse-subtle" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">Compliance & Evidence</h1>
              <p className="text-muted-foreground text-lg">Central de Auditoria de Alta Performance • v5.3</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="success" className="h-8 px-3 text-xs font-bold gap-2">
               <CheckCircle2 className="h-3.5 w-3.5" /> PREMIUM 10/10
             </Badge>
             <Badge variant="outline" className="h-8 px-3 text-xs gap-2">
               <Clock className="h-3.5 w-3.5" /> Auditoria: 04/05/2026
             </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-card to-muted/20 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Saúde RLS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">114 / 114</div>
              <p className="text-xs text-muted-foreground mt-1">Tabelas auditadas por CI</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-muted/20 border-orange/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-orange" /> Segurança (MFA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AAL2 Enforced</div>
              <p className="text-xs text-muted-foreground mt-1">Nível de alçada administrativa</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-success/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-success" /> Riscos LGPD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Mitigado</div>
              <p className="text-xs text-muted-foreground mt-1">Matriz de retenção ativa</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="checklist" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="checklist" className="gap-2 px-6 py-2.5">
              <CheckCircle2 className="h-4 w-4" /> Checklist Auditável
            </TabsTrigger>
            <TabsTrigger value="evidence" className="gap-2 px-6 py-2.5">
              <Code className="h-4 w-4" /> Dossiê de Código
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Mapeamento de Requisitos e Status</CardTitle>
                <CardDescription>Critérios objetivos para auditoria enterprise.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requisito</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Critério de Aceitação</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklistItems.map((row) => (
                      <TableRow key={row.item}>
                        <TableCell className="font-semibold">{row.item}</TableCell>
                        <TableCell><Badge variant="outline">{row.priority}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.acceptance}</TableCell>
                        <TableCell><Badge variant={row.status.includes('✅') ? 'default' : 'secondary'}>{row.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence" className="space-y-4">
            {evidenceData.map((module) => (
              <Card key={module.module} className="border-border/50">
                <CardHeader className="bg-muted/30 py-3">
                  <CardTitle className="text-sm uppercase tracking-widest text-primary">{module.module}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4">
                    {module.items.map((item) => (
                      <div key={item.name} className="flex flex-col lg:flex-row lg:items-center justify-between p-5 rounded-2xl border border-border/40 hover:border-primary/30 transition-all gap-4 group">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold group-hover:text-primary transition-colors">{item.name}</span>
                            <Badge variant="outline" className="text-[10px] bg-background">VALIDADO</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 w-fit px-2.5 py-1 rounded-lg">
                            <Code className="h-3 w-3" />
                            {item.path}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-black/90 text-green-400 font-mono text-[11px] min-w-[300px] border border-white/10 shadow-xl overflow-x-auto">
                          <span className="text-muted-foreground mr-2 opacity-50">// Evidence:</span>
                          {item.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
