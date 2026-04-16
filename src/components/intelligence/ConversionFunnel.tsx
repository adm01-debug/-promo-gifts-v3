/**
 * ConversionFunnel — Funil visual Search → View → Quote → Order.
 * Mostra drop-off entre cada estágio.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Search, Eye, FileText, ShoppingBag, ArrowDown } from "lucide-react";
import { subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversionFunnelProps {
  days: number;
}

interface FunnelStage {
  key: string;
  label: string;
  icon: typeof Search;
  count: number;
  colorClass: string;
}

export function ConversionFunnel({ days }: ConversionFunnelProps) {
  const since = subDays(new Date(), days).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["conversion-funnel", days],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supa = supabase as any;
      const [searches, views, quotes, orders] = await Promise.all([
        supa.from("search_analytics").select("id", { count: "exact", head: true }).gte("created_at", since),
        supa.from("product_views").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("quotes").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since),
      ]);
      return {
        searches: searches.count ?? 0,
        views: views.count ?? 0,
        quotes: quotes.count ?? 0,
        orders: orders.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const stages: FunnelStage[] = [
    { key: "searches", label: "Buscas", icon: Search, count: data?.searches ?? 0, colorClass: "bg-chart-2" },
    { key: "views", label: "Visualizações", icon: Eye, count: data?.views ?? 0, colorClass: "bg-primary" },
    { key: "quotes", label: "Orçamentos", icon: FileText, count: data?.quotes ?? 0, colorClass: "bg-chart-3" },
    { key: "orders", label: "Pedidos", icon: ShoppingBag, count: data?.orders ?? 0, colorClass: "bg-success" },
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Funil de Conversão
        </CardTitle>
        <CardDescription className="text-xs">
          Jornada do cliente nos últimos {days} dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {stages.map((stage, index) => {
              const widthPercent = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
              const previousCount = index > 0 ? stages[index - 1].count : null;
              const dropoff = previousCount && previousCount > 0
                ? Math.round(((previousCount - stage.count) / previousCount) * 100)
                : null;
              const conversionRate = previousCount && previousCount > 0
                ? Math.round((stage.count / previousCount) * 100)
                : null;
              const Icon = stage.icon;

              return (
                <div key={stage.key}>
                  {index > 0 && (
                    <div className="flex items-center gap-2 ml-2 my-1 text-[10px] text-muted-foreground">
                      <ArrowDown className="h-3 w-3" />
                      <span>
                        {conversionRate !== null
                          ? `${conversionRate}% conversão`
                          : "—"}
                      </span>
                      {dropoff !== null && dropoff > 0 && (
                        <span className="text-destructive/70">· -{dropoff}% drop-off</span>
                      )}
                    </div>
                  )}
                  <div className="relative">
                    <div
                      className={cn("h-12 rounded-lg flex items-center px-3 transition-all", stage.colorClass, "/15")}
                      style={{ width: `${widthPercent}%`, minWidth: "180px" }}
                    >
                      <div className={cn("p-1.5 rounded-md mr-3", stage.colorClass, "/30")}>
                        <Icon className={cn("h-4 w-4 text-foreground")} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium leading-none">{stage.label}</p>
                        <p className="text-base font-bold leading-tight mt-0.5">
                          {stage.count.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && data && data.searches > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Conversão total (busca → pedido):</span>
              <span className="font-bold text-success">
                {data.searches > 0 ? ((data.orders / data.searches) * 100).toFixed(2) : "0"}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
