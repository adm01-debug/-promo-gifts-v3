/**
 * MarketIntelligenceChart — Visão MACRO de mercado
 * Replica o layout do StockHistoryChart (página de produto)
 * mas com dados agregados de todos os produtos.
 */
import { useMemo, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Loader2,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui/kpi-card";
import { useMarketIntelligenceMacro, type MacroSupplierMetrics } from "@/hooks/useMarketIntelligenceMacro";
import { useSupplierNames } from "@/hooks/useSupplierNames";
import { safeParseDateForChart } from "@/lib/stock-chart-utils";
import { SupplierChartFilter } from "@/components/products/SupplierChartFilter";

interface Props {
  days?: number;
  supplierId?: string | null;
}

export function MarketIntelligenceChart({ days: defaultDays = 30, supplierId }: Props) {
  const [period, setPeriod] = useState<string>(String(defaultDays));
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const days = Number(period);

  const { data, isLoading, error } = useMarketIntelligenceMacro(days, supplierId);

  // Supplier names
  const { data: supplierNamesMap } = useSupplierNames(data?.supplierIds ?? []);

  const supplierOptions = useMemo(() => {
    if (!data?.supplierIds?.length || data.supplierIds.length <= 1) return [];
    return data.supplierIds.map(id => ({
      id,
      name: supplierNamesMap?.get(id) ?? `Fornecedor ${id.slice(0, 6)}`,
    }));
  }, [data?.supplierIds, supplierNamesMap]);

  const chartData = useMemo(() => {
    if (!data?.daily?.length) return [];
    return data.daily.reduce<Array<typeof data.daily[0] & { dateFormatted: string; fullDate: string }>>((acc, d) => {
      const parsed = safeParseDateForChart(d.date);
      if (parsed) acc.push({ ...d, ...parsed });
      return acc;
    }, []);
  }, [data]);

  const supplierText = useMemo(() => {
    const count = data?.kpis?.supplierCount ?? 0;
    if (count === 0) return 'no fornecedor';
    return `em ${count} fornecedor${count > 1 ? 'es' : ''}`;
  }, [data?.kpis?.supplierCount]);

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
  const trendPercent = Math.round((trendRatio - 1) * 100);
  const trendLabel = trendRatio > 1.2 ? '↑ acelerando' : trendRatio < 0.8 ? '↓ desacelerando' : '→ estável';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" aria-hidden="true" />
              Inteligência de Mercado
            </CardTitle>
            <CardDescription className="mt-1">
              Como o mercado está comprando · visão macro · {days} dias
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trendRatio > 1.3 && (
              <Badge variant="outline" className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-xs font-bold">
                🚀 Mercado Aquecido
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Métricas de inteligência de mercado">
          <KpiCard
            icon={ShoppingCart}
            label="Vendas no mercado"
            value={avgDepletion.toFixed(1)}
            sub="un/dia (média 7d)"
            highlight={avgDepletion >= 20}
          />
          <KpiCard
            icon={BarChart3}
            label="Demanda"
            value={demandLevel}
            sub={trendLabel}
            customValueColor={demandColor}
          />
          <KpiCard
            icon={trendRatio > 1.2 ? TrendingUp : trendRatio < 0.8 ? TrendingDown : BarChart3}
            label="Tendência"
            value={`${trendPercent >= 0 ? '+' : ''}${trendPercent}%`}
            sub={trendRatio > 1 ? 'demanda crescente' : trendRatio < 0.8 ? 'demanda caindo' : 'demanda estável'}
            highlight={trendRatio > 1.3}
          />
          <KpiCard
            icon={Package}
            label="Disponível"
            value={(kpis?.totalCurrentStock ?? 0).toLocaleString('pt-BR')}
            sub={supplierText}
          />
        </div>

        {/* Period selector + supplier filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="h-7 flex-wrap">
              {['15', '30', '60', '90', '120', '180', '360'].map(p => (
                <TabsTrigger key={p} value={p} className="text-xs px-2 h-5">{p}d</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {supplierOptions.length > 1 && (
            <SupplierChartFilter
              suppliers={supplierOptions}
              selected={selectedSupplier}
              onSelect={setSelectedSupplier}
            />
          )}
        </div>

        {/* Chart */}
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Sem dados de mercado disponíveis para este período
          </div>
        ) : (
          <div className="h-[160px] sm:h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="dateFormatted" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                <YAxis yAxisId="stock" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={50} />
                <YAxis yAxisId="flow" orientation="right" hide />
                <Tooltip content={(props) => <MarketMacroTooltip {...props} />} />
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                  iconSize={8}
                  formatter={(value: string) => <span className="text-muted-foreground text-[10px]">{value}</span>}
                />
                <Area yAxisId="stock" type="monotone" dataKey="stockClose" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Disponível" dot={false} activeDot={{ r: 4 }} />
                <Bar yAxisId="flow" dataKey="depleted" fill="hsl(var(--destructive) / 0.4)" name="Compras do mercado" radius={[2, 2, 0, 0]} barSize={4} />
                <Bar yAxisId="flow" dataKey="restocked" fill="hsl(142 71% 45% / 0.5)" name="Reposição" radius={[2, 2, 0, 0]} barSize={4} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Supplier Comparison Cards */}
        {data?.suppliers && data.suppliers.length > 1 && supplierNamesMap && (
          <MacroSupplierComparison suppliers={data.suppliers} supplierNames={supplierNamesMap} />
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

// ---------- Supplier Comparison (macro version) ----------

function MacroSupplierComparison({ suppliers, supplierNames }: { suppliers: MacroSupplierMetrics[]; supplierNames: Map<string, string> }) {
  const COLORS = [
    'border-l-primary',
    'border-l-destructive',
    'border-l-emerald-500',
    'border-l-amber-500',
    'border-l-violet-500',
    'border-l-cyan-500',
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Comparativo por Fornecedor
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {suppliers.map((s, idx) => {
          const name = supplierNames.get(s.supplierId) ?? `Fornecedor ${s.supplierId.slice(0, 6)}`;
          const isBest = idx === 0 && suppliers.length > 1;

          return (
            <div
              key={s.supplierId}
              className={cn(
                "flex flex-col gap-1 p-2 rounded-md bg-muted/40 border-l-2",
                COLORS[idx % COLORS.length]
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium truncate max-w-[120px]" title={name}>
                  {name}
                </span>
                {isBest && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
                    Maior saída
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <div>
                  <p className="text-muted-foreground">Saída/dia</p>
                  <p className="font-bold text-foreground">{s.avgDailyDepletion7d.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estoque</p>
                  <p className="font-bold text-foreground">{s.currentStock.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tendência</p>
                  <p className={cn(
                    "font-bold flex items-center gap-0.5",
                    s.velocityTrend > 1 ? 'text-emerald-500' : s.velocityTrend < 0.8 ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {s.velocityTrend > 1 ? <TrendingUp className="h-2.5 w-2.5" /> :
                     s.velocityTrend < 0.8 ? <TrendingDown className="h-2.5 w-2.5" /> :
                     <Minus className="h-2.5 w-2.5" />}
                    {((s.velocityTrend - 1) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {s.daysToStockout != null && s.daysToStockout < 30 && (
                <p className={cn(
                  "text-[9px] flex items-center gap-1",
                  s.daysToStockout < 7 ? 'text-destructive' : 'text-amber-500'
                )}>
                  <Package className="h-2.5 w-2.5" />
                  {s.daysToStockout < 7 ? '⚠️' : '⏳'} Esgota em ~{s.daysToStockout}d
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Tooltip ----------

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
