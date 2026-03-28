/**
 * SupplierRiskPanel — Painel de risco de ruptura e inteligência de fornecedor.
 * Versão operacional: gestão de estoque, rupturas, estagnação, reposição.
 * 
 * Melhorias v2:
 * - Conectado a dados REAIS via props (ProductStockSummary[])
 * - Mock determinístico (seeded random)
 * - Erro explícito no detalhe
 * - Resumo reflete filtros aplicados
 * - Busca com debounce
 * - Filtro por severidade
 * - NaN/Infinity handling
 * - Ações contextuais (link para produto)
 * - Responsivo (border adaptativo)
 * - Acessibilidade (aria-labels)
 * - Timestamp de última atualização
 */
import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Flame,
  AlertTriangle,
  Moon,
  DollarSign,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  Loader2,
  Package,
  Clock,
  BarChart3,
  Search,
  ShieldAlert,
  ExternalLink,
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
} from "@/hooks/useStockHistory";
import { formatCurrency } from "@/lib/format";
import { ProductStockSummary, StockStatus } from "@/types/stock";

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

// ---------- Risk types ----------

type RiskSeverity = 'critical' | 'warning' | 'ok';

interface RiskProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  severity: RiskSeverity;
  status: StockStatus;
  variantsCritical: number;
  variantsOutOfStock: number;
  totalVariants: number;
}

const SEVERITY_ORDER: Record<RiskSeverity, number> = { critical: 0, warning: 1, ok: 2 };

function deriveSeverity(p: ProductStockSummary): RiskSeverity {
  if (p.overallStatus === 'out_of_stock' || p.overallStatus === 'critical') return 'critical';
  if (p.overallStatus === 'low_stock') return 'warning';
  if (p.variantsOutOfStock > 0 || p.variantsCritical > 0) return 'warning';
  return 'ok';
}

// ---------- Flag config — foco em RISCO / OPERACIONAL ----------

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
    description: 'Vendendo rápido no fornecedor — pode acabar em breve',
  },
  'stockout-risk': {
    icon: AlertTriangle,
    label: 'Risco de Ruptura',
    colors: 'bg-destructive/15 text-destructive border-destructive/30',
    description: 'Menos de 7 dias de estoque restante no fornecedor',
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
    description: 'Estoque encalhado no fornecedor — bom momento para pedir desconto',
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
    description: 'Top 20% em giro de estoque no fornecedor',
  },
};

// ---------- Safe velocity helpers ----------

function safeVelocityTrend(trend: number | null | undefined): number | null {
  if (trend == null || !Number.isFinite(trend)) return null;
  return trend;
}

function formatVelocityTrend(trend: number | null): { value: string; label: string } {
  if (trend == null) return { value: '—', label: '' };
  const pct = ((trend - 1) * 100);
  if (!Number.isFinite(pct)) return { value: '—', label: '' };
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
    label: trend > 1.5 ? 'acelerando!' : trend > 1 ? 'crescendo' : trend > 0.5 ? 'desacelerando' : 'caindo',
  };
}

// ---------- Single Product Detail ----------

interface ProductRiskDetailProps {
  productId: string;
  productName?: string;
  productSku?: string;
}

function ProductRiskDetail({ productId, productName, productSku }: ProductRiskDetailProps) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>('30');
  const days = Number(period);

  const { data: summaries, isLoading, error: summaryError } = useStockDailySummary(productId, days);
  const { data: velocity, error: velocityError } = useStockVelocity(productId);
  const { data: intelligence, error: intelligenceError } = useProductIntelligenceData(productId);

  const hasData = !!summaries?.length;
  const hasError = !!(summaryError || velocityError || intelligenceError);

  // Deterministic mock data
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

  const mockVelocity = useMemo(() => ({
    avg_daily_depletion_7d: 14.3,
    avg_daily_depletion_30d: 11.8,
    days_to_stockout: 12,
    velocity_trend: 1.21,
    price_changes_30d: 2,
    current_stock: 680,
  }), []);

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

  const effectiveIntelligence = intelligence ?? null;
  const bestVelocity = velocity?.length
    ? velocity.reduce((best, v) =>
        (v.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0)) ? v : best, velocity[0])
    : (!hasData ? mockVelocity : null);
  const flags = useMemo(() => getActiveFlags(effectiveIntelligence), [effectiveIntelligence]);

  const isDemo = !hasData && !hasError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-label="Carregando detalhes do produto">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">Erro ao carregar dados</p>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          Não foi possível buscar o histórico deste produto. Tente novamente em alguns instantes.
        </p>
      </div>
    );
  }

  const daysToStockout = bestVelocity?.days_to_stockout;
  const isUrgent = daysToStockout != null && Number.isFinite(daysToStockout) && daysToStockout < 7;
  const isWarning = daysToStockout != null && Number.isFinite(daysToStockout) && daysToStockout < 15;
  const trend = safeVelocityTrend(bestVelocity?.velocity_trend);
  const trendDisplay = formatVelocityTrend(trend);

  return (
    <div className="space-y-3">
      {/* Header com nome e flags */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="font-semibold text-sm truncate">{productName || productId}</h4>
          {isDemo && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">demo</Badge>}
          {hasError && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-destructive/10 text-destructive border-destructive/30">parcial</Badge>}
          {effectiveIntelligence?.abc_classification && (
            <Badge
              variant="outline"
              className={cn(
                "font-bold text-[10px] shrink-0",
                effectiveIntelligence.abc_classification === 'A' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                effectiveIntelligence.abc_classification === 'B' ? 'bg-primary/15 text-primary border-primary/30' :
                'bg-muted text-muted-foreground border-border'
              )}
            >
              Classe {effectiveIntelligence.abc_classification}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2 shrink-0"
          onClick={() => navigate(`/catalogo/${productId}`)}
        >
          <ExternalLink className="h-3 w-3" />
          Ver produto
        </Button>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1" role="list" aria-label="Indicadores de risco">
          {flags.map(flag => {
            const cfg = FLAG_CONFIG[flag];
            const Icon = cfg.icon;
            return (
              <Badge
                key={flag}
                variant="outline"
                className={cn("gap-1 px-1.5 py-0 text-[10px] border", cfg.colors)}
                title={cfg.description}
                role="listitem"
              >
                <Icon className="h-2.5 w-2.5" />
                {cfg.label}
              </Badge>
            );
          })}
        </div>
      )}

      {/* KPIs de risco */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Métricas de risco do produto">
        <RiskKpi
          icon={TrendingDown}
          label="Saída/dia (7d)"
          value={bestVelocity?.avg_daily_depletion_7d != null && Number.isFinite(bestVelocity.avg_daily_depletion_7d)
            ? bestVelocity.avg_daily_depletion_7d.toFixed(1) : '—'}
          sub="unidades"
          ariaLabel={`Saída diária: ${bestVelocity?.avg_daily_depletion_7d?.toFixed(1) ?? 'indisponível'} unidades`}
        />
        <RiskKpi
          icon={Clock}
          label="Dias até acabar"
          value={daysToStockout != null && Number.isFinite(daysToStockout) ? String(Math.round(daysToStockout)) : '∞'}
          sub={isUrgent ? 'URGENTE!' : isWarning ? 'atenção' : 'estimativa'}
          alert={isUrgent}
          warning={isWarning && !isUrgent}
          ariaLabel={`Dias até acabar: ${daysToStockout != null ? Math.round(daysToStockout) : 'indefinido'}${isUrgent ? ', urgente' : ''}`}
        />
        <RiskKpi
          icon={Package}
          label="Estoque atual"
          value={effectiveIntelligence?.total_current_stock?.toLocaleString('pt-BR') ?? bestVelocity?.current_stock?.toLocaleString('pt-BR') ?? '—'}
          sub={effectiveIntelligence?.supplier_count
            ? `${effectiveIntelligence.supplier_count} fornecedor${effectiveIntelligence.supplier_count > 1 ? 'es' : ''}`
            : 'no fornecedor'}
          ariaLabel={`Estoque atual: ${effectiveIntelligence?.total_current_stock ?? 'indisponível'}`}
        />
        <RiskKpi
          icon={trend != null && trend > 1.2 ? TrendingUp :
                trend != null && trend < 0.8 ? TrendingDown : BarChart3}
          label="Tendência"
          value={trendDisplay.value}
          sub={trendDisplay.label}
          ariaLabel={`Tendência: ${trendDisplay.value} ${trendDisplay.label}`}
        />
      </div>

      {/* Seletor de período + Gráfico */}
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="h-6 flex-wrap">
          {['15','30','60','90','120','180'].map(p => (
            <TabsTrigger key={p} value={p} className="text-[10px] px-2 h-4">{p}d</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="h-[140px] sm:h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="dateFormatted" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval="preserveStartEnd" />
            <YAxis yAxisId="stock" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={40} />
            <YAxis yAxisId="flow" orientation="right" hide />
            <Tooltip content={<RiskTooltip />} />
            <Area yAxisId="stock" type="monotone" dataKey="stockClose" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={1.5} name="Estoque" dot={false} activeDot={{ r: 3 }} />
            <Bar yAxisId="flow" dataKey="depleted" fill="hsl(var(--destructive) / 0.4)" name="Saída" radius={[2, 2, 0, 0]} barSize={3} />
            <Bar yAxisId="flow" dataKey="restocked" fill="hsl(var(--primary) / 0.4)" name="Reposição" radius={[2, 2, 0, 0]} barSize={3} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Info de preço */}
      {bestVelocity && bestVelocity.price_changes_30d > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          {bestVelocity.price_changes_30d} alteração(ões) de preço nos últimos 30 dias
        </div>
      )}
    </div>
  );
}

// ---------- KPI + Tooltip ----------

function RiskKpi({ icon: Icon, label, value, sub, alert, warning, ariaLabel }: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
  warning?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-1.5 text-center",
        alert ? "bg-destructive/10 border border-destructive/20" :
        warning ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50"
      )}
      role="status"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={cn("h-2.5 w-2.5",
          alert ? "text-destructive" :
          warning ? "text-amber-500" : "text-muted-foreground"
        )} aria-hidden="true" />
        <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
      </div>
      <p className={cn(
        "text-xs font-bold",
        alert ? "text-destructive" :
        warning ? "text-amber-600" : "text-foreground"
      )}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function RiskTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg min-w-[150px]">
      <p className="text-[10px] font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-1.5 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Estoque:</span>
          <span className="font-semibold">{data.stockClose?.toLocaleString('pt-BR')}</span>
        </div>
        {data.depleted > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-destructive">Saída:</span>
            <span className="font-semibold text-destructive">-{data.depleted}</span>
          </div>
        )}
        {data.restocked > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-primary">Reposição:</span>
            <span className="font-semibold text-primary">+{data.restocked}</span>
          </div>
        )}
        {data.restockDetected && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
            🔄 Reabastecimento
          </Badge>
        )}
      </div>
    </div>
  );
}

// ---------- Main Panel ----------

interface SupplierRiskPanelProps {
  products: ProductStockSummary[];
}

export function SupplierRiskPanel({ products }: SupplierRiskPanelProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | 'all'>('all');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Derive risk products from real data
  const riskProducts = useMemo<RiskProduct[]>(() => {
    return products
      .map(p => ({
        id: p.productId,
        name: p.productName,
        sku: p.productSku,
        currentStock: p.totalCurrentStock,
        minStock: p.totalMinStock,
        severity: deriveSeverity(p),
        status: p.overallStatus,
        variantsCritical: p.variantsCritical,
        variantsOutOfStock: p.variantsOutOfStock,
        totalVariants: p.totalVariants,
      }))
      .sort((a, b) => {
        const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.currentStock - b.currentStock; // menor estoque primeiro
      });
  }, [products]);

  // Filter
  const filteredProducts = useMemo(() => {
    let result = riskProducts;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (severityFilter !== 'all') {
      result = result.filter(p => p.severity === severityFilter);
    }
    return result;
  }, [riskProducts, debouncedSearch, severityFilter]);

  // Auto-select first product
  useEffect(() => {
    if (!selectedProductId && filteredProducts.length > 0) {
      setSelectedProductId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedProductId]);

  // Counts for summary — from FILTERED products
  const counts = useMemo(() => ({
    critical: filteredProducts.filter(p => p.severity === 'critical').length,
    warning: filteredProducts.filter(p => p.severity === 'warning').length,
    ok: filteredProducts.filter(p => p.severity === 'ok').length,
    total: filteredProducts.length,
  }), [filteredProducts]);

  // Last updated timestamp
  const lastUpdated = useMemo(() => {
    if (!products.length) return null;
    let latest = '';
    for (const p of products) {
      for (const v of p.variants) {
        if (v.updatedAt && v.updatedAt > latest) latest = v.updatedAt;
      }
    }
    if (!latest) return null;
    try {
      return format(new Date(latest), "dd/MM HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  }, [products]);

  const selected = riskProducts.find(p => p.id === selectedProductId);

  // Empty state
  if (!products.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Risco de Ruptura no Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregue os dados de estoque para visualizar o painel de risco</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
              Risco de Ruptura no Fornecedor
            </CardTitle>
            <CardDescription>
              Monitore produtos com risco de acabar no fornecedor — antecipe compras e evite perder vendas
            </CardDescription>
          </div>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1" aria-label={`Última atualização: ${lastUpdated}`}>
              <Clock className="h-3 w-3" aria-hidden="true" />
              Atualizado: {lastUpdated}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Lista de produtos com risco */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Buscar produto ou SKU..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-8 text-xs"
                aria-label="Buscar produto no painel de risco"
              />
            </div>

            {/* Filtro por severidade */}
            <div className="flex gap-1">
              {([
                { value: 'all' as const, label: 'Todos' },
                { value: 'critical' as const, label: `Críticos (${riskProducts.filter(p => p.severity === 'critical').length})` },
                { value: 'warning' as const, label: `Atenção (${riskProducts.filter(p => p.severity === 'warning').length})` },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSeverityFilter(opt.value)}
                  className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full transition-colors",
                    severityFilter === opt.value
                      ? opt.value === 'critical' ? 'bg-destructive/15 text-destructive'
                        : opt.value === 'warning' ? 'bg-amber-500/15 text-amber-600'
                        : 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                  aria-pressed={severityFilter === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <ScrollArea className="h-[250px] sm:h-[300px]">
              <div className="space-y-1" role="listbox" aria-label="Lista de produtos com risco">
                {filteredProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {debouncedSearch ? 'Nenhum produto encontrado' : 'Nenhum produto nesta categoria'}
                  </p>
                )}
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    role="option"
                    aria-selected={selectedProductId === product.id}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs transition-colors",
                      selectedProductId === product.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{product.name}</span>
                        <span className="text-[9px] text-muted-foreground">{product.sku}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] text-muted-foreground">{product.currentStock} un</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0",
                            product.severity === 'critical' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                            product.severity === 'warning' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                            'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {product.severity === 'critical' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                          {product.severity === 'critical' ? 'Crítico' :
                           product.severity === 'warning' ? 'Atenção' : 'OK'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Resumo de riscos — reflete filtros */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border">
              <div className="text-center p-1.5 rounded bg-destructive/10" role="status" aria-label={`${counts.critical} produtos críticos`}>
                <p className="text-lg font-bold text-destructive">{counts.critical}</p>
                <p className="text-[9px] text-destructive">Críticos</p>
              </div>
              <div className="text-center p-1.5 rounded bg-amber-500/10" role="status" aria-label={`${counts.warning} produtos em atenção`}>
                <p className="text-lg font-bold text-amber-600">{counts.warning}</p>
                <p className="text-[9px] text-amber-600">Atenção</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/50" role="status" aria-label={`${counts.ok} produtos OK`}>
                <p className="text-lg font-bold text-foreground">{counts.ok}</p>
                <p className="text-[9px] text-muted-foreground">OK</p>
              </div>
            </div>
          </div>

          {/* Detalhe do produto selecionado — responsive border */}
          <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-4">
            {selected ? (
              <ProductRiskDetail
                productId={selected.id}
                productName={selected.name}
                productSku={selected.sku}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
                Selecione um produto para ver os detalhes de risco
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
