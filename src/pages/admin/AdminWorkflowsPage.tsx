import { MainLayout } from "@/components/layout/MainLayout";
import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import { Workflow } from "lucide-react";
import { PageSEO } from "@/components/seo/PageSEO";

export default function AdminWorkflowsPage() {
  return (
    <MainLayout>
      <PageSEO title="Workflows" description="Configure automações e fluxos de trabalho." path="/admin/workflows" noIndex />
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Workflow className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Workflows IA</h1>
            <p className="text-muted-foreground">
              Canvas visual para orquestração multiagente com etapas arrastáveis
            </p>
          </div>
        </div>

        <WorkflowCanvas />
      </div>
    </MainLayout>
  );
}
