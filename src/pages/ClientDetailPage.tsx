import { useParams, useNavigate } from 'react-router-dom';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCrmCompany } from '@/hooks/useCrmCompanies';
import { useClientOrdersHistory } from '@/hooks/useClientOrdersHistory';
import { useClientTopProducts } from '@/hooks/useClientTopProducts';
import { ClientDetailHeader } from '@/components/clients/ClientDetailHeader';
import { ClientStatsCards } from '@/components/clients/ClientStatsCards';
import { OrderCard } from '@/components/orders/OrderCard';
import { Package, TrendingUp } from 'lucide-react';
import { getCompanyDisplayName } from '@/types/crm';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading: loadingClient } = useCrmCompany(id);
  const { data: history, isLoading: loadingHistory } = useClientOrdersHistory(id);
  const { data: topProducts = [], isLoading: loadingProducts } = useClientTopProducts(id);

  if (loadingClient) {
    return (
      <>
        <div className="mx-auto w-full max-w-[1920px] space-y-4 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 xl:px-8">
          <Skeleton className="h-20" />
          <Skeleton className="h-24" />
        </div>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <div className="mx-auto w-full max-w-[1920px] px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Cliente não encontrado.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const name = getCompanyDisplayName(client);
  const formatBRL = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  return (
    <>
      <PageSEO
        title={`${name} | Clientes`}
        description={`Visão 360° de ${name}: histórico de pedidos, LTV e produtos mais comprados.`}
        path={`/clientes/${id}`}
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-5 px-3 py-3 pb-24 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <ClientDetailHeader client={client} />

        {loadingHistory ? (
          <Skeleton className="h-24" />
        ) : (
          <ClientStatsCards
            ordersCount={history?.ordersCount ?? 0}
            totalLtv={history?.totalLtv ?? 0}
            avgTicket={history?.avgTicket ?? 0}
            lastOrderAt={history?.lastOrderAt}
          />
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Pedidos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-primary" /> Histórico de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingHistory ? (
                <Skeleton className="h-16" />
              ) : !history?.orders.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum pedido registrado para este cliente.
                </p>
              ) : (
                history.orders
                  .slice(0, 10)
                  .map((o) => (
                    <OrderCard key={o.id} order={o} onClick={() => navigate(`/pedidos/${o.id}`)} />
                  ))
              )}
            </CardContent>
          </Card>

          {/* Top produtos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Produtos mais comprados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingProducts ? (
                <Skeleton className="h-16" />
              ) : topProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sem dados de produtos ainda.
                </p>
              ) : (
                topProducts.map((p) => (
                  <div
                    key={(p.sku ?? '') + p.name}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                      {p.image && (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.totalQuantity} un · {p.orderCount}{' '}
                        {p.orderCount === 1 ? 'pedido' : 'pedidos'}
                      </p>
                    </div>
                    <p className="flex-shrink-0 text-xs font-medium text-foreground">
                      {formatBRL(p.totalValue)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
