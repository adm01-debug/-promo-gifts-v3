import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Search, Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useOrdersList } from "@/hooks/useOrders";
import { OrderCard } from "@/components/orders/OrderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesScope } from "@/lib/auth/visibility-scope";
import { ScopeBadge } from "@/components/common/ScopeBadge";

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const scope = useSalesScope();
  const { data: orders = [], isLoading } = useOrdersList(user?.id, scope);

  const filtered = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.notes ?? "").toLowerCase().includes(q) ||
      (o.client_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <MainLayout>
      <PageSEO title="Gestão de Pedidos" description="Acompanhe e gerencie todos os seus pedidos em um só lugar." path="/pedidos" />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 data-testid="page-title-pedidos" className="text-xl font-bold font-display text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" /> Gestão de Pedidos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Acompanhe e gerencie seus pedidos</p>
          </div>
          <ScopeBadge />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <TooltipProvider delayDuration={1500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">
                Filtrar pedidos por status ou data
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-medium text-foreground mb-1">
                {searchQuery ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "Tente buscar com outros termos" : "Seus pedidos aparecerão aqui quando criados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onClick={() => navigate(`/pedidos/${order.id}`)} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
