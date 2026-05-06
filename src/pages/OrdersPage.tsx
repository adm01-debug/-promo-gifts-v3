import { useState } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useOrdersList } from '@/hooks/useOrders';
import { OrderCard } from '@/components/orders/OrderCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { ScopeBadge } from '@/components/common/ScopeBadge';
import { TableRowSkeleton } from '@/components/common/ContextualSkeleton';

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const scope = useSalesScope();

  const { data, isLoading, isPlaceholderData } = useOrdersList(user?.id, scope, {
    search: searchQuery,
    page,
    pageSize,
  });

  const orders = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setPage(1); // Reset page on search
  };

  return (
    <>
      <PageSEO
        title="Gestão de Pedidos"
        description="Acompanhe e gerencie todos os seus pedidos em um só lugar."
        path="/pedidos"
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-4 px-3 py-3 pb-24 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              data-testid="page-title-pedidos"
              className="flex items-center gap-2 font-display text-xl font-bold text-foreground"
            >
              <Package className="h-6 w-6 text-primary" /> Gestão de Pedidos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe e gerencie seus pedidos</p>
          </div>
          <ScopeBadge />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou nota..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                Filtrar pedidos por status ou data
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-32 rounded bg-muted/60" />
                      <div className="h-3 w-56 rounded bg-muted/40" />
                      <div className="h-3 w-40 rounded bg-muted/30" />
                    </div>
                    <div className="h-9 w-24 rounded-full bg-muted/50" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-1 font-display text-lg font-medium text-foreground">
                {searchQuery ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Tente buscar com outros termos'
                  : 'Seus pedidos aparecerão aqui quando criados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                'grid gap-3 transition-opacity duration-200',
                isPlaceholderData && 'opacity-50',
              )}
            >
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate(`/pedidos/${order.id}`)}
                />
              ))}
            </div>

            {/* Paginação UI */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-medium">{(page - 1) * pageSize + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> de{' '}
                  <span className="font-medium">{totalCount}</span> pedidos
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próximo <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Helper para classes condicionais (geralmente disponível no projeto)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
