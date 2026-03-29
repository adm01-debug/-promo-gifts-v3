import { PieChart, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSegmentAnalysis } from "@/hooks/useCommercialIntelligence";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500",
  "bg-teal-500", "bg-pink-500",
];

export function SegmentAnalysis({ days = 30 }: { days?: number }) {
  const { data: segments, isLoading } = useSegmentAnalysis(days);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  if (!segments?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Sem dados de segmentos ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...segments.map(s => s.revenue));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <PieChart className="h-3.5 w-3.5 text-white" />
          </div>
          🎯 Top Clientes por Faturamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {segments.map((segment, i) => {
          const percentage = maxRevenue > 0 ? (segment.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={segment.segment} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium flex-1 mr-2">{segment.segment}</span>
                <span className="text-muted-foreground text-xs shrink-0">
                  {segment.orderCount} pedidos · {formatCurrency(segment.revenue)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", COLORS[i % COLORS.length])}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
