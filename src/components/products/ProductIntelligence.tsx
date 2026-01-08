import { useState } from "react";
import { 
  TrendingUp, 
  Eye, 
  FileText, 
  ShoppingCart, 
  Users, 
  Clock,
  Sparkles,
  BarChart3,
  ArrowUpRight,
  ChevronRight,
  Package,
  Target,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useProductInsights, useProductRecommendations } from "@/hooks/useProductRecommendations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProductIntelligenceProps {
  productId?: string;
  productSku?: string;
  productName?: string;
}

export function ProductIntelligence({ productId, productSku, productName }: ProductIntelligenceProps) {
  const navigate = useNavigate();
  const { data: insights, isLoading: insightsLoading } = useProductInsights(productId, productSku);
  const { frequentlyBoughtTogether, trendingProducts } = useProductRecommendations(productId, productSku);

  if (insightsLoading) {
    return <ProductIntelligenceSkeleton />;
  }

  const hasData = insights && (insights.totalViews > 0 || insights.totalQuotes > 0 || insights.totalOrders > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Inteligência do Produto
          </h2>
          <p className="text-sm text-muted-foreground">
            Dados e insights baseados em histórico real
          </p>
        </div>
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ainda não há dados</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Conforme o produto for visualizado e cotado, insights aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Métricas principais */}
          <MetricCard
            icon={Eye}
            label="Visualizações"
            value={insights?.totalViews || 0}
            color="blue"
          />
          <MetricCard
            icon={FileText}
            label="Em Cotações"
            value={insights?.totalQuotes || 0}
            color="amber"
          />
          <MetricCard
            icon={ShoppingCart}
            label="Pedidos"
            value={insights?.totalOrders || 0}
            color="green"
          />
          <MetricCard
            icon={Target}
            label="Taxa Conversão"
            value={`${insights?.conversionRate || 0}%`}
            color="purple"
            subtitle={insights?.conversionRate && insights.conversionRate > 20 ? "Excelente!" : undefined}
          />
        </div>
      )}

      {/* Quantidade média e Top Clientes */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Quantidade média */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Quantidade Média por Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {insights?.averageQuantity || 0}
                </span>
                <span className="text-muted-foreground">unidades</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Baseado em cotações e pedidos anteriores
              </p>
            </CardContent>
          </Card>

          {/* Top Clientes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Principais Compradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights?.topClients && insights.topClients.length > 0 ? (
                <div className="space-y-2">
                  {insights.topClients.slice(0, 3).map((client, idx) => (
                    <div 
                      key={client.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/clientes/${client.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          idx === 0 ? "bg-amber-500/20 text-amber-600" :
                          idx === 1 ? "bg-slate-400/20 text-slate-600" :
                          "bg-orange-600/20 text-orange-700"
                        )}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {client.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {client.totalOrdered} {client.totalOrdered === 1 ? 'pedido' : 'pedidos'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum cliente comprou este produto ainda
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Atividade Recente */}
      {insights?.recentActivity && insights.recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    activity.type === 'view' && "bg-blue-500/10",
                    activity.type === 'quote' && "bg-amber-500/10",
                    activity.type === 'order' && "bg-green-500/10"
                  )}>
                    {activity.type === 'view' && <Eye className="h-4 w-4 text-blue-500" />}
                    {activity.type === 'quote' && <FileText className="h-4 w-4 text-amber-500" />}
                    {activity.type === 'order' && <ShoppingCart className="h-4 w-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.date), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequentemente Comprados Juntos */}
      {frequentlyBoughtTogether.data && frequentlyBoughtTogether.data.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Frequentemente Comprados Juntos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {frequentlyBoughtTogether.data.map((product) => (
                <div 
                  key={product.productSku || product.productId}
                  className="group relative flex flex-col rounded-xl bg-muted/50 border border-border/50 overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => product.productId && navigate(`/produto/${product.productId}`)}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {product.productImage ? (
                      <img
                        src={product.productImage}
                        alt={product.productName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{product.productName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {product.timesOrderedTogether}x juntos
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Produtos em Alta */}
      {trendingProducts.data && trendingProducts.data.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Produtos em Alta
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Últimos 30 dias
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {trendingProducts.data.map((product) => (
                <div 
                  key={product.id}
                  className="group relative flex flex-col rounded-xl bg-muted/50 border border-border/50 overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/produto/${product.id}`)}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {product.images?.[0] ? (
                      <img
                        src={typeof product.images === 'object' && Array.isArray(product.images) ? product.images[0] : product.images}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {product.reason}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: 'blue' | 'amber' | 'green' | 'purple';
  subtitle?: string;
}

function MetricCard({ icon: Icon, label, value, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/25',
    green: 'from-green-500 to-green-600 shadow-green-500/25',
    purple: 'from-violet-500 to-purple-600 shadow-violet-500/25',
  };

  const bgClasses = {
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
    green: 'bg-green-500/10',
    purple: 'bg-violet-500/10',
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgClasses[color])}>
            <Icon className={cn(
              "h-5 w-5",
              color === 'blue' && "text-blue-500",
              color === 'amber' && "text-amber-500",
              color === 'green' && "text-green-500",
              color === 'purple' && "text-violet-500"
            )} />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {subtitle && (
            <Badge variant="secondary" className="mt-2 text-xs bg-green-500/10 text-green-600">
              {subtitle}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductIntelligenceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="h-8 w-16 mt-3" />
              <Skeleton className="h-4 w-24 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
