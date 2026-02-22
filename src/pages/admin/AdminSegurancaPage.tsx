import { MainLayout } from "@/components/layout/MainLayout";
import { AccessSecurityManager } from "@/components/admin/AccessSecurityManager";
import { ShieldCheck } from "lucide-react";

export default function AdminSegurancaPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Segurança</h1>
            <p className="text-muted-foreground">Gerencie restrições de acesso por IP e geolocalização</p>
          </div>
        </div>

        <AccessSecurityManager />
      </div>
    </MainLayout>
  );
}
