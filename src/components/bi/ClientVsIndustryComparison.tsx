/**
 * ClientVsIndustryComparison — Zona 5 do BI.
 * Compara o cliente atual com a média do seu ramo de atividade em 4 métricas-chave.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, TrendingUp, TrendingDown, Minus, Lightbulb, Info } from "lucide-react";
import { useClientVsIndustry, type MetricComparison } from "@/hooks/bi/useClientVsIndustry";
import { formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
}

function formatValue(m: MetricComparison): string {
  if (m.format === "currency") return formatCurrencyCompact(m.clientValue);
  return m.clientValue.toFixed(m.clientValue < 10 ? 1 : 0);
}
function formatIndustry(m: MetricComparison): string {
  if (m.format === "currency") return formatCurrencyCompact(m.industryAvg);
  return m.industryAvg.toFixed(m.industryAvg < 10 ? 1 : 0);
}

function classificationStyles(c: MetricComparison["classification"]) {
  switch (c) {
    case "above":
      return {
        text: "text-emerald-600 dark:text-emerald-400",
        bar: "bg-emerald-500",
        bg: "bg-emerald-500/10",
        Icon: TrendingUp,
        label: "Acima da média",
      };
    case "below":
      return {
        text: "text-red-600 dark:text-red-400",
        bar: "bg-red-500",
        bg: "bg-red-500/10",
        Icon: TrendingDown,
        label: "Abaixo da média",
      };
    case "on_par":
      return {
        text: "text-amber-600 dark:text-amber-400",
        bar: "bg-amber-500",
        bg: "bg-amber-500/10",
        Icon: Minus,
        label: "Na média",
      };
    default:
      return {
        text: "text-muted-foreground",
        bar: "bg-muted",
        bg: "bg-muted/40",
        Icon: Minus,
        label: "Sem dados",
      };
  }
}

function MetricRow({ metric }: { metric: MetricComparison }) {
  const styles = classificationStyles(metric.classification);
  const total = Math.max(metric.clientValue, metric.industryAvg, 1);
  const clientPct = Math.min(100, (metric.clientValue / total) * 100);
  const industryPct = Math.min(100, (metric.industryAvg / total) * 100);
  const deltaSign = metric.deltaPercent > 0 ? "+" : "";

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-card/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {metric.label}
        </span>
        <Badge
          variant="outline"
          className={cn("text-[10px] gap-1 border-0", styles.bg, styles.text)}
        >
          <styles.Icon className="h-3 w-3" />
          {deltaSign}
          {Math.round(metric.deltaPercent)}%
        </Badge>
      </div>

      <div className="space-y-1.5">
        {/* Cliente */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-foreground">Cliente</span>
            <span className={cn("font-bold tabular-nums", styles.text)}>{formatValue(metric)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", styles.bar)}
              style={{ width: `${clientPct}%` }}
            />
          </div>
        </div>
        {/* Setor */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Média do setor</span>
            <span className="text-muted-foreground tabular-nums">{formatIndustry(metric)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-muted-foreground/40 transition-all"
              style={{ width: `${industryPct}%` }}
            />
          </div>
        </div>
      </div>

      <p className={cn("text-[10px] font-medium", styles.text)}>{styles.label}</p>
    </div>
  );
}

export function ClientVsIndustryComparison({ clientId, ramoAtividade }: Props) {
  const { isLoading, hasEnoughSample, sampleSize, daysWindow, metrics, insight } =
    useClientVsIndustry(clientId, ramoAtividade);

  // Sem ramo cadastrado → não exibe
  if (!ramoAtividade) return null;

  if (isLoading) {
    return (
      <Card className="border-[1.5px]">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!hasEnoughSample) {
    return (
      <Card className="border-[1.5px] border-dashed">
        <CardContent className="p-6 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-sm">
              Comparativo Cliente × Setor
            </h3>
            <p className="text-xs text-muted-foreground">
              Amostra do ramo <span className="font-medium">{ramoAtividade}</span> ainda
              insuficiente para gerar benchmarking. Mínimo de 3 empresas com orçamentos
              nos últimos {daysWindow} dias.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Scale className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="font-display text-base">
                Cliente × Setor
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Benchmark contra {sampleSize} empresa{sampleSize !== 1 ? "s" : ""} de{" "}
                <span className="font-medium">{ramoAtividade}</span> · últimos {daysWindow} dias
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]"
          >
            Dados reais
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.map((m) => (
            <MetricRow key={m.label} metric={m} />
          ))}
        </div>

        {insight && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">{insight}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
