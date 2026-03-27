import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Flame,
  AlertTriangle,
  Moon,
  DollarSign,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  Activity,
  Loader2,
  Package,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useStockDailySummary,
  useStockVelocity,
  useProductIntelligenceData,
  aggregateDailySummaryByDate,
  getActiveFlags,
  type IntelligenceFlag,
  type ProductIntelligenceData,
} from "@/hooks/useStockHistory";
import { formatCurrency } from "@/lib/format";

interface StockHistoryChartProps {
  productId: string;
  productName?: string;
}

// ---------- Flag config ----------

const FLAG_CONFIG: Record<IntelligenceFlag, {
  icon: typeof Flame;
  label: string;
  colors: string;
  description: string;
}> = {
  'hot-product': {
    icon: Flame,
    label: 'Produto Quente',
    colors: 'bg-destructive/15 text-destructive border-destructive/30',
    description: 'Vendendo rápido no fornecedor e pode acabar em breve',
  },
  'stockout-risk': {
    icon: AlertTriangle,
    label: 'Risco de Ruptura',
    colors: 'bg-destructive/15 text-destructive border-destructive/30',
    description: 'Menos de 7 dias de estoque restante',
  },
  'stagnant': {
    icon: Moon,
    label: 'Estagnado',
    colors: 'bg-muted text-muted-foreground border-border',
    description: 'Baixa saída nos últimos 30 dias com estoque alto',
  },
  'negotiation-opportunity': {
    icon: DollarSign,
    label: 'Oportunidade de Desconto',
    colors: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    description: 'Estoque encalhado no fornecedor — pedir desconto',
  },
  'frequent-restock': {
    icon: RefreshCw,
    label: 'Alta Demanda',
    colors: 'bg-primary/15 text-primary border-primary/30',
    description: 'Fornecedor reabastece frequentemente — demanda confirmada',
  },
  'class-a': {
    icon: Star,
    label: 'Classe A',
    colors: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    description: 'Top 20% em giro de estoque',
  },
};

// ---------- Main Component ----------

export function StockHistoryChart({ productId, productName }: StockHistoryChartProps) {
  const [period, setPeriod] = useState<string>('30');
  const days = Number(period);

  const { data: summaries, isLoading: loadingSummary } = useStockDailySummary(productId, days);
  const { data: velocity } = useStockVelocity(productId);
  const { data: intelligence } = useProductIntelligenceData(productId);

  const chartData = useMemo(() => {
    if (!summaries?.length) return [];
    const aggregated = aggregateDailySummaryByDate(summaries);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return aggregated
      .filter(d => new Date(d.date) >= cutoff)
      .map(d => ({
        ...d,
        dateFormatted: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
        fullDate: format(parseISO(d.date), "dd/MM/yyyy", { locale: ptBR }),
      }));
  }, [summaries, days]);

  const flags = useMemo(() => getActiveFlags(intelligence), [intelligence]);

  // ---------- Loading ----------
  if (loadingSummary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ---------- No data ----------
  if (!summaries?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Histórico de Estoque (Fornecedor)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ainda não há dados de movimentação de estoque para este produto. 
            Os dados começam a ser coletados automaticamente após a ativação do sync.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---------- Velocity KPIs ----------
  const bestVelocity = effectiveVelocity?.length
    ? effectiveVelocity.reduce((best, v) => 
        (v.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0)) ? v : best, effectiveVelocity[0])
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Estoque & Inteligência
            </CardTitle>
            <CardDescription className="mt-1">
              Movimentação no fornecedor · {chartData.length} dias
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {effectiveIntelligence?.abc_classification && (
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs",
                  effectiveIntelligence.abc_classification === 'A' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                  effectiveIntelligence.abc_classification === 'B' ? 'bg-primary/15 text-primary border-primary/30' :
                  'bg-muted text-muted-foreground border-border'
                )}
              >
                Classe {effectiveIntelligence.abc_classification}
              </Badge>
            )}
            {effectiveIntelligence?.turnover_score != null && (
              <Badge variant="secondary" className="text-xs font-mono">
                Score: {Math.round(effectiveIntelligence.turnover_score)}
              </Badge>
            )}
          </div>
        </div>

        {/* Intelligence flags */}
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {flags.filter(f => f !== 'class-a').map(flag => {
              const cfg = FLAG_CONFIG[flag];
              const Icon = cfg.icon;
              return (
                <Badge
                  key={flag}
                  variant="outline"
                  className={cn("gap-1 px-2 py-0.5 text-xs border", cfg.colors)}
                  title={cfg.description}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </Badge>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiCard
            icon={TrendingDown}
            label="Saída/dia (7d)"
            value={bestVelocity?.avg_daily_depletion_7d?.toFixed(1) ?? '—'}
            sub="unidades"
          />
          <KpiCard
            icon={Clock}
            label="Dias até acabar"
            value={bestVelocity?.days_to_stockout != null ? String(Math.round(bestVelocity.days_to_stockout)) : '∞'}
            sub={bestVelocity?.days_to_stockout != null && bestVelocity.days_to_stockout < 15 ? 'atenção!' : 'estimativa'}
            alert={bestVelocity?.days_to_stockout != null && bestVelocity.days_to_stockout < 7}
          />
          <KpiCard
            icon={Package}
            label="Estoque atual"
            value={intelligence?.total_current_stock?.toLocaleString('pt-BR') ?? '—'}
            sub="total fornecedores"
          />
          <KpiCard
            icon={bestVelocity && bestVelocity.velocity_trend > 1.2 ? TrendingUp : 
                  bestVelocity && bestVelocity.velocity_trend < 0.8 ? TrendingDown : BarChart3}
            label="Tendência"
            value={bestVelocity?.velocity_trend != null 
              ? `${bestVelocity.velocity_trend > 1 ? '+' : ''}${((bestVelocity.velocity_trend - 1) * 100).toFixed(0)}%`
              : '—'}
            sub={bestVelocity?.velocity_trend != null
              ? (bestVelocity.velocity_trend > 1.5 ? 'acelerando!' :
                 bestVelocity.velocity_trend > 1 ? 'crescendo' :
                 bestVelocity.velocity_trend > 0.5 ? 'desacelerando' : 'caindo')
              : ''}
          />
        </div>

        {/* Period selector */}
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="h-7 flex-wrap">
            {['15','30','60','90','120','150','180','360'].map(p => (
              <TabsTrigger key={p} value={p} className="text-xs px-2 h-5">{p}d</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="stock"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                width={50}
              />
              <YAxis
                yAxisId="flow"
                orientation="right"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                width={35}
                hide
              />
              <Tooltip content={<StockTooltip />} />
              <Area
                yAxisId="stock"
                type="monotone"
                dataKey="stockClose"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.15)"
                strokeWidth={2}
                name="Estoque"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Bar
                yAxisId="flow"
                dataKey="depleted"
                fill="hsl(var(--destructive) / 0.4)"
                name="Saída"
                radius={[2, 2, 0, 0]}
                barSize={4}
              />
              <Bar
                yAxisId="flow"
                dataKey="restocked"
                fill="hsl(var(--primary) / 0.4)"
                name="Reposição"
                radius={[2, 2, 0, 0]}
                barSize={4}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Price change info */}
        {bestVelocity && bestVelocity.price_changes_30d > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>{bestVelocity.price_changes_30d} alteração(ões) de preço nos últimos 30 dias</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Sub-components ----------

function KpiCard({ icon: Icon, label, value, sub, alert }: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg p-2 text-center",
      alert ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"
    )}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={cn("h-3 w-3", alert ? "text-destructive" : "text-muted-foreground")} />
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
      <p className={cn(
        "text-sm font-bold",
        alert ? "text-destructive" : "text-foreground"
      )}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function StockTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Estoque:</span>
          <span className="font-semibold">{data.stockClose?.toLocaleString('pt-BR')}</span>
        </div>
        {data.depleted > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-destructive">Saída:</span>
            <span className="font-semibold text-destructive">-{data.depleted}</span>
          </div>
        )}
        {data.restocked > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-primary">Reposição:</span>
            <span className="font-semibold text-primary">+{data.restocked}</span>
          </div>
        )}
        {data.restockDetected && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
            🔄 Reabastecimento
          </Badge>
        )}
        {data.costPriceClose != null && (
          <div className="flex justify-between text-xs pt-1 border-t border-border">
            <span className="text-muted-foreground">Custo:</span>
            <span className="font-semibold">{formatCurrency(data.costPriceClose)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
