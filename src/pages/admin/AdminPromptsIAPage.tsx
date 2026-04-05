import { MainLayout } from "@/components/layout/MainLayout";
import { MockupPromptManager } from "@/components/admin/MockupPromptManager";
import { Brain } from "lucide-react";
import { PageSEO } from "@/components/seo/PageSEO";

export default function AdminPromptsIAPage() {
  return (
    <MainLayout>
      <PageSEO title="Prompts de IA" description="Configure e gerencie prompts de inteligência artificial." path="/admin/prompts-ia" noIndex />
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Prompts IA</h1>
            <p className="text-muted-foreground">Gerencie prompts do gerador de mockups e modelos de IA</p>
          </div>
        </div>

        <MockupPromptManager />
      </div>
    </MainLayout>
  );
}
