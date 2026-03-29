/**
 * StockHistoryChart — Inteligência de Mercado (Página de Produto)
 * Foco COMERCIAL: "como o mercado está comprando este produto"
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Flame,
  Target,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Loader2,
  ShoppingCart,
  BarChart3,
  Star,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useStockDailySummary,
  useStockVelocity,
  useProductIntelligenceData,
  aggregateDailySummaryByDate,
  extractUniqueSupplierIds,
  getActiveFlags,
  type IntelligenceFlag,
} from "@/hooks/useStockHistory";
import { useSupplierNames } from "@/hooks/useSupplierNames";
import { formatCurrency } from "@/lib/format";
import {
  safeVelocityTrend,
  safeNumber,
  generateMockStockData,
  generateMockVelocity,
  generateMockVelocities,
  generateMockIntelligence,
  generateMockSupplierNames,
  formatVelocityTrendCommercial,
  safeParseDateForChart,
  isRealIntelligence,
  COMMERCIAL_FLAG_CONFIG,
  type MockIntelligenceData,
  safePriceChanges,
} from "@/lib/stock-chart-utils";
import { KpiCard } from "@/components/ui/kpi-card";
import { SupplierChartFilter } from "./SupplierChartFilter";
import { SupplierComparisonCards } from "./SupplierComparisonCards";

interface StockHistoryChartProps {
  productId: string;
  productName?: string;
}

export function StockHistoryChart({ productId, productName }: StockHistoryChartProps) {
  const [period, setPeriod] = useState<string>('30');
  const [showCost, setShowCost] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const days = Number(period);

  const {
    data: summaries,
    isLoading: loadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useStockDailySummary(productId, days);
  const {
    data: velocity,
    error: velocityError,
    refetch: refetchVelocity,
  } = useStockVelocity(productId);
  const {
    data: intelligence,
    error: intelligenceError,
    refetch: refetchIntelligence,
  } = useProductIntelligenceData(productId);

  const hasData = !!summaries?.length;
  const hasError = !!(summaryError || velocityError || intelligenceError);
  const isDemo = !hasData && !hasError;

  // ---------- Mock data ----------
  const mockVelocities = useMemo(() => generateMockVelocities(productId), [productId]);
  const mockVelocity = mockVelocities[0];
  const mockIntel = useMemo(() => generateMockIntelligence(productId), [productId]);
  const mockSupplierNames = useMemo(() => generateMockSupplierNames(productId), [productId]);

  // ---------- Supplier names ----------
  const supplierIds = useMemo(
    () => hasData ? extractUniqueSupplierIds(summaries!) : (isDemo ? mockVelocities.map(v => v.supplier_id) : []),
    [summaries, hasData, isDemo, mockVelocities]
  );
  const { data: realSupplierNamesMap } = useSupplierNames(hasData ? supplierIds : []);
  const supplierNamesMap = hasData ? realSupplierNamesMap : (isDemo ? mockSupplierNames : undefined);

  const supplierOptions = useMemo(() => {
    if (supplierIds.length <= 1) return [];
    return supplierIds.map(id => ({
      id,
      name: supplierNamesMap?.get(id) ?? `Fornecedor ${id.slice(0, 6)}`,
    }));
  }, [supplierIds, supplierNamesMap]);

  // ---------- Chart data ----------
  const mockChartData = useMemo(
    () => generateMockStockData(productId, days),
    [days, productId]
  );

  const chartData = useMemo(() => {
    if (!hasData) return mockChartData;
    const supplierId = selectedSupplier === 'all' ? undefined : selectedSupplier;
    const aggregated = aggregateDailySummaryByDate(summaries!, supplierId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return aggregated
      .filter(d => new Date(d.date) >= cutoff)
      .reduce<Array<{ date: string; stockClose: number; depleted: number; restocked: number; restockDetected: boolean; costPriceClose: number | null; dateFormatted: string; fullDate: string }>>((acc, d) => {
        const parsed = safeParseDateForChart(d.date);
        if (parsed) acc.push({ ...d, ...parsed });
        return acc;
      }, []);
  }, [summaries, days, hasData, mockChartData, selectedSupplier]);

  // ---------- Effective data ----------
  const effectiveIntelligence = intelligence ?? (isDemo ? mockIntel : null);
  const effectiveVelocities = velocity?.length ? velocity : (isDemo ? mockVelocities : []);

  // When a specific supplier is selected, use that supplier's velocity
  const bestVelocity = useMemo(() => {
    if (effectiveVelocities.length) {
      if (selectedSupplier !== 'all') {
        const match = effectiveVelocities.find(v => v.supplier_id === selectedSupplier);
        if (match) return match;
      }
      return effectiveVelocities.reduce((best, v) =>
        (v.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0)) ? v : best, effectiveVelocities[0]);
    }
    return null;
  }, [effectiveVelocities, selectedSupplier]);

  const flags = useMemo(() => {
    if (!effectiveIntelligence) return [];
    if (isRealIntelligence(effectiveIntelligence)) {
      return getActiveFlags(effectiveIntelligence);
    }
    // For mock data, manually derive flags
    const mock = effectiveIntelligence as MockIntelligenceData;
    const result: IntelligenceFlag[] = [];
    if (mock.is_hot_product) result.push('hot-product');
    if (mock.is_stockout_risk) result.push('stockout-risk');
    if (mock.is_stagnant) result.push('stagnant');
    if (mock.is_negotiation_opportunity) result.push('negotiation-opportunity');
    if (mock.has_frequent_restock) result.push('frequent-restock');
    if (mock.abc_classification === 'A') result.push('class-a');
    return result;
  }, [effectiveIntelligence]);

  // ---------- Derived commercial insights ----------
  const trend = safeVelocityTrend(bestVelocity?.velocity_trend);
  const trendDisplay = formatVelocityTrendCommercial(trend);

  const marketDemandLevel = useMemo(() => {
    if (!bestVelocity) return 'unknown';
    const v = safeNumber(bestVelocity.avg_daily_depletion_7d);
    if (v == null) return 'unknown';
    if (v >= 20) return 'very-high';
    if (v >= 10) return 'high';
    if (v >= 3) return 'moderate';
    return 'low';
  }, [bestVelocity]);

  const demandLabel: Record<string, { text: string; color: string }> = {
    'very-high': { text: 'Muito Alta', color: 'text-destructive' },
    'high': { text: 'Alta', color: 'text-amber-500' },
    'moderate': { text: 'Moderada', color: 'text-primary' },
    'low': { text: 'Baixa', color: 'text-muted-foreground' },
    'unknown': { text: '—', color: 'text-muted-foreground' },
  };

  const supplierText = useMemo(() => {
    if (selectedSupplier !== 'all' && supplierNamesMap) {
      const name = supplierNamesMap.get(selectedSupplier);
      return name ? `em ${name}` : 'fornecedor selecionado';
    }
    const count = effectiveIntelligence?.supplier_count;
    if (count == null || count === 0) return 'no fornecedor';
    return `em ${count} fornecedor${count > 1 ? 'es' : ''}`;
  }, [effectiveIntelligence, selectedSupplier, supplierNamesMap]);

  // #3 fix: safe price_changes extraction via helper
  const priceChanges = safePriceChanges(bestVelocity);

  // ---------- Retry handler ----------
  const handleRetry = () => {
    refetchSummary();
    refetchVelocity();
    refetchIntelligence();
  };

  // ---------- Loading ----------
  if (loadingSummary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8" role="status" aria-label="Carregando dados de mercado">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ---------- Error state ----------
  if (hasError && !hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-medium text-destructive">Não foi possível carregar dados de mercado</p>
          <p className="text-xs text-muted-foreground">Tente novamente em alguns instantes</p>
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5 mt-1">
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const turnoverScore = effectiveIntelligence?.turnover_score;
  const showTurnover = turnoverScore != null && Number.isFinite(turnoverScore);

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
              Como o mercado está comprando este produto · {days} dias
              {isDemo && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">dados ilustrativos</Badge>}
              {hasError && hasData && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30">dados parciais</Badge>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {effectiveIntelligence?.abc_classification && (
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs",
                  effectiveIntelligence.abc_classification === 'A' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' :
                  effectiveIntelligence.abc_classification === 'B' ? 'bg-green-500/15 text-green-500 border-green-500/30' :
                  'bg-muted text-muted-foreground border-border'
                )}
              >
                {effectiveIntelligence.abc_classification === 'A' ? '🔥 Best-Seller' :
                 effectiveIntelligence.abc_classification === 'B' ? '⚡ Popular' :
                 '📦 Normal'}
              </Badge>
            )}
            {trend != null && trend > 1.3 && (
              <Badge
                variant="outline"
                className="font-bold text-xs bg-blue-500/15 text-blue-500 border-blue-500/30"
              >
                🚀 Emergente
              </Badge>
            )}
            {showTurnover && (
              <Badge variant="secondary" className="text-xs font-mono" title="Potencial comercial: quanto maior, mais o mercado compra">
                Potencial: {Math.round(turnoverScore!)}
              </Badge>
            )}
          </div>
        </div>

        {/* Intelligence flags */}
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="Indicadores de mercado">
            {flags.map(flag => {
              const cfg = COMMERCIAL_FLAG_CONFIG[flag];
              const Icon = cfg.icon;
              return (
                <Badge
                  key={flag}
                  variant="outline"
                  className={cn("gap-1 px-2 py-0.5 text-xs border", cfg.colors)}
                  title={cfg.description}
                  role="listitem"
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {cfg.label}
                </Badge>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI cards — uses shared KpiCard (#4 fix) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Métricas de inteligência de mercado">
          <KpiCard
            icon={ShoppingCart}
            label="Vendas no mercado"
            value={safeNumber(bestVelocity?.avg_daily_depletion_7d)?.toFixed(1) ?? '—'}
            sub="un/dia (média 7d)"
            highlight={marketDemandLevel === 'very-high' || marketDemandLevel === 'high'}
            ariaLabel={`Vendas no mercado: ${safeNumber(bestVelocity?.avg_daily_depletion_7d)?.toFixed(1) ?? 'indisponível'} unidades por dia`}
          />
          <KpiCard
            icon={BarChart3}
            label="Demanda"
            value={demandLabel[marketDemandLevel].text}
            sub={trend != null
              ? (trend > 1 ? '↑ crescendo' : trend < 0.8 ? '↓ caindo' : '→ estável')
              : ''}
            highlight={marketDemandLevel === 'very-high'}
            customValueColor={demandLabel[marketDemandLevel].color}
            ariaLabel={`Demanda: ${demandLabel[marketDemandLevel].text}`}
          />
          <KpiCard
            icon={trend != null && trend > 1.2 ? TrendingUp :
                  trend != null && trend < 0.8 ? TrendingDown : BarChart3}
            label="Tendência"
            value={trendDisplay.value}
            sub={trendDisplay.sub}
            highlight={trend != null && trend > 1.3}
            ariaLabel={`Tendência: ${trendDisplay.value} ${trendDisplay.sub}`}
          />
          <KpiCard
            icon={Star}
            label="Disponível"
            value={effectiveIntelligence?.total_current_stock?.toLocaleString('pt-BR') ?? '—'}
            sub={supplierText}
            ariaLabel={`Disponível: ${effectiveIntelligence?.total_current_stock ?? 'indisponível'} unidades ${supplierText}`}
          />
        </div>

        {/* Period selector + supplier filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="h-7 flex-wrap">
              {['15','30','60','90','120','180','360'].map(p => (
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
        <div className="h-[160px] sm:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="dateFormatted" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
              <YAxis yAxisId="stock" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={50} />
              <YAxis yAxisId="flow" orientation="right" hide />
              <Tooltip content={({ active, payload }: any) => (
                <MarketTooltip active={active} payload={payload} showCost={showCost} />
              )} />
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

        {/* Supplier comparison cards */}
        {effectiveVelocities.length > 1 && supplierNamesMap && (
          <SupplierComparisonCards
            velocities={effectiveVelocities as any}
            supplierNames={supplierNamesMap}
          />
        )}

        {/* Price change insight + cost toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {priceChanges > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" aria-hidden="true" />
              <span>
                Fornecedor alterou preço {priceChanges}x nos últimos 30 dias —
                <span className="text-foreground font-medium"> trave seu custo ao cotar</span>
                {isDemo && ' (demo)'}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] gap-1 px-2 text-muted-foreground"
            onClick={() => setShowCost(!showCost)}
            title={showCost ? 'Ocultar custo base no tooltip' : 'Mostrar custo base no tooltip'}
          >
            {showCost ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showCost ? 'Ocultar custo' : 'Ver custo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Sub-components ----------

// #6 fix: MarketTooltip shows fallback when zero-activity day
function MarketTooltip({ active, payload, showCost }: { active?: boolean; payload?: any; showCost: boolean }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const depleted = safeNumber(data.depleted);
  const restocked = safeNumber(data.restocked);
  const hasActivity = (depleted != null && depleted > 0) || (restocked != null && restocked > 0);

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Disponível:</span>
          <span className="font-semibold">{data.stockClose?.toLocaleString('pt-BR') ?? '—'} un</span>
        </div>
        {!hasActivity && (
          <p className="text-[10px] text-muted-foreground italic">Sem movimentação neste dia</p>
        )}
        {depleted != null && depleted > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-destructive">Compras do mercado:</span>
            <span className="font-semibold text-destructive">-{depleted}</span>
          </div>
        )}
        {restocked != null && restocked > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-emerald-500">Reposição:</span>
            <span className="font-semibold text-emerald-500">+{restocked}</span>
          </div>
        )}
        {data.restockDetected && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            🔄 Fornecedor reabasteceu
          </Badge>
        )}
        {showCost && data.costPriceClose != null && (
          <div className="flex justify-between text-xs pt-1 border-t border-border">
            <span className="text-muted-foreground">Custo base:</span>
            <span className="font-semibold">{formatCurrency(data.costPriceClose)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
