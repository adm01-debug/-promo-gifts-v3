/**
 * ClientSeasonalityHeatmap — Zona 6 do BI.
 * Heatmap 12 meses × 2 linhas (Cliente / Setor) com tooltip Radix,
 * cards laterais de "Próximo pico" + "Insight" e badge real/simulado.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Sparkles, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  useClientSeasonality,
  SEASONALITY_MONTH_LABELS_FULL,
} from "@/hooks/bi/useClientSeasonality";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
}

/** Tailwind safelist: bg-violet-{50,100,200,300,400,500,600} */
function intensityToBg(intensity: number): string {
  if (intensity <= 0) return "bg-muted/40";
  if (intensity < 0.15) return "bg-violet-50 dark:bg-violet-950/40";
  if (intensity < 0.3) return "bg-violet-100 dark:bg-violet-900/50";
  if (intensity < 0.45) return "bg-violet-200 dark:bg-violet-800/60";
  if (intensity < 0.6) return "bg-violet-300 dark:bg-violet-700/70";
  if (intensity < 0.75) return "bg-violet-400 dark:bg-violet-600/80";
  if (intensity < 0.9) return "bg-violet-500 dark:bg-violet-500";
  return "bg-violet-600 dark:bg-violet-400";
}
function intensityToText(intensity: number): string {
  return intensity >= 0.6 ? "text-white" : "text-foreground";
}

export function ClientSeasonalityHeatmap({ clientId, ramoAtividade }: Props) {
  const seasonality = useClientSeasonality(clientId, ramoAtividade);
  const currentMonth = new Date().getMonth() + 1;

  if (seasonality.isLoading) {
    return (
      <Card className="border-[1.5px]">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            </div>
            <div>
              <CardTitle className="text-base font-display">Sazonalidade Cliente × Setor</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quando o cliente compra ao longo do ano · janela de {seasonality.windowMonths} meses
              </p>
            </div>
          </div>
          <Badge variant={seasonality.isMock ? "secondary" : "default"} className="text-[10px]">
            {seasonality.isMock
              ? "Dados simulados"
              : `Dados reais · ${seasonality.monthsCovered} mês${seasonality.monthsCovered === 1 ? "" : "es"}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider delayDuration={150}>
          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px] space-y-2">
              {/* Cabeçalho meses */}
              <div className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 items-center">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide" />
                {seasonality.client.map((c) => (
                  <div
                    key={`h-${c.month}`}
                    className={cn(
                      "text-center text-[10px] font-medium uppercase tracking-wide py-1",
                      c.month === currentMonth
                        ? "text-violet-600 dark:text-violet-300 font-bold"
                        : "text-muted-foreground",
                    )}
                  >
                    {c.monthLabel}
                  </div>
                ))}
              </div>

              {/* Linha Cliente */}
              <div className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 items-center">
                <div className="text-xs font-semibold text-foreground pr-2">Cliente</div>
                {seasonality.client.map((c) => (
                  <Tooltip key={`c-${c.month}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-12 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 cursor-help",
                          intensityToBg(c.intensity),
                          intensityToText(c.intensity),
                          c.month === currentMonth && "ring-2 ring-violet-600 dark:ring-violet-400 ring-offset-1 ring-offset-background",
                        )}
                      >
                        {c.quotesCount > 0 ? c.quotesCount : "—"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="font-semibold">{SEASONALITY_MONTH_LABELS_FULL[c.month - 1]}</div>
                      {c.quotesCount > 0 ? (
                        <>
                          <div>{c.quotesCount} pedido{c.quotesCount === 1 ? "" : "s"} · {formatCurrency(c.totalRevenue)}</div>
                          <div className="text-muted-foreground">Ticket médio {formatCurrency(c.avgTicket)} · {c.sharePercent.toFixed(0)}% do ano</div>
                        </>
                      ) : (
                        <div className="text-muted-foreground">Sem registros</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Linha Setor */}
              <div className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 items-center">
                <div className="text-xs font-semibold text-muted-foreground pr-2">Setor</div>
                {seasonality.industry.map((c) => (
                  <Tooltip key={`i-${c.month}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-12 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 cursor-help opacity-90",
                          intensityToBg(c.intensity),
                          intensityToText(c.intensity),
                          c.month === currentMonth && "ring-2 ring-violet-400 dark:ring-violet-500 ring-offset-1 ring-offset-background",
                        )}
                      >
                        {c.avgQuotesPerCompany > 0 ? c.avgQuotesPerCompany.toFixed(1) : "—"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="font-semibold">{SEASONALITY_MONTH_LABELS_FULL[c.month - 1]} · Setor</div>
                      {c.avgQuotesPerCompany > 0 ? (
                        <>
                          <div>{c.avgQuotesPerCompany.toFixed(1)} pedidos/empresa</div>
                          <div className="text-muted-foreground">Receita média {formatCurrency(c.avgRevenuePerCompany)} · {c.sharePercent.toFixed(0)}% do ano</div>
                        </>
                      ) : (
                        <div className="text-muted-foreground">Sem dados</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-0.5">
                  {[0.05, 0.2, 0.4, 0.55, 0.7, 0.85, 1].map((i) => (
                    <div key={i} className={cn("w-4 h-3 rounded-sm", intensityToBg(i))} />
                  ))}
                </div>
                <span>Mais</span>
                <span className="ml-3 inline-flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm ring-2 ring-violet-600 ring-offset-1 ring-offset-background" />
                  Hoje
                </span>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Cards inferiores: Próximo pico + Insight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/30 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                Próximo pico
              </span>
            </div>
            {seasonality.nextPeakMonth ? (
              <div>
                <div className="text-lg font-bold text-foreground">
                  {SEASONALITY_MONTH_LABELS_FULL[seasonality.nextPeakMonth - 1]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {seasonality.daysToNextPeak === 0
                    ? "Estamos no pico agora!"
                    : `em ${seasonality.daysToNextPeak} dia${seasonality.daysToNextPeak === 1 ? "" : "s"}`}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Sem padrão sazonal claro identificado.</div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Insight
              </span>
            </div>
            {seasonality.insight ? (
              <p className="text-xs leading-relaxed text-foreground">{seasonality.insight}</p>
            ) : (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Info className="h-3 w-3" />
                Histórico insuficiente para insight automático.
              </p>
            )}
          </div>
        </div>

        {/* Top 3 picos lado a lado */}
        {(seasonality.topClientMonths.length > 0 || seasonality.topIndustryMonths.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-semibold text-foreground mb-1">Top 3 meses do cliente</div>
              <div className="flex flex-wrap gap-1.5">
                {seasonality.topClientMonths.length === 0 && (
                  <span className="text-muted-foreground">—</span>
                )}
                {seasonality.topClientMonths.map((c) => (
                  <Badge key={c.month} variant="secondary" className="text-[10px]">
                    {SEASONALITY_MONTH_LABELS_FULL[c.month - 1]} · {c.quotesCount}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-muted-foreground mb-1">Top 3 meses do setor</div>
              <div className="flex flex-wrap gap-1.5">
                {seasonality.topIndustryMonths.length === 0 && (
                  <span className="text-muted-foreground">—</span>
                )}
                {seasonality.topIndustryMonths.map((c) => (
                  <Badge key={c.month} variant="outline" className="text-[10px]">
                    {SEASONALITY_MONTH_LABELS_FULL[c.month - 1]} · {c.avgQuotesPerCompany.toFixed(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
