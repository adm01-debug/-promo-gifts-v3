/**
 * MarketIntelligenceChart — Visão MACRO de mercado
 * Mostra movimentação agregada de estoque de todos os produtos/fornecedores.
 * "O que o mercado está comprando dos nossos concorrentes"
 */
import { useMemo } from "react";
import {
  ResponsiveContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  ComposedChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, ShoppingCart, BarChart3, TrendingUp, Package, AlertCircle } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { useMarketIntelligenceMacro } from "@/hooks/useMarketIntelligenceMacro";
import { safeParseDateForChart } from "@/lib/stock-chart-utils";

interface Props {
  days?: number;
  supplierId?: string | null;
}

export function MarketIntelligenceChart({ days = 30, supplierId }: Props) {
  const { data, isLoading, error } = useMarketIntelligenceMacro(days, supplierId);

  const chartData = useMemo(() => {
    if (!data?.daily?.length) return [];
    return data.daily.reduce<Array<typeof data.daily[0] & { dateFormatted: string; fullDate: string }>>((acc, d) => {
      const parsed = safeParseDateForChart(d.date);
      if (parsed) acc.push({ ...d, ...parsed });
      return acc;
    }, []);
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">Erro ao carregar dados de mercado</p>
          <p className="text-xs text-muted-foreground">Verifique a conexão e tente novamente</p>
        </CardContent>
      </Card>
    );
  }

  const kpis = data?.kpis;
  const hasData = !!chartData.length;

  // Market demand level
  const avgDepletion = kpis?.avgDailyDepletion ?? 0;
  const demandLevel = avgDepletion >= 50 ? 'Muito Alta' : avgDepletion >= 20 ? 'Alta' : avgDepletion >= 5 ? 'Moderada' : 'Baixa';
  const demandColor = avgDepletion >= 50 ? 'text-destructive' : avgDepletion >= 20 ? 'text-amber-500' : avgDepletion >= 5 ? 'text-primary' : 'text-muted-foreground';

  // Trend: compare 7d vs 30d depletion rate
  const trend7d = (kpis?.totalDepleted7d ?? 0) / 7;
  const trend30d = (kpis?.totalDepleted30d ?? 0) / Math.max(days, 1);
  const trendRatio = trend30d > 0 ? trend7d / trend30d : 1;
  const trendLabel = trendRatio > 1.2 ? '↑ acelerando' : trendRatio < 0.8 ? '↓ desacelerando' : '→ estável';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-white" />
              </div>
              🔍 Inteligência de Mercado
            </CardTitle>
            <CardDescription className="mt-1">
              O que o mercado está comprando · visão macro · {days} dias
            </CardDescription>
          </div>
          {trendRatio > 1.3 && (
            <Badge variant="outline" className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-xs font-bold">
              🚀 Mercado Aquecido
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiCard
            icon={ShoppingCart}
            label="Saídas no mercado"
            value={avgDepletion.toFixed(1)}
            sub="un/dia (média)"
            highlight={avgDepletion >= 20}
          />
          <KpiCard
            icon={BarChart3}
            label="Demanda geral"
            value={demandLevel}
            sub={trendLabel}
            customValueColor={demandColor}
          />
          <KpiCard
            icon={TrendingUp}
            label="Total saídas"
            value={(kpis?.totalDepleted30d ?? 0).toLocaleString('pt-BR')}
            sub={`${(kpis?.totalDepleted7d ?? 0).toLocaleString('pt-BR')} últimos 7d`}
          />
          <KpiCard
            icon={Package}
            label="Estoque atual"
            value={(kpis?.totalCurrentStock ?? 0).toLocaleString('pt-BR')}
            sub={`${(kpis?.totalRestocked30d ?? 0).toLocaleString('pt-BR')} repostos`}
          />
        </div>

        {/* Chart */}
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Sem dados de mercado disponíveis para este período
          </div>
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="dateFormatted" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                <YAxis yAxisId="stock" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={50} />
                <YAxis yAxisId="flow" orientation="right" hide />
                <Tooltip content={<MarketMacroTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                  iconSize={8}
                  formatter={(value: string) => <span className="text-muted-foreground text-[10px]">{value}</span>}
                />
                <Area yAxisId="stock" type="monotone" dataKey="stockClose" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Disponível no mercado" dot={false} activeDot={{ r: 4 }} />
                <Bar yAxisId="flow" dataKey="depleted" fill="hsl(var(--destructive) / 0.4)" name="Compras do mercado" radius={[2, 2, 0, 0]} barSize={4} />
                <Bar yAxisId="flow" dataKey="restocked" fill="hsl(142 71% 45% / 0.5)" name="Reposição fornecedores" radius={[2, 2, 0, 0]} barSize={4} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Insight */}
        {kpis?.topDepletionDay && (
          <p className="text-xs text-muted-foreground">
            📊 Pico de saídas: <span className="font-medium text-foreground">{kpis.topDepletionDay.value.toLocaleString('pt-BR')} un</span> em{' '}
            {new Date(kpis.topDepletionDay.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MarketMacroTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-2 space-y-1.5">
        {data.stockClose > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Disponível:</span>
            <span className="font-semibold">{data.stockClose.toLocaleString('pt-BR')} un</span>
          </div>
        )}
        {data.depleted > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-destructive">Compras mercado:</span>
            <span className="font-semibold text-destructive">{data.depleted.toLocaleString('pt-BR')} un</span>
          </div>
        )}
        {data.restocked > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-emerald-500">Reposição:</span>
            <span className="font-semibold text-emerald-500">{data.restocked.toLocaleString('pt-BR')} un</span>
          </div>
        )}
        {data.depleted === 0 && data.restocked === 0 && (
          <p className="text-xs text-muted-foreground italic">Sem movimentação</p>
        )}
      </div>
    </div>
  );
}
