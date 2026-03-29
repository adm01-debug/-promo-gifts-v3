import { 
  Eye, 
  Users, 
  BarChart3,
  Package,
  Target,
  Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  const { frequentlyBoughtTogether } = useProductRecommendations(productId, productSku);

  if (insightsLoading) {
    return <ProductIntelligenceSkeleton />;
  }

  const hasData = insights && (insights.totalViews > 0 || insights.totalQuotes > 0 || insights.totalOrders > 0);

  return (
    <div className="space-y-3">
      {/* Header compacto */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <BarChart3 className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-sm text-foreground">Inteligência do Produto</h2>
          <p className="text-[11px] text-muted-foreground leading-none">Dados e insights baseados em histórico real</p>
        </div>
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Ainda não há dados</h3>
            <p className="text-muted-foreground text-xs max-w-xs">
              Conforme o produto for visualizado e cotado, insights aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Métricas em linha compacta */}
          <div className="grid grid-cols-2 gap-2">
            <MetricCard icon={Eye} label="Visualizações" value={insights?.totalViews || 0} color="blue" />
            <MetricCard icon={Target} label="Conversão" value={`${insights?.conversionRate || 0}%`} color="purple" />
          </div>

          {/* Qtd média + Top Clientes lado a lado, compactos */}
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Qtd. Média / Pedido</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">{insights?.averageQuantity || 0}</span>
                  <span className="text-xs text-muted-foreground">un.</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Principais Compradores</span>
                </div>
                {insights?.topClients && insights.topClients.length > 0 ? (
                  <div className="space-y-1">
                    {insights.topClients.slice(0, 3).map((client, idx) => (
                      <div 
                        key={client.id}
                        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                        onClick={() => navigate(`/clientes/${client.id}`)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                            idx === 0 ? "bg-amber-500/20 text-amber-600" :
                            idx === 1 ? "bg-slate-400/20 text-slate-600" :
                            "bg-orange-600/20 text-orange-700"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="text-[11px] font-medium truncate max-w-[80px]">{client.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{client.totalOrdered}x</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Nenhum comprador ainda</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Frequentemente Comprados Juntos */}
      {frequentlyBoughtTogether.data && frequentlyBoughtTogether.data.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Comprados Juntos</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {frequentlyBoughtTogether.data.map((product) => (
                <div 
                  key={product.productSku || product.productId}
                  className="group flex-shrink-0 w-16 cursor-pointer"
                  onClick={() => product.productId && navigate(`/produto/${product.productId}`)}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border/50 group-hover:border-primary/30 transition-colors">
                    {product.productImage ? (
                      <img src={product.productImage} alt={product.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] truncate mt-0.5">{product.productName}</p>
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
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  const iconColor = {
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    green: 'text-green-500',
    purple: 'text-violet-500',
  };
  const bgColor = {
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
    green: 'bg-green-500/10',
    purple: 'bg-violet-500/10',
  };

  return (
    <Card>
      <CardContent className="p-2.5">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mb-1.5", bgColor[color])}>
          <Icon className={cn("h-3.5 w-3.5", iconColor[color])} />
        </div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProductIntelligenceSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-2.5">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-5 w-10 mt-1.5" />
              <Skeleton className="h-3 w-16 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
