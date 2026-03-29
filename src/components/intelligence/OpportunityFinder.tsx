import { Lightbulb, AlertTriangle, ArrowRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpportunities } from "@/hooks/useCommercialIntelligence";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function OpportunityFinder({ days = 30, categoryId, supplierId }: { days?: number; categoryId?: string | null; supplierId?: string | null }) {
  const { data: opportunities, isLoading } = useOpportunities(days, categoryId, supplierId);
  const navigate = useNavigate();

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

  if (!opportunities?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium mb-1">Nenhuma oportunidade detectada</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Conforme mais orçamentos e pedidos forem criados, oportunidades de conversão aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-white" />
          </div>
          💡 Oportunidades de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {opportunities.map((opp) => (
          <div
            key={opp.productSku || opp.productId}
            className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 cursor-pointer transition-all"
            onClick={() => opp.productId && navigate(`/produto/${opp.productId}`)}
          >
            {/* Image */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
              {opp.productImage ? (
                <img src={opp.productImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{opp.productName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-amber-600 font-medium">{opp.quoteCount} cotações</span>
                <span>→</span>
                <span className={cn(opp.orderCount === 0 ? "text-red-500" : "text-muted-foreground")}>
                  {opp.orderCount} pedidos
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 space-y-1">
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                {opp.reason}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-amber-500 transition-colors ml-auto" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
