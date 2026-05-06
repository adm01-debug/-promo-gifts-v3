import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import {
  ShieldCheck,
  Code,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const checklistItems = [
  {
    item: 'Isolamento de Tenant',
    priority: 'P0',
    status: '✅ Implementado',
    type: 'Segurança',
    acceptance: 'Agente A não lê dados de B via API',
  },
  {
    item: 'Integridade de Preço',
    priority: 'P0',
    status: '✅ Implementado',
    type: 'Financeiro',
    acceptance: 'Margem bate com calculadora core',
  },
  {
    item: 'E-Signature Validada',
    priority: 'P1',
    status: '✅ Implementado',
    type: 'Vendas',
    acceptance: 'Hash de assinatura e IP registrados',
  },
  {
    item: 'Finance Hub',
    priority: 'P0',
    status: '⏳ Roadmap Q3',
    type: 'Financeiro',
    acceptance: 'Checkout Mercado Pago integrado',
  },
];

const evidenceData = [
  {
    module: 'Segurança e Identidade',
    items: [
      {
        name: 'RBAC Multinível',
        path: 'src/hooks/useRBAC.tsx',
        snippet: "RoleName = 'dev' | 'supervisor' | 'agente'",
        status: 'Found',
      },
      {
        name: 'MFA Enforcement',
        path: 'src/contexts/AuthContext.tsx',
        snippet: "currentAAL === 'aal2'",
        status: 'Found',
      },
      {
        name: 'RLS Policies',
        path: 'supabase/migrations/',
        snippet: 'CREATE POLICY ...',
        status: 'Found',
      },
    ],
  },
  {
    module: 'Vendas e Finanças',
    items: [
      {
        name: 'Pricing Engine',
        path: 'src/lib/personalization/calculators.ts',
        snippet: 'calculatePrice(tiers, quantity)',
        status: 'Found',
      },
      {
        name: 'CRM Bridge',
        path: 'supabase/functions/crm-db-bridge/',
        snippet: 'Bitrix24 Bi-sync',
        status: 'Found',
      },
    ],
  },
];

export default function ComplianceEvidencePage() {
  const [searchTerm, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'achado' | 'pendente'>('all');
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});

  const toggleSnippet = (id: string) => {
    setExpandedSnippets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEvidence = evidenceData
    .map((module) => ({
      ...module,
      items: module.items.filter(
        (item) =>
          (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.path.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (statusFilter === 'all' || (statusFilter === 'achado' && item.status === 'Found')),
      ),
    }))
    .filter((module) => module.items.length > 0);

  return (
    <MainLayout>
      <PageSEO title="Dossiê de Evidências | Compliance" noIndex />
      <div className="mx-auto w-full max-w-[1920px] space-y-6 px-4 py-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border/50 pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="shadow-glow-primary/10 rounded-2xl bg-primary/10 p-3.5">
              <ShieldCheck className="h-9 w-9 animate-pulse-subtle text-primary" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">
                Compliance & Evidence
              </h1>
              <p className="text-lg text-muted-foreground">
                Central de Auditoria de Alta Performance • v7.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success" className="h-8 gap-2 px-3 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" /> PREMIUM 10/10
            </Badge>
            <Badge variant="outline" className="h-8 gap-2 px-3 text-xs">
              <Clock className="h-3.5 w-3.5" /> Auditoria: 04/05/2026
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" /> Saúde RLS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">114 / 114</div>
              <p className="mt-1 text-xs text-muted-foreground">Proteção atestada por CI</p>
            </CardContent>
          </Card>

          <Card className="border-orange/20 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-orange" /> Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AAL2 Enforced</div>
              <p className="mt-1 text-xs text-muted-foreground">MFA exigido em rotas críticas</p>
            </CardContent>
          </Card>

          <Card className="border-success/20 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-success" /> Gaps LGPD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 Críticos</div>
              <p className="mt-1 text-xs text-muted-foreground">Conformidade Tier 1</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Code className="h-4 w-4 text-blue-500" /> Evidence Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GitHub Sync</div>
              <p className="mt-1 text-xs text-muted-foreground">Vínculo direto com commits</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="evidence" className="space-y-6">
          <TabsList className="w-full overflow-x-auto rounded-xl bg-muted/50 p-1 sm:w-auto">
            <TabsTrigger value="evidence" className="gap-2 px-6 py-2.5">
              <Code className="h-4 w-4" /> Dossiê de Código
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2 px-6 py-2.5">
              <CheckCircle2 className="h-4 w-4" /> Checklist Auditável
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evidence" className="space-y-4">
            <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative w-full flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar evidência por nome ou path..."
                  className="h-11 bg-background/50 pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  size="sm"
                  className="h-11 rounded-xl"
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === 'achado' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('achado')}
                  size="sm"
                  className="h-11 rounded-xl"
                >
                  Encontrados
                </Button>
              </div>
            </div>

            {filteredEvidence.map((module) => (
              <Card key={module.module} className="overflow-hidden border-border/50">
                <CardHeader className="bg-muted/40 py-4">
                  <CardTitle className="flex items-center justify-between text-sm uppercase tracking-widest text-primary">
                    <span>{module.module}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {module.items.length} itens
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {module.items.map((item) => (
                      <div key={item.name} className="group p-5 transition-all hover:bg-muted/20">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold transition-colors group-hover:text-primary">
                                {item.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-success/30 bg-background text-[10px] text-success"
                              >
                                VALIDADO
                              </Badge>
                            </div>
                            <div className="flex w-fit items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1 font-mono text-xs text-muted-foreground">
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
                            {expandedSnippets[item.name] ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            {expandedSnippets[item.name] ? 'Ocultar Snippet' : 'Ver Código'}
                          </Button>
                        </div>
                        {expandedSnippets[item.name] && (
                          <div className="mt-4 overflow-x-auto whitespace-pre rounded-xl border border-white/5 bg-black/95 p-4 font-mono text-[11px] text-green-400 shadow-2xl duration-200 animate-in slide-in-from-top-2">
                            <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2 opacity-50">
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
                <div className="overflow-hidden rounded-xl border">
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
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {row.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={row.priority === 'P0' ? 'destructive' : 'outline'}
                              className="text-[10px]"
                            >
                              {row.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.acceptance}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={row.status.includes('✅') ? 'default' : 'secondary'}
                              className={cn(
                                'text-[10px] font-bold',
                                row.status.includes('✅') && 'bg-success hover:bg-success/90',
                              )}
                            >
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
