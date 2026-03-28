/**
 * StockHistoryChart — Inteligência de Mercado (Página de Produto)
 * Foco COMERCIAL: "como o mercado está comprando este produto"
 * 
 * v2 Melhorias:
 * - Mock determinístico (seeded random baseado em productId)
 * - Erro explícito quando fetch falha
 * - NaN/Infinity handling no velocity_trend
 * - TypeScript safety (sem casts `as any`)
 * - supplier_count = 0 tratado
 * - Acessibilidade (aria-labels nos KPIs)
 * - Chart responsivo (altura adaptativa)
 * - Toggle de custo no tooltip (privacidade)
 */
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Flame,
  Target,
  Zap,
  DollarSign,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  Loader2,
  ShoppingCart,
  BarChart3,
  Trophy,
  Eye,
  EyeOff,
  AlertCircle,
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
  type StockVelocity,
} from "@/hooks/useStockHistory";
import { formatCurrency } from "@/lib/format";

interface StockHistoryChartProps {
  productId: string;
  productName?: string;
}

// ---------- Deterministic random ----------

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ---------- Safe velocity helpers ----------

function safeVelocityTrend(trend: number | null | undefined): number | null {
  if (trend == null || !Number.isFinite(trend)) return null;
  return trend;
}

function formatTrendDisplay(trend: number | null): { value: string; sub: string; isPositive: boolean } {
  if (trend == null) return { value: '—', sub: '', isPositive: false };
  const pct = ((trend - 1) * 100);
  if (!Number.isFinite(pct)) return { value: '—', sub: '', isPositive: false };
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
    sub: trend > 1.5 ? 'acelerando forte!' :
         trend > 1 ? 'demanda crescente' :
         trend > 0.5 ? 'desacelerando' : 'queda de interesse',
    isPositive: trend > 1,
  };
}

// ---------- Flag config — foco em inteligência competitiva ----------

const FLAG_CONFIG: Record<IntelligenceFlag, {
  icon: typeof Flame;
  label: string;
  colors: string;
  description: string;
}> = {
  'hot-product': {
    icon: Flame,
    label: 'Sucesso no Mercado',
    colors: 'bg-destructive/15 text-destructive border-destructive/30',
    description: 'Alta saída no fornecedor — seus concorrentes estão vendendo bastante',
  },
  'stockout-risk': {
    icon: Zap,
    label: 'Esgotando Rápido',
    colors: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    description: 'Demanda do mercado está consumindo o estoque — feche antes que acabe',
  },
  'stagnant': {
    icon: Eye,
    label: 'Baixa Procura',
    colors: 'bg-muted text-muted-foreground border-border',
    description: 'Pouca movimentação no mercado — avalie se vale incluir na oferta',
  },
  'negotiation-opportunity': {
    icon: DollarSign,
    label: 'Negocie Preço',
    colors: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    description: 'Estoque parado no fornecedor — momento ideal para negociar desconto',
  },
  'frequent-restock': {
    icon: RefreshCw,
    label: 'Demanda Confirmada',
    colors: 'bg-primary/15 text-primary border-primary/30',
    description: 'Fornecedor reabastece frequentemente — o mercado compra de forma recorrente',
  },
  'class-a': {
    icon: Trophy,
    label: 'Best-Seller',
    colors: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    description: 'Top 20% em vendas no mercado — produto essencial no portfólio',
  },
};

// ---------- Mock types (properly typed, no `as any`) ----------

interface MockVelocity {
  avg_daily_depletion_7d: number;
  avg_daily_depletion_30d: number;
  days_to_stockout: number | null;
  velocity_trend: number;
  price_changes_30d: number;
  current_stock: number;
}

interface MockIntelligence {
  product_id: string;
  supplier_count: number;
  total_current_stock: number;
  total_depleted_7d: number;
  total_depleted_30d: number;
  total_depleted_90d: number;
  total_restocked_30d: number;
  avg_velocity_7d: number;
  avg_velocity_30d: number;
  max_velocity_trend: number;
  min_days_to_stockout: number | null;
  turnover_score: number;
  abc_classification: 'A' | 'B' | 'C';
  is_hot_product: boolean;
  is_stockout_risk: boolean;
  is_stagnant: boolean;
  is_negotiation_opportunity: boolean;
  has_frequent_restock: boolean;
}

// ---------- Main Component ----------

export function StockHistoryChart({ productId, productName }: StockHistoryChartProps) {
  const [period, setPeriod] = useState<string>('30');
  const [showCost, setShowCost] = useState(false);
  const days = Number(period);

  const { data: summaries, isLoading: loadingSummary, error: summaryError } = useStockDailySummary(productId, days);
  const { data: velocity, error: velocityError } = useStockVelocity(productId);
  const { data: intelligence, error: intelligenceError } = useProductIntelligenceData(productId);

  const hasData = !!summaries?.length;
  const hasError = !!(summaryError || velocityError || intelligenceError);
  const isDemo = !hasData && !hasError;

  // ---------- Deterministic mock data ----------
  const mockChartData = useMemo(() => {
    const baseSeed = hashCode(productId);
    const data = [];
    const now = new Date();
    let stock = 850 + Math.floor(seededRandom(baseSeed) * 200);
    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayIdx = days - i;
      const depleted = Math.floor(seededRandom(baseSeed + dayIdx * 3) * 25) + 3;
      const isRestock = seededRandom(baseSeed + dayIdx * 3 + 1) < 0.08;
      const restocked = isRestock ? Math.floor(seededRandom(baseSeed + dayIdx * 3 + 2) * 200) + 100 : 0;
      stock = Math.max(50, stock - depleted + restocked);
      data.push({
        date: format(d, 'yyyy-MM-dd'),
        stockClose: stock,
        depleted,
        restocked,
        restockDetected: isRestock,
        costPriceClose: 4.5 + seededRandom(baseSeed + dayIdx * 5) * 0.3,
        dateFormatted: format(d, "dd/MM", { locale: ptBR }),
        fullDate: format(d, "dd/MM/yyyy", { locale: ptBR }),
      });
    }
    return data;
  }, [days, productId]);

  const mockVelocity = useMemo<MockVelocity>(() => ({
    avg_daily_depletion_7d: 14.3,
    avg_daily_depletion_30d: 11.8,
    days_to_stockout: 42,
    velocity_trend: 1.21,
    price_changes_30d: 1,
    current_stock: 680,
  }), []);

  const mockIntelligence = useMemo<MockIntelligence>(() => ({
    total_current_stock: 1240,
    abc_classification: 'A',
    turnover_score: 78,
    is_hot_product: true,
    is_stockout_risk: false,
    is_stagnant: false,
    is_negotiation_opportunity: false,
    has_frequent_restock: true,
    product_id: productId,
    supplier_count: 3,
    total_depleted_7d: 100,
    total_depleted_30d: 354,
    total_depleted_90d: 980,
    total_restocked_30d: 400,
    avg_velocity_7d: 14.3,
    avg_velocity_30d: 11.8,
    max_velocity_trend: 1.21,
    min_days_to_stockout: 42,
  }), [productId]);

  const chartData = useMemo(() => {
    if (!hasData) return mockChartData;
    const aggregated = aggregateDailySummaryByDate(summaries!);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return aggregated
      .filter(d => new Date(d.date) >= cutoff)
      .map(d => ({
        ...d,
        dateFormatted: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
        fullDate: format(parseISO(d.date), "dd/MM/yyyy", { locale: ptBR }),
      }));
  }, [summaries, days, hasData, mockChartData]);

  const effectiveIntelligence: ProductIntelligenceData | MockIntelligence | null =
    intelligence ?? (isDemo ? mockIntelligence : null);

  const bestVelocity: (StockVelocity | MockVelocity | null) = velocity?.length
    ? velocity.reduce((best, v) =>
        (v.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0)) ? v : best, velocity[0])
    : (isDemo ? mockVelocity : null);

  const flags = useMemo(() => {
    if (!effectiveIntelligence) return [];
    return getActiveFlags(effectiveIntelligence as ProductIntelligenceData);
  }, [effectiveIntelligence]);

  // ---------- Derived commercial insights (with NaN safety) ----------
  const trend = safeVelocityTrend(bestVelocity?.velocity_trend);
  const trendDisplay = formatTrendDisplay(trend);

  const marketDemandLevel = useMemo(() => {
    if (!bestVelocity) return 'unknown';
    const v = bestVelocity.avg_daily_depletion_7d;
    if (!Number.isFinite(v)) return 'unknown';
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

  // ---------- Supplier count text (handles 0) ----------
  const supplierText = useMemo(() => {
    const count = effectiveIntelligence?.supplier_count;
    if (count == null || count === 0) return 'no fornecedor';
    return `em ${count} fornecedor${count > 1 ? 'es' : ''}`;
  }, [effectiveIntelligence]);

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
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-medium text-destructive">Não foi possível carregar dados de mercado</p>
          <p className="text-xs text-muted-foreground">Tente novamente em alguns instantes</p>
        </CardContent>
      </Card>
    );
  }

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
              Como o mercado está comprando este produto · {chartData.length} dias
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
                  effectiveIntelligence.abc_classification === 'A' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                  effectiveIntelligence.abc_classification === 'B' ? 'bg-primary/15 text-primary border-primary/30' :
                  'bg-muted text-muted-foreground border-border'
                )}
              >
                {effectiveIntelligence.abc_classification === 'A' ? '🏆 Best-Seller' :
                 effectiveIntelligence.abc_classification === 'B' ? '📈 Boa Saída' :
                 '📊 Nicho'}
              </Badge>
            )}
            {effectiveIntelligence?.turnover_score != null && (
              <Badge variant="secondary" className="text-xs font-mono" title="Potencial comercial: quanto maior, mais o mercado compra">
                Potencial: {Math.round(effectiveIntelligence.turnover_score)}
              </Badge>
            )}
          </div>
        </div>

        {/* Intelligence flags */}
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="Indicadores de mercado">
            {flags.map(flag => {
              const cfg = FLAG_CONFIG[flag];
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
        {/* KPI cards — foco comercial */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Métricas de inteligência de mercado">
          <KpiCard
            icon={ShoppingCart}
            label="Vendas no mercado"
            value={bestVelocity?.avg_daily_depletion_7d != null && Number.isFinite(bestVelocity.avg_daily_depletion_7d)
              ? bestVelocity.avg_daily_depletion_7d.toFixed(1) : '—'}
            sub="un/dia (média 7d)"
            highlight={marketDemandLevel === 'very-high' || marketDemandLevel === 'high'}
            ariaLabel={`Vendas no mercado: ${bestVelocity?.avg_daily_depletion_7d?.toFixed(1) ?? 'indisponível'} unidades por dia`}
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

        {/* Period selector */}
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="h-7 flex-wrap">
            {['15','30','60','90','120','150','180','360'].map(p => (
              <TabsTrigger key={p} value={p} className="text-xs px-2 h-5">{p}d</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Chart */}
        <div className="h-[160px] sm:h-[200px] w-full">
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
              <Tooltip content={({ active, payload }: any) => (
                <MarketTooltip active={active} payload={payload} showCost={showCost} />
              )} />
              <Area
                yAxisId="stock"
                type="monotone"
                dataKey="stockClose"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.15)"
                strokeWidth={2}
                name="Disponível"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Bar
                yAxisId="flow"
                dataKey="depleted"
                fill="hsl(var(--destructive) / 0.4)"
                name="Compras do mercado"
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

        {/* Price change insight + cost toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {bestVelocity && 'price_changes_30d' in bestVelocity && bestVelocity.price_changes_30d > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" aria-hidden="true" />
              <span>
                Fornecedor alterou preço {bestVelocity.price_changes_30d}x nos últimos 30 dias —
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
            title={showCost ? "Ocultar custo base no tooltip" : "Mostrar custo base no tooltip"}
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

function KpiCard({ icon: Icon, label, value, sub, highlight, alert, customValueColor, ariaLabel }: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  alert?: boolean;
  customValueColor?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-2 text-center",
        highlight ? "bg-primary/10 border border-primary/20" :
        alert ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"
      )}
      role="status"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={cn("h-3 w-3",
          highlight ? "text-primary" :
          alert ? "text-destructive" : "text-muted-foreground"
        )} aria-hidden="true" />
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
      <p className={cn(
        "text-sm font-bold",
        customValueColor ? customValueColor :
        highlight ? "text-primary" :
        alert ? "text-destructive" : "text-foreground"
      )}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function MarketTooltip({ active, payload, showCost }: { active?: boolean; payload?: any; showCost: boolean }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Disponível:</span>
          <span className="font-semibold">{data.stockClose?.toLocaleString('pt-BR')} un</span>
        </div>
        {data.depleted > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-destructive">Compras do mercado:</span>
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
