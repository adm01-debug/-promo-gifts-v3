import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { KeyRound, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { McpKeysList } from "@/components/admin/security/keys/McpKeysList";
import { McpAuditFeed } from "@/components/admin/security/keys/audit/McpAuditFeed";

export default function AdminSegurancaChavesPage() {
  return (
    <MainLayout>
      <PageSEO
        title="Chaves MCP"
        description="Gerencie ciclo de vida de chaves do MCP server: criar, listar, rotacionar, revogar e auditar."
        path="/admin/seguranca/chaves"
        noIndex
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">Chaves MCP</h1>
              <p className="text-muted-foreground">
                Ciclo de vida completo: criação, rotação, revogação e auditoria
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/seguranca">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar a Segurança
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="keys" className="space-y-4">
          <TabsList>
            <TabsTrigger value="keys">Chaves</TabsTrigger>
            <TabsTrigger value="audit">Histórico de auditoria</TabsTrigger>
          </TabsList>
          <TabsContent value="keys" className="m-0">
            <McpKeysList />
          </TabsContent>
          <TabsContent value="audit" className="m-0">
            <McpAuditFeed />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

