import { Lightbulb, AlertTriangle, ArrowRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpportunities, type OpportunityProduct } from "@/hooks/useCommercialIntelligence";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MOCK_OPPORTUNITIES: OpportunityProduct[] = [
  { productId: 'mock-op-1', productSku: 'POW-019', productName: 'Power Bank 10000mAh', productImage: null, quoteCount: 18, orderCount: 2, conversionRate: 11, opportunityScore: 85, reason: 'Conversão muito baixa' },
  { productId: 'mock-op-2', productSku: 'REL-004', productName: 'Relógio de Parede Corporativo', productImage: null, quoteCount: 12, orderCount: 0, conversionRate: 0, opportunityScore: 100, reason: 'Cotado mas nunca vendido' },
  { productId: 'mock-op-3', productSku: 'KIT-033', productName: 'Kit Escritório 5 Peças', productImage: null, quoteCount: 9, orderCount: 1, conversionRate: 11, opportunityScore: 75, reason: 'Conversão muito baixa' },
  { productId: 'mock-op-4', productSku: 'NEC-012', productName: 'Necessaire Viagem Premium', productImage: null, quoteCount: 7, orderCount: 2, conversionRate: 29, opportunityScore: 50, reason: 'Conversão abaixo da média' },
];

export function OpportunityFinder({ days = 30, categoryId, supplierId, productId, categoryName }: { days?: number; categoryId?: string | null; supplierId?: string | null; productId?: string | null; categoryName?: string | null }) {
  const { data: realOpportunities, isLoading } = useOpportunities(days, categoryId, supplierId);
  const navigate = useNavigate();

  const hasRealData = !!(realOpportunities?.length);
  const isDemo = !hasRealData && !isLoading;
  const opportunities = hasRealData ? realOpportunities : MOCK_OPPORTUNITIES;

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
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-white" />
          </div>
          💡 Oportunidades de Conversão
          {isDemo && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">demo</Badge>}
        </CardTitle>
        <CardDescription className="text-xs">
          {categoryName ? `Oportunidades em "${categoryName}"` : 'Produtos muito cotados mas com baixa conversão'} · {days} dias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {opportunities.map((opp) => (
          <div
            key={opp.productSku || opp.productId}
            className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 cursor-pointer transition-all"
            onClick={() => !isDemo && opp.productId && navigate(`/produto/${opp.productId}`)}
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
                <span className="text-[10px]">({opp.conversionRate}%)</span>
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
