import { Plug } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageSEO } from "@/components/seo/PageSEO";
import { SupabaseConnectionsTab } from "@/components/admin/connections/SupabaseConnectionsTab";
import { Bitrix24Tab } from "@/components/admin/connections/Bitrix24Tab";
import { N8nTab } from "@/components/admin/connections/N8nTab";
import { McpTab } from "@/components/admin/connections/McpTab";
import { WebhooksTab } from "@/components/admin/connections/WebhooksTab";

export default function AdminConexoesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <PageSEO title="Conexões | Admin" description="Hub central de integrações externas: Supabase, Bitrix24, n8n, MCP, Webhooks." />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Plug className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Conexões</h1>
          <p className="text-sm text-muted-foreground">
            Hub central de integrações externas e credenciais do sistema.
          </p>
        </div>
      </div>

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
  );
}
