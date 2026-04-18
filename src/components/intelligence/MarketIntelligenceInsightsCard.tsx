/**
 * MarketIntelligenceInsightsCard — narrativa em IA dos dados do dashboard de Inteligência de Mercado.
 * Consome a edge function `market-intelligence-insights` (Lovable AI).
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Lightbulb, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Props {
  days: number;
  categoryId?: string | null;
  supplierId?: string | null;
  productId?: string | null;
  categoryName?: string | null;
  supplierName?: string | null;
  productName?: string | null;
}

interface InsightResponse {
  summary: string;
  what_changed: string;
  why: string;
  next_action: string;
  highlights?: string[];
}

export function MarketIntelligenceInsightsCard({
  days,
  categoryId,
  supplierId,
  productId,
  categoryName,
  supplierName,
  productName,
}: Props) {
  const { toast } = useToast();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [
      "market-intelligence-insights",
      days,
      categoryId,
      supplierId,
      productId,
    ],
    queryFn: async (): Promise<InsightResponse> => {
      const { data, error } = await supabase.functions.invoke("market-intelligence-insights", {
        body: { days, categoryId, supplierId, productId, categoryName, supplierName, productName },
      });
      if (error) {
        if (error.message?.includes("429")) {
          toast({ title: "Limite de IA atingido", description: "Aguarde alguns instantes.", variant: "destructive" });
        } else if (error.message?.includes("402")) {
          toast({ title: "Sem créditos de IA", description: "Adicione créditos no workspace.", variant: "destructive" });
        }
        throw error;
      }
      return data as InsightResponse;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const filterChips = [
    categoryName && `Categoria: ${categoryName}`,
    supplierName && `Fornecedor: ${supplierName}`,
    productName && `Produto: ${productName}`,
  ].filter(Boolean) as string[];

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-chart-2/5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Insights da IA
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-1.5 mt-1">
            <span>Análise dos últimos {days} dias</span>
            {filterChips.map((c) => (
              <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                {c}
              </Badge>
            ))}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Regenerar insights"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : isError ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span>Não foi possível gerar insights agora. Tente novamente em instantes.</span>
          </div>
        ) : data ? (
          <div className="space-y-3 text-sm">
            {data.summary && (
              <p className="font-medium text-foreground leading-relaxed">{data.summary}</p>
            )}
            <div className="grid gap-2.5">
              <InsightRow icon={<TrendingUp className="h-4 w-4 text-chart-2" />} label="O que mudou" text={data.what_changed} />
              <InsightRow icon={<Lightbulb className="h-4 w-4 text-chart-4" />} label="Por quê" text={data.why} />
              <InsightRow icon={<Sparkles className="h-4 w-4 text-primary" />} label="Próxima ação" text={data.next_action} />
              {data.highlights && data.highlights.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-card/60 border border-border/40">
                  <div className="shrink-0 mt-0.5"><Star className="h-4 w-4 text-chart-5" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Destaques</p>
                    <ul className="text-sm text-foreground/90 leading-relaxed list-disc pl-4 space-y-0.5">
                      {data.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InsightRow({ icon, label, text }: { icon: React.ReactNode; label: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md bg-card/60 border border-border/40">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
