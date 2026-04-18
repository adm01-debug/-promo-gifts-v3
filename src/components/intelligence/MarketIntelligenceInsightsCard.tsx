/**
 * MarketIntelligenceInsightsCard — narrativa em IA dos dados do dashboard de Inteligência de Mercado.
 * Consome a edge function `market-intelligence-insights` (Lovable AI).
 * v2: cache-aware, copiar/exportar, empty state, indicador de cache, animações escalonadas.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Sparkles, RefreshCw, AlertTriangle, TrendingUp, Lightbulb, Star,
  Copy, Check, Download, Database, Inbox,
} from "lucide-react";
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
  empty?: boolean;
  cached?: boolean;
  generated_at?: string;
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
  const [copied, setCopied] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["market-intelligence-insights", days, categoryId, supplierId, productId],
    queryFn: async (): Promise<InsightResponse> => {
      const { data, error } = await supabase.functions.invoke("market-intelligence-insights", {
        body: {
          days, categoryId, supplierId, productId,
          categoryName, supplierName, productName,
          forceRefresh,
        },
      });
      if (error) {
        if (error.message?.includes("429")) {
          toast({ title: "Limite de IA atingido", description: "Aguarde alguns instantes ou verifique sua quota.", variant: "destructive" });
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

  const handleRegenerate = async () => {
    setForceRefresh(true);
    await refetch();
    setForceRefresh(false);
  };

  const buildText = (d: InsightResponse) => {
    const filterCtx = [categoryName, supplierName, productName].filter(Boolean).join(" · ");
    return [
      `📊 Insights de Mercado — últimos ${days} dias${filterCtx ? ` (${filterCtx})` : ""}`,
      "",
      `📌 Resumo: ${d.summary}`,
      `📈 O que mudou: ${d.what_changed}`,
      `💡 Por quê: ${d.why}`,
      `🎯 Próxima ação: ${d.next_action}`,
      d.highlights?.length ? `\n⭐ Destaques:\n${d.highlights.map((h) => `  • ${h}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");
  };

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildText(data));
      setCopied(true);
      toast({ title: "Copiado!", description: "Insight copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (!data) return;
    const blob = new Blob([buildText(data)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insights-mercado-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exportado!", description: "Arquivo .txt salvo." });
  };

  const filterChips = [
    categoryName && `Categoria: ${categoryName}`,
    supplierName && `Fornecedor: ${supplierName}`,
    productName && `Produto: ${productName}`,
  ].filter(Boolean) as string[];

  return (
    <TooltipProvider>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-chart-2/5 animate-fade-in">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Insights da IA
              {data?.cached && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-chart-2/40 text-chart-2 gap-1">
                      <Database className="h-2.5 w-2.5" /> Cache
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Gerado em {data.generated_at ? new Date(data.generated_at).toLocaleString("pt-BR") : "—"}.
                      <br />Clique em atualizar para regenerar.
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
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
          <div className="flex items-center gap-1">
            {data && !data.empty && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copiar insight">
                      {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar para área de transferência</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleExport} aria-label="Exportar como nota">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar como nota (.txt)</TooltipContent>
                </Tooltip>
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRegenerate}
                  disabled={isFetching}
                  aria-label="Regenerar insights"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerar (ignora cache)</TooltipContent>
            </Tooltip>
          </div>
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
          ) : data?.empty ? (
            <div className="flex items-start gap-3 p-4 rounded-md bg-muted/40 border border-dashed border-border">
              <Inbox className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">{data.summary}</p>
                <p className="text-xs text-muted-foreground">{data.next_action}</p>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-3 text-sm">
              {data.summary && (
                <p className="font-medium text-foreground leading-relaxed animate-fade-in">{data.summary}</p>
              )}
              <div className="grid gap-2.5">
                <InsightRow icon={<TrendingUp className="h-4 w-4 text-chart-2" />} label="O que mudou" text={data.what_changed} delay={50} />
                <InsightRow icon={<Lightbulb className="h-4 w-4 text-chart-4" />} label="Por quê" text={data.why} delay={100} />
                <InsightRow icon={<Sparkles className="h-4 w-4 text-primary" />} label="Próxima ação" text={data.next_action} delay={150} />
                {data.highlights && data.highlights.length > 0 && (
                  <div
                    className="flex items-start gap-2 p-2.5 rounded-md bg-card/60 border border-border/40 animate-fade-in"
                    style={{ animationDelay: "200ms" }}
                  >
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
    </TooltipProvider>
  );
}

function InsightRow({
  icon,
  label,
  text,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  text?: string;
  delay?: number;
}) {
  if (!text) return null;
  return (
    <div
      className="flex items-start gap-2 p-2.5 rounded-md bg-card/60 border border-border/40 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
