import { Lightbulb, AlertTriangle, ArrowRight, Package, CircleDot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpportunities, type OpportunityProduct } from "@/hooks/useCommercialIntelligence";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

function ScoreIndicator({ score }: { score: number }) {
  const color = score >= 80 ? "text-destructive" : score >= 50 ? "text-warning" : "text-muted-foreground";
  const label = score >= 80 ? "Alta" : score >= 50 ? "Média" : "Baixa";
  return (
    <div className="flex items-center gap-1">
      <CircleDot className={cn("h-3 w-3", color)} />
      <span className={cn("text-[10px] font-medium", color)}>{label}</span>
    </div>
  );
}

export function OpportunityFinder({ days = 30, categoryId, supplierId, productId, categoryName }: { days?: number; categoryId?: string | null; supplierId?: string | null; productId?: string | null; categoryName?: string | null }) {
  const { data: opportunities, isLoading } = useOpportunities(days, categoryId, supplierId, productId);
  const navigate = useNavigate();

  const hasData = !!(opportunities?.length);


  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-44" /></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg skin-icon flex items-center justify-center">
                <Lightbulb className="h-3.5 w-3.5" />
              </div>
              💡 Oportunidades de Conversão
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {categoryName ? `Oportunidades em "${categoryName}"` : 'Produtos muito cotados mas com baixa conversão'} · {days} dias
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasData ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Nenhuma oportunidade identificada no período</p>
            <p className="text-[10px] mt-1 text-muted-foreground/60">
              Oportunidades aparecem quando produtos são muito cotados mas pouco vendidos
            </p>
          </div>
        ) : (
          opportunities!.map((opp) => (
            <div
              key={opp.productSku || opp.productId}
              className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-warning/30 hover:bg-warning/5 cursor-pointer transition-all"
              onClick={() => opp.productId && navigate(`/produto/${opp.productId}`)}
            >
              {/* Image */}
              <div className="w-9 h-9 rounded-md overflow-hidden bg-muted shrink-0 border border-border/50">
                {opp.productImage ? (
                  
<img src={opp.productImage} alt="Imagem do produto" className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{opp.productName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-warning font-medium">{opp.quoteCount} cotações</span>
                  <span>→</span>
                  <span className={cn(opp.orderCount === 0 ? "text-destructive" : "text-muted-foreground")}>
                    {opp.orderCount} pedidos
                  </span>
                  <span className="text-[10px]">({opp.conversionRate}%)</span>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <ScoreIndicator score={opp.opportunityScore} />
                <Badge variant="outline" className="text-[9px] text-warning border-warning/30 bg-warning/10 max-w-[120px] truncate">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                  {opp.reason}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}