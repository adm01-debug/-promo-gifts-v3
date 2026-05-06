import { useState, useCallback, useMemo } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Users, Search, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCrmCompanies } from '@/hooks/useCrmCompanies';
import { ClientCard } from '@/components/clients/ClientCard';
import { getCompanyDisplayName } from '@/types/crm';
import { SearchHistoryPopover } from '@/components/search/SearchHistoryPopover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSearchHistory } from '@/hooks/useSearchHistory';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const {
    data: clients = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCrmCompanies({ is_customer: true });
  const { addToHistory } = useSearchHistory('company');

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        getCompanyDisplayName(c).toLowerCase().includes(q) ||
        (c.cnpj ?? '').toLowerCase().includes(q) ||
        (c.cidade ?? '').toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  const handleSearchSubmit = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length >= 2) {
        addToHistory({
          id: `search-${trimmed}`,
          label: trimmed,
          type: 'company',
        });
      }
      setSearch(trimmed);
    },
    [addToHistory],
  );

  const handleClientClick = useCallback(
    (client: any) => {
      addToHistory({
        id: client.id,
        label: getCompanyDisplayName(client),
        type: 'company',
        metadata: { id: client.id },
      });
      navigate(`/clientes/${client.id}`);
    },
    [addToHistory, navigate],
  );

  return (
    <>
      <PageSEO
        title="Clientes"
        description="Gestão de clientes com visão 360° de pedidos, ticket médio e LTV."
        path="/clientes"
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-4 px-3 py-3 pb-24 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1
              data-testid="page-title-clientes"
              className="flex items-center gap-2 font-display text-xl font-bold text-foreground"
            >
              <Users className="h-6 w-6 text-primary" /> Clientes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isError
                ? 'Erro ao carregar clientes'
                : `${clients.length} ${clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`}
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-xl items-center gap-2">
          <div className="group relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Buscar por nome, CNPJ ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit(search);
                }
              }}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <SearchHistoryPopover type="company" onSelect={(term) => setSearch(term)} />
        </div>

        {isError ? (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-destructive/70" />
              <h3 className="mb-1 font-display text-lg font-medium text-foreground">
                Erro ao carregar empresas do CRM
              </h3>
              <p className="mb-4 max-w-md text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : 'Não foi possível conectar ao banco de clientes. Verifique sua conexão e tente novamente.'}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => refetch()} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Tentar novamente
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                    Recarregar a lista de clientes do CRM
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-1 font-display text-lg font-medium text-foreground">
                {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Tente buscar com outros termos'
                  : 'Os clientes aparecerão aqui assim que forem cadastrados no CRM'}
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
    </>
  );
}
