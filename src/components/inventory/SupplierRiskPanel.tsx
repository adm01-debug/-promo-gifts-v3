/**
 * SupplierRiskPanel — Painel de risco de ruptura e inteligência de fornecedor.
 * Versão operacional do StockHistoryChart, focada em gestão de estoque
 * (vs. a versão comercial na página de produto que foca em inteligência competitiva).
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
  Activity,
  Loader2,
  Package,
  Clock,
  BarChart3,
  Search,
  PackageX,
  ShieldAlert,
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

// ---------- Single Product Detail ----------

interface ProductRiskDetailProps {
  productId: string;
  productName?: string;
}

function ProductRiskDetail({ productId, productName }: ProductRiskDetailProps) {
  const [period, setPeriod] = useState<string>('30');
  const days = Number(period);

  const { data: summaries, isLoading } = useStockDailySummary(productId, days);
  const { data: velocity } = useStockVelocity(productId);
  const { data: intelligence } = useProductIntelligenceData(productId);

  const hasData = !!summaries?.length;
  const isDemo = !hasData;

  // Mock data
  const mockChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    let stock = 850 + Math.floor(Math.random() * 200);
    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const depleted = Math.floor(Math.random() * 25) + 3;
      const isRestock = Math.random() < 0.08;
      const restocked = isRestock ? Math.floor(Math.random() * 200) + 100 : 0;
      stock = Math.max(50, stock - depleted + restocked);
      data.push({
        date: format(d, 'yyyy-MM-dd'),
        stockClose: stock,
        depleted,
        restocked,
        restockDetected: isRestock,
        costPriceClose: 4.5 + Math.random() * 0.3,
        dateFormatted: format(d, "dd/MM", { locale: ptBR }),
        fullDate: format(d, "dd/MM/yyyy", { locale: ptBR }),
      });
    }
    return data;
  }, [days]);

  const mockVelocity = useMemo(() => ({
    avg_daily_depletion_7d: 14.3,
    avg_daily_depletion_30d: 11.8,
    days_to_stockout: 12,
    velocity_trend: 1.21,
    price_changes_30d: 2,
    current_stock: 680,
  }), []);

  const mockIntelligence = useMemo(() => ({
    total_current_stock: 680,
    abc_classification: 'A' as const,
    turnover_score: 78,
    is_hot_product: true,
    is_stockout_risk: true,
    is_stagnant: false,
    is_negotiation_opportunity: false,
    has_frequent_restock: true,
    product_id: productId,
    supplier_count: 2,
    total_depleted_7d: 100,
    total_depleted_30d: 354,
    total_depleted_90d: 980,
    total_restocked_30d: 400,
    avg_velocity_7d: 14.3,
    avg_velocity_30d: 11.8,
    max_velocity_trend: 1.21,
    min_days_to_stockout: 12,
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

  const effectiveIntelligence = intelligence ?? (isDemo ? mockIntelligence : null);
  const bestVelocity = velocity?.length
    ? velocity.reduce((best, v) =>
        (v.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0)) ? v : best, velocity[0])
    : (isDemo ? mockVelocity as any : null);
  const flags = useMemo(() => getActiveFlags(effectiveIntelligence as any), [effectiveIntelligence]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const daysToStockout = bestVelocity?.days_to_stockout;
  const isUrgent = daysToStockout != null && daysToStockout < 7;
  const isWarning = daysToStockout != null && daysToStockout < 15;

  return (
    <div className="space-y-3">
      {/* Header com nome e flags */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{productName || productId}</h4>
          {isDemo && <Badge variant="outline" className="text-[10px] px-1.5 py-0">demo</Badge>}
          {effectiveIntelligence?.abc_classification && (
            <Badge
              variant="outline"
              className={cn(
                "font-bold text-[10px]",
                effectiveIntelligence.abc_classification === 'A' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                effectiveIntelligence.abc_classification === 'B' ? 'bg-primary/15 text-primary border-primary/30' :
                'bg-muted text-muted-foreground border-border'
              )}
            >
              Classe {effectiveIntelligence.abc_classification}
            </Badge>
          )}
        </div>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flags.map(flag => {
              const cfg = FLAG_CONFIG[flag];
              const Icon = cfg.icon;
              return (
                <Badge
                  key={flag}
                  variant="outline"
                  className={cn("gap-1 px-1.5 py-0 text-[10px] border", cfg.colors)}
                  title={cfg.description}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {cfg.label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* KPIs de risco */}
      <div className="grid grid-cols-4 gap-2">
        <RiskKpi
          icon={TrendingDown}
          label="Saída/dia (7d)"
          value={bestVelocity?.avg_daily_depletion_7d?.toFixed(1) ?? '—'}
          sub="unidades"
        />
        <RiskKpi
          icon={Clock}
          label="Dias até acabar"
          value={daysToStockout != null ? String(Math.round(daysToStockout)) : '∞'}
          sub={isUrgent ? 'URGENTE!' : isWarning ? 'atenção' : 'estimativa'}
          alert={isUrgent}
          warning={isWarning && !isUrgent}
        />
        <RiskKpi
          icon={Package}
          label="Estoque atual"
          value={effectiveIntelligence?.total_current_stock?.toLocaleString('pt-BR') ?? '—'}
          sub={`${effectiveIntelligence?.supplier_count ?? '?'} fornecedor(es)`}
        />
        <RiskKpi
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

      {/* Seletor de período + Gráfico */}
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="h-6 flex-wrap">
          {['15','30','60','90'].map(p => (
            <TabsTrigger key={p} value={p} className="text-[10px] px-2 h-4">{p}d</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="dateFormatted" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval="preserveStartEnd" />
            <YAxis yAxisId="stock" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={40} />
            <YAxis yAxisId="flow" orientation="right" hide />
            <Tooltip content={<RiskTooltip />} />
            <Area yAxisId="stock" type="monotone" dataKey="stockClose" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
            <Bar yAxisId="flow" dataKey="depleted" fill="hsl(var(--destructive) / 0.4)" radius={[2, 2, 0, 0]} barSize={3} />
            <Bar yAxisId="flow" dataKey="restocked" fill="hsl(var(--primary) / 0.4)" radius={[2, 2, 0, 0]} barSize={3} />
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

function RiskKpi({ icon: Icon, label, value, sub, alert, warning }: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg p-1.5 text-center",
      alert ? "bg-destructive/10 border border-destructive/20" :
      warning ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50"
    )}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={cn("h-2.5 w-2.5",
          alert ? "text-destructive" :
          warning ? "text-amber-500" : "text-muted-foreground"
        )} />
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
        {data.costPriceClose != null && (
          <div className="flex justify-between text-[10px] pt-1 border-t border-border">
            <span className="text-muted-foreground">Custo:</span>
            <span className="font-semibold">{formatCurrency(data.costPriceClose)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Mock products for demo ----------

const MOCK_RISK_PRODUCTS = [
  { id: 'risk-1', name: 'Caneta Metal Premium', daysToStockout: 5, severity: 'critical' as const },
  { id: 'risk-2', name: 'Squeeze Térmico 500ml', daysToStockout: 11, severity: 'warning' as const },
  { id: 'risk-3', name: 'Caderno Capa Dura A5', daysToStockout: 28, severity: 'ok' as const },
  { id: 'risk-4', name: 'Mochila Executiva', daysToStockout: 3, severity: 'critical' as const },
  { id: 'risk-5', name: 'Kit Escritório Bamboo', daysToStockout: 45, severity: 'ok' as const },
];

// ---------- Main Panel ----------

export function SupplierRiskPanel() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(MOCK_RISK_PRODUCTS[0].id);
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!search) return MOCK_RISK_PRODUCTS;
    return MOCK_RISK_PRODUCTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const selected = MOCK_RISK_PRODUCTS.find(p => p.id === selectedProduct);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Risco de Ruptura no Fornecedor
        </CardTitle>
        <CardDescription>
          Monitore produtos com risco de acabar no fornecedor — antecipe compras e evite perder vendas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Lista de produtos com risco */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs transition-colors",
                      selectedProduct === product.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate flex-1">{product.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0 ml-2 shrink-0",
                          product.severity === 'critical' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                          product.severity === 'warning' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                          'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {product.severity === 'critical' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                        {product.daysToStockout}d
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Resumo de riscos */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border">
              <div className="text-center p-1.5 rounded bg-destructive/10">
                <p className="text-lg font-bold text-destructive">
                  {MOCK_RISK_PRODUCTS.filter(p => p.severity === 'critical').length}
                </p>
                <p className="text-[9px] text-destructive">Críticos</p>
              </div>
              <div className="text-center p-1.5 rounded bg-amber-500/10">
                <p className="text-lg font-bold text-amber-600">
                  {MOCK_RISK_PRODUCTS.filter(p => p.severity === 'warning').length}
                </p>
                <p className="text-[9px] text-amber-600">Atenção</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/50">
                <p className="text-lg font-bold text-foreground">
                  {MOCK_RISK_PRODUCTS.filter(p => p.severity === 'ok').length}
                </p>
                <p className="text-[9px] text-muted-foreground">OK</p>
              </div>
            </div>
          </div>

          {/* Detalhe do produto selecionado */}
          <div className="border-l border-border pl-4">
            {selected ? (
              <ProductRiskDetail
                productId={selected.id}
                productName={selected.name}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Selecione um produto para ver os detalhes de risco
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
