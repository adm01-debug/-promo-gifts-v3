import { Plug } from "lucide-react";
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
import { useEffect } from "react";
import { useSecretsManager } from "@/hooks/useSecretsManager";

export default function AdminConexoesPage() {
  const { secrets, list } = useSecretsManager();
  useEffect(() => { list(); }, [list]);

  return (
    <CredentialsSourceFilterProvider>
      <div className="container mx-auto py-6 space-y-6 max-w-7xl">
        <PageSEO title="Conexões | Admin" description="Hub central de integrações externas: Supabase, Bitrix24, n8n, MCP, Webhooks." />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Conexões</h1>
            <p className="text-sm text-muted-foreground">
              Hub central de integrações externas e credenciais do sistema.
            </p>
          </div>
          <SmokeTestChecklist availableSecrets={secrets} />
        </div>

        <IntegrationsHealthCard secrets={secrets} />

        <div className="grid gap-3 md:grid-cols-2">
          <AutoTestIntervalCard />
          <FailureWindowCard />
        </div>

        {secrets.length > 0 && (
          <CredentialsSourceFilter secrets={secrets} className="rounded-lg border bg-card px-4 py-3" />
        )}

        <ConnectionsOverviewTable />

        <Tabs defaultValue="databases" className="space-y-4">
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
      </div>
    </CredentialsSourceFilterProvider>
  );
}
