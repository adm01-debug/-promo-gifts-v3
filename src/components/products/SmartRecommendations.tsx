import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  TrendingUp, 
  History, 
  Users, 
  Package,
  ArrowRight,
  Star,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductRecommendations, useClientTopProducts } from "@/hooks/useProductRecommendations";
import { cn } from "@/lib/utils";

interface SmartRecommendationsProps {
  clientId?: string;
  clientName?: string;
  showTabs?: boolean;
}

export function SmartRecommendations({ clientId, clientName, showTabs = true }: SmartRecommendationsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personalized");
  
  const { 
    personalizedRecommendations, 
    trendingProducts,
    isLoading 
  } = useProductRecommendations();
  
  const { data: clientTopProducts, isLoading: clientLoading } = useClientTopProducts(clientId);

  if (isLoading) {
    return <SmartRecommendationsSkeleton />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Recomendações Inteligentes
            </h2>
            <p className="text-sm text-muted-foreground">
              Sugestões personalizadas baseadas em dados reais
            </p>
          </div>
        </div>
      </div>

      {showTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personalized" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Para Você</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Em Alta</span>
            </TabsTrigger>
            {clientId && (
              <TabsTrigger value="client" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Do Cliente</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personalized" className="mt-4">
            <RecommendationGrid
              products={personalizedRecommendations.data || []}
              emptyMessage="Navegue pelo catálogo para receber recomendações personalizadas"
              emptyIcon={History}
            />
          </TabsContent>

          <TabsContent value="trending" className="mt-4">
            <RecommendationGrid
              products={trendingProducts.data || []}
              emptyMessage="Nenhum produto em alta no momento"
              emptyIcon={TrendingUp}
            />
          </TabsContent>

          {clientId && (
            <TabsContent value="client" className="mt-4">
              <ClientProductsGrid
                products={clientTopProducts || []}
                clientName={clientName}
                isLoading={clientLoading}
              />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div className="space-y-6">
          {/* Personalizadas */}
          {personalizedRecommendations.data && personalizedRecommendations.data.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Baseado no seu Histórico</h3>
              </div>
              <RecommendationGrid products={personalizedRecommendations.data} />
            </section>
          )}

          {/* Em Alta */}
          {trendingProducts.data && trendingProducts.data.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-success" />
                <h3 className="font-semibold">Produtos em Alta</h3>
                <Badge variant="secondary" className="text-xs">Últimos 30 dias</Badge>
              </div>
              <RecommendationGrid products={trendingProducts.data} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

interface RecommendationGridProps {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    images: any;
    category_name: string | null;
    score: number;
    reason: string;
  }>;
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
}

function RecommendationGrid({ products, emptyMessage, emptyIcon: EmptyIcon = Package }: RecommendationGridProps) {
  const navigate = useNavigate();

  if (!products || products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <EmptyIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm max-w-sm">
            {emptyMessage || "Nenhuma recomendação disponível"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {products.map((product, idx) => (
        <div
          key={product.id}
          className={cn(
            "group relative flex flex-col rounded-xl bg-card border border-border/50 overflow-hidden",
            "transition-all duration-300 cursor-pointer",
            "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
            "animate-fade-in"
          )}
          style={{ animationDelay: `${idx * 50}ms` }}
          onClick={() => navigate(`/produto/${product.id}`)}
        >
          {/* Score Badge */}
          {product.score >= 80 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Star className="h-3 w-3 text-primary-foreground fill-white" />
              </div>
            </div>
          )}

          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.images?.[0] ? (
              <img
                src={typeof product.images === 'object' && Array.isArray(product.images) ? product.images[0] : product.images}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 space-y-2">
            {product.category_name && (
              <p className="text-xs text-muted-foreground truncate">
                {product.category_name}
              </p>
            )}
            <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {product.name}
            </h4>
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-foreground text-sm">
                {formatCurrency(product.price)}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] w-full justify-center">
              {product.reason}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ClientProductsGridProps {
  products: Array<{
    sku: string;
    name: string;
    image: string | null;
    totalQuantity: number;
    totalValue: number;
    orderCount: number;
  }>;
  clientName?: string;
  isLoading?: boolean;
}

function ClientProductsGrid({ products, clientName, isLoading }: ClientProductsGridProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-3 w-1/2 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">
            {clientName ? `Histórico de ${clientName}` : 'Selecione um Cliente'}
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            {clientName 
              ? 'Este cliente ainda não possui histórico de compras'
              : 'Selecione um cliente para ver os produtos mais comprados'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {clientName && (
        <div className="flex items-center gap-2 px-1">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            Produtos mais comprados por <strong className="text-foreground">{clientName}</strong>
          </span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product, idx) => (
          <Card 
            key={product.sku || idx}
            className="group hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => product.sku && navigate(`/?search=${product.sku}`)}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Ranking */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  idx === 0 ? "bg-amber-500/20 text-amber-600" :
                  idx === 1 ? "bg-slate-400/20 text-slate-600" :
                  idx === 2 ? "bg-orange-600/20 text-orange-700" :
                  "bg-muted text-muted-foreground"
                )}>
                  {idx + 1}
                </div>

                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {product.totalQuantity} un.
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {product.orderCount} {product.orderCount === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {formatCurrency(product.totalValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SmartRecommendationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
