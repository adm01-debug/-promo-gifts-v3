import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Users, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCrmCompanies } from "@/hooks/useCrmCompanies";
import { ClientCard } from "@/components/clients/ClientCard";
import { getCompanyDisplayName } from "@/types/crm";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: clients = [], isLoading, isError, error, refetch } = useCrmCompanies({ is_customer: true });

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getCompanyDisplayName(c).toLowerCase().includes(q) ||
      (c.cnpj ?? "").toLowerCase().includes(q) ||
      (c.cidade ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <MainLayout>
      <PageSEO
        title="Clientes"
        description="Gestão de clientes com visão 360° de pedidos, ticket médio e LTV."
        path="/clientes"
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div>
          <h1 data-testid="page-title-clientes" className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Clientes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isError
              ? "Erro ao carregar clientes"
              : `${clients.length} ${clients.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isError ? (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive/70 mb-4" />
              <h3 className="font-display text-lg font-medium text-foreground mb-1">
                Erro ao carregar empresas do CRM
              </h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md">
                {error instanceof Error ? error.message : "Não foi possível conectar ao banco de clientes. Verifique sua conexão e tente novamente."}
              </p>
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-medium text-foreground mb-1">
                {search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {search ? "Tente buscar com outros termos" : "Os clientes aparecerão aqui assim que forem cadastrados no CRM"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => navigate(`/clientes/${client.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
