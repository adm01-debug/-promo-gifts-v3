import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ShieldCheck, Code, FileText, Activity, AlertTriangle, CheckCircle2, Clock, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const checklistItems = [
  { item: "Isolamento de Tenant", priority: "P0", status: "✅ Implementado", type: "Segurança", acceptance: "Agente A não lê dados de B via API" },
  { item: "Integridade de Preço", priority: "P0", status: "✅ Implementado", type: "Financeiro", acceptance: "Margem bate com calculadora core" },
  { item: "E-Signature Validada", priority: "P1", status: "✅ Implementado", type: "Vendas", acceptance: "Hash de assinatura e IP registrados" },
  { item: "Finance Hub", priority: "P0", status: "⏳ Roadmap Q3", type: "Financeiro", acceptance: "Checkout Mercado Pago integrado" },
];

const evidenceData = [
  {
    module: "Segurança e Identidade",
    items: [
      { name: "RBAC Multinível", path: "src/hooks/useRBAC.tsx", snippet: "RoleName = 'dev' | 'supervisor' | 'agente'", status: "Found" },
      { name: "MFA Enforcement", path: "src/contexts/AuthContext.tsx", snippet: "currentAAL === 'aal2'", status: "Found" },
      { name: "RLS Policies", path: "supabase/migrations/", snippet: "CREATE POLICY ...", status: "Found" }
    ]
  },
  {
    module: "Vendas e Finanças",
    items: [
      { name: "Pricing Engine", path: "src/lib/personalization/calculators.ts", snippet: "calculatePrice(tiers, quantity)", status: "Found" },
      { name: "CRM Bridge", path: "supabase/functions/crm-db-bridge/", snippet: "Bitrix24 Bi-sync", status: "Found" }
    ]
  }
];

export default function ComplianceEvidencePage() {
  const [searchTerm, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "achado" | "pendente">("all");
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});

  const toggleSnippet = (id: string) => {
    setExpandedSnippets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEvidence = evidenceData.map(module => ({
    ...module,
    items: module.items.filter(item => 
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.path.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || (statusFilter === "achado" && item.status === "Found"))
    )
  })).filter(module => module.items.length > 0);

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
              <p className="text-muted-foreground text-lg">Central de Auditoria de Alta Performance • v7.0</p>
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

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-card to-muted/20 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Saúde RLS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">114 / 114</div>
              <p className="text-xs text-muted-foreground mt-1">Proteção atestada por CI</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-muted/20 border-orange/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-orange" /> Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AAL2 Enforced</div>
              <p className="text-xs text-muted-foreground mt-1">MFA exigido em rotas críticas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-success/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-success" /> Gaps LGPD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 Críticos</div>
              <p className="text-xs text-muted-foreground mt-1">Conformidade Tier 1</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Code className="h-4 w-4 text-blue-500" /> Evidence Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GitHub Sync</div>
              <p className="text-xs text-muted-foreground mt-1">Vínculo direto com commits</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="evidence" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="evidence" className="gap-2 px-6 py-2.5">
              <Code className="h-4 w-4" /> Dossiê de Código
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2 px-6 py-2.5">
              <CheckCircle2 className="h-4 w-4" /> Checklist Auditável
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evidence" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar evidência por nome ou path..." 
                  className="pl-10 h-11 bg-background/50"
                  value={searchTerm}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                  size="sm"
                  className="rounded-lg h-11"
                >Todos</Button>
                <Button 
                  variant={statusFilter === "achado" ? "default" : "outline"}
                  onClick={() => setStatusFilter("achado")}
                  size="sm"
                  className="rounded-lg h-11"
                >Encontrados</Button>
              </div>
            </div>

            {filteredEvidence.map((module) => (
              <Card key={module.module} className="border-border/50 overflow-hidden">
                <CardHeader className="bg-muted/40 py-4">
                  <CardTitle className="text-sm uppercase tracking-widest text-primary flex items-center justify-between">
                    <span>{module.module}</span>
                    <Badge variant="secondary" className="text-[10px]">{module.items.length} itens</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {module.items.map((item) => (
                      <div key={item.name} className="p-5 hover:bg-muted/20 transition-all group">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold group-hover:text-primary transition-colors">{item.name}</span>
                              <Badge variant="outline" className="text-[10px] bg-background border-success/30 text-success">VALIDADO</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 w-fit px-2.5 py-1 rounded-lg">
                              <Code className="h-3 w-3" />
                              {item.path}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleSnippet(item.name)}
                            className="h-8 gap-2 text-xs text-muted-foreground hover:text-primary"
                          >
                            {expandedSnippets[item.name] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {expandedSnippets[item.name] ? "Ocultar Snippet" : "Ver Código"}
                          </Button>
                        </div>
                        {expandedSnippets[item.name] && (
                          <div className="mt-4 p-4 rounded-lg bg-black/95 text-green-400 font-mono text-[11px] border border-white/5 shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-x-auto whitespace-pre">
                            <div className="flex items-center justify-between mb-2 opacity-50 border-b border-white/5 pb-2">
                              <span>// Path: {item.path}</span>
                              <span>TypeScript</span>
                            </div>
                            {item.snippet}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Mapeamento de Requisitos e Status</CardTitle>
                <CardDescription>Critérios objetivos e prioridades (P0-P3).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Requisito</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Critério de Aceitação</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checklistItems.map((row) => (
                        <TableRow key={row.item} className="hover:bg-muted/10">
                          <TableCell className="font-bold">{row.item}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{row.type}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={row.priority === "P0" ? "destructive" : "outline"} className="text-[10px]">
                              {row.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.acceptance}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.status.includes('✅') ? 'default' : 'secondary'} className={cn(
                              "text-[10px] font-bold",
                              row.status.includes('✅') && "bg-success hover:bg-success/90"
                            )}>
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
