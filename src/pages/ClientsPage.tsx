import { useState, useCallback, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Users, Search, AlertTriangle, RefreshCw, X, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCrmCompanies } from "@/hooks/useCrmCompanies";
import { ClientCard } from "@/components/clients/ClientCard";
import { getCompanyDisplayName } from "@/types/crm";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { data: clients = [], isLoading, isError, error, refetch } = useCrmCompanies({ is_customer: true });
  
  const { 
    history: searchHistory, 
    addToHistory, 
    removeFromHistory, 
    clearHistory 
  } = useSearchHistory("company");

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        getCompanyDisplayName(c).toLowerCase().includes(q) ||
        (c.cnpj ?? "").toLowerCase().includes(q) ||
        (c.cidade ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  const handleSearchSubmit = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length >= 2) {
      addToHistory({
        id: `search-${trimmed}`,
        label: trimmed,
        type: "company"
      });
    }
    setSearch(trimmed);
    setIsHistoryOpen(false);
  }, [addToHistory]);

  const handleClientClick = useCallback((client: any) => {
    addToHistory({
      id: client.id,
      label: getCompanyDisplayName(client),
      type: "company",
      metadata: { id: client.id }
    });
    navigate(`/clientes/${client.id}`);
  }, [addToHistory, navigate]);

  return (
    <MainLayout>
      <PageSEO
        title="Clientes"
        description="Gestão de clientes com visão 360° de pedidos, ticket médio e LTV."
        path="/clientes"
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        </div>

        <div className="relative max-w-md w-full">
          <Popover open={isHistoryOpen && searchHistory.length > 0} onOpenChange={setIsHistoryOpen}>
            <PopoverTrigger asChild>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou cidade..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (!isHistoryOpen) setIsHistoryOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchSubmit(search);
                    }
                  }}
                  className="pl-10 pr-10"
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 w-[var(--radix-popover-trigger-width)] max-h-[300px] overflow-y-auto" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="p-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3 w-3" /> Buscas Recentes
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] px-2 hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHistory();
                  }}
                >
                  Limpar
                </Button>
              </div>
              <div className="p-1">
                {searchHistory.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center group/item"
                  >
                    <button
                      className="flex-1 flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent rounded-md transition-colors truncate"
                      onClick={() => {
                        if (item.metadata?.id) {
                          navigate(`/clientes/${item.metadata.id}`);
                        } else {
                          setSearch(item.label);
                          setIsHistoryOpen(false);
                        }
                      }}
                    >
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{item.label}</span>
                    </button>
                    <button
                      className="p-2 text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(item.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
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
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
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
                onClick={() => handleClientClick(client)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
