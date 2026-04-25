import { Plug, Activity, Settings2, Network } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageSEO } from "@/components/seo/PageSEO";
import { SupabaseConnectionsTab } from "@/components/admin/connections/SupabaseConnectionsTab";
import { Bitrix24Tab } from "@/components/admin/connections/Bitrix24Tab";
import { N8nTab } from "@/components/admin/connections/N8nTab";
import { McpTab } from "@/components/admin/connections/McpTab";
import { WebhooksTab } from "@/components/admin/connections/WebhooksTab";
import { IntegrationsHealthCard } from "@/components/admin/connections/IntegrationsHealthCard";
import { ConnectionsOverviewTable } from "@/components/admin/connections/ConnectionsOverviewTable";
import { SmokeTestChecklist } from "@/components/admin/connections/SmokeTestChecklist";
import { AutoTestIntervalCard } from "@/components/admin/connections/AutoTestIntervalCard";
import { FailureWindowCard } from "@/components/admin/connections/FailureWindowCard";
import { AutoTestJobStatusCard } from "@/components/admin/connections/AutoTestJobStatusCard";
import { CredentialsSourceFilterProvider } from "@/components/admin/connections/CredentialsSourceFilterContext";
import { CredentialsSourceFilter } from "@/components/admin/connections/CredentialsSourceFilter";
import { GlobalRefreshFromDbButton } from "@/components/admin/connections/GlobalRefreshFromDbButton";
import { ConnectionsPulseBar } from "@/components/admin/connections/ConnectionsPulseBar";
import { ConnectionsIncidentStrip } from "@/components/admin/connections/ConnectionsIncidentStrip";
import { IncidentTimeline72h } from "@/components/admin/connections/IncidentTimeline72h";
import { ZoneSection } from "@/components/admin/connections/ZoneSection";
import { SeverityFilterProvider } from "@/components/admin/connections/SeverityFilterContext";
import { SeverityFilterToolbar } from "@/components/admin/connections/SeverityFilterToolbar";
import { ExplainModeProvider } from "@/components/admin/connections/ExplainModeContext";
import { ExplainModeToggle } from "@/components/admin/connections/ExplainModeToggle";
import { useCallback, useEffect, useState } from "react";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useSeverityChangeNotifier } from "@/components/admin/connections/useSeverityChangeNotifier";

/**
 * /admin/conexoes — Hub Central de Integrações
 *
 * Layout reorganizado em 3 zonas semânticas (Onda 14):
 *   1. Health     → Pulse Bar (sticky), Incident Strip, Health Card
 *   2. Operation  → Configurações operacionais (intervalos, janela, status do job)
 *   3. Connections→ Visão geral, filtros e abas por tipo de integração
 *
 * Hierarquia visual: cada zona usa <ZoneSection> com header consistente
 * (ícone + título + descrição), barra lateral colorida e espaçamento padronizado
 * (space-y-8 entre zonas, space-y-4 dentro de cada zona).
 */
export default function AdminConexoesPage() {
  const { secrets, list } = useSecretsManager();
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => { list(); }, [list]);
  // Toast automático em escaladas P0/P1 — com confirmação para não repetir
  useSeverityChangeNotifier();

  const handleGlobalRefreshed = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  return (
    <SeverityFilterProvider>
      <ExplainModeProvider>
      <CredentialsSourceFilterProvider>
        <div className="container mx-auto py-6 max-w-7xl space-y-6">
          <PageSEO title="Conexões | Admin" description="Hub central de integrações externas: Supabase, Bitrix24, n8n, MCP, Webhooks." />

          {/* Pulse Bar sticky + Timeline 72h + Incident Strip ficam fora das zonas */}
          <ConnectionsPulseBar />
          <IncidentTimeline72h />
          <ConnectionsIncidentStrip />

          {/* Page Header */}
          <header className="flex items-center gap-3 pb-2 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">Conexões</h1>
              <p className="text-sm text-muted-foreground">
                Hub central de integrações externas e credenciais do sistema.
              </p>
            </div>
            <GlobalRefreshFromDbButton onRefreshed={handleGlobalRefreshed} />
            <SmokeTestChecklist availableSecrets={secrets} />
          </header>

          {/* Filtro global de severidade + toggle "ver como calculamos" */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SeverityFilterToolbar />
            <ExplainModeToggle />
          </div>

          {/* Quick nav (anchors) — atalho leve sem virar nav primária */}
          <nav aria-label="Navegação por zonas" className="flex flex-wrap gap-2 text-xs">
            {[
              { href: "#zone-health", label: "Saúde" },
              { href: "#zone-operation", label: "Operação" },
              { href: "#zone-connections", label: "Conexões" },
            ].map((z) => (
              <a
                key={z.href}
                href={z.href}
                className="inline-flex items-center px-2.5 py-1 rounded-full border border-border/60 bg-card hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                {z.label}
              </a>
            ))}
          </nav>

        {/* Zonas semânticas com mais respiro entre elas */}
        <div className="space-y-8">
          {/* ZONA 1 — HEALTH */}
          <ZoneSection
            id="zone-health"
            icon={Activity}
            title="Saúde"
            description="Status agregado das integrações em tempo real (health check a cada 60s)."
            tone="primary"
          >
            <IntegrationsHealthCard secrets={secrets} />
          </ZoneSection>

          {/* ZONA 2 — OPERATION */}
          <ZoneSection
            id="zone-operation"
            icon={Settings2}
            title="Operação"
            description="Configurações do auto-test (verificação periódica), janela de falha contínua e status do job de monitoramento."
            tone="info"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <AutoTestIntervalCard />
              <FailureWindowCard />
            </div>
            <AutoTestJobStatusCard />
          </ZoneSection>

          {/* ZONA 3 — CONNECTIONS */}
          <ZoneSection
            id="zone-connections"
            icon={Network}
            title="Conexões"
            description="Visão consolidada de todas as integrações ativas e gestão por tipo (banco, Bitrix24, n8n, MCP, webhooks)."
            tone="neutral"
          >
            {secrets.length > 0 && (
              <CredentialsSourceFilter
                secrets={secrets}
                className="rounded-lg border bg-card px-4 py-3"
              />
            )}

            <ConnectionsOverviewTable refreshSignal={refreshTick} />

            <Tabs defaultValue="databases" className="space-y-4 pt-2">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="databases">Bancos de Dados</TabsTrigger>
                <TabsTrigger value="bitrix24">Bitrix24</TabsTrigger>
                <TabsTrigger value="n8n">n8n</TabsTrigger>
                <TabsTrigger value="mcp">MCP (Claude)</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </TabsList>
              <TabsContent value="databases"><SupabaseConnectionsTab /></TabsContent>
              <TabsContent value="bitrix24"><Bitrix24Tab /></TabsContent>
              <TabsContent value="n8n"><N8nTab /></TabsContent>
              <TabsContent value="mcp"><McpTab /></TabsContent>
              <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
            </Tabs>
          </ZoneSection>
        </div>
      </div>
    </CredentialsSourceFilterProvider>
    </ExplainModeProvider>
    </SeverityFilterProvider>
  );
}
