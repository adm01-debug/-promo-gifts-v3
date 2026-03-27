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
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ShoppingCart,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Loader2,
  BarChart3,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useSalesHistory, type DailySalesPoint, type SalesKpis, type SellerRanking } from "@/hooks/useSalesHistory";

interface SalesHistoryChartProps {
  productId: string;
  productName?: string;
}

// ---------- Mock Data (preview) ----------

const MOCK_PRODUCT_ID = '5b59c8ca-b653-4584-9afe-fbc9b3d15afe';

function generateMockSalesData(days: number) {
  const daily: any[] = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = format(date, 'yyyy-MM-dd');

    // Not every day has sales
    const hasQuotes = Math.random() > 0.35;
    const hasOrders = Math.random() > 0.55;

    daily.push({
      date: dateStr,
      quotedQty: hasQuotes ? Math.floor(Math.random() * 120) + 20 : 0,
      orderedQty: hasOrders ? Math.floor(Math.random() * 80) + 10 : 0,
      quotedValue: hasQuotes ? Math.floor(Math.random() * 3500) + 500 : 0,
      orderedValue: hasOrders ? Math.floor(Math.random() * 2800) + 400 : 0,
      quoteCount: hasQuotes ? Math.floor(Math.random() * 3) + 1 : 0,
      orderCount: hasOrders ? Math.floor(Math.random() * 2) + 1 : 0,
      dateFormatted: format(date, "dd/MM", { locale: ptBR }),
      fullDate: format(date, "dd/MM/yyyy", { locale: ptBR }),
    });
  }
  return daily;
}

function getMockKpis(): SalesKpis {
  return {
    totalQuotedQty: 2840,
    totalOrderedQty: 1620,
    totalQuotedValue: 42600,
    totalOrderedValue: 28350,
    conversionRate: 38.5,
    uniqueSellers: 4,
    avgOrderValue: 1890,
    topSellers: [
      { sellerId: 's1', sellerName: 'Ana Silva', totalQty: 680, totalValue: 12200, quoteCount: 15, orderCount: 8 },
      { sellerId: 's2', sellerName: 'Carlos Mendes', totalQty: 520, totalValue: 9800, quoteCount: 12, orderCount: 5 },
      { sellerId: 's3', sellerName: 'Julia Santos', totalQty: 340, totalValue: 5100, quoteCount: 8, orderCount: 3 },
      { sellerId: 's4', sellerName: 'Pedro Lima', totalQty: 80, totalValue: 1250, quoteCount: 3, orderCount: 1 },
    ],
  };
}

// ---------- Main Component ----------

export function SalesHistoryChart({ productId, productName }: SalesHistoryChartProps) {
  const [period, setPeriod] = useState<string>('30');
  const days = Number(period);

  const isMockProduct = productId === MOCK_PRODUCT_ID;

  const { data, isLoading } = useSalesHistory(
    isMockProduct ? undefined : productId, days
  );

  const effectiveKpis = isMockProduct ? getMockKpis() : data?.kpis;

  const chartData = useMemo(() => {
    if (isMockProduct) return generateMockSalesData(days);
    if (!data?.daily?.length) return [];
    return data.daily.map(d => ({
      ...d,
      dateFormatted: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
      fullDate: format(parseISO(d.date), "dd/MM/yyyy", { locale: ptBR }),
    }));
  }, [data, days, isMockProduct]);

  // Loading
  if (!isMockProduct && isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No data
  if (!isMockProduct && !chartData.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Vendas Internas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum orçamento ou pedido registrado para este produto no período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const kpis = effectiveKpis!;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Vendas Internas
            </CardTitle>
            <CardDescription className="mt-1">
              Orçamentos vs Pedidos · {days} dias
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {kpis.conversionRate > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs",
                  kpis.conversionRate >= 40 ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                  kpis.conversionRate >= 20 ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                  'bg-destructive/15 text-destructive border-destructive/30'
                )}
              >
                <Target className="h-3 w-3 mr-1" />
                {kpis.conversionRate.toFixed(1)}% conversão
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiCard
            icon={FileText}
            label="Orçado (qtd)"
            value={kpis.totalQuotedQty.toLocaleString('pt-BR')}
            sub={`${formatCurrency(kpis.totalQuotedValue)}`}
          />
          <KpiCard
            icon={ShoppingCart}
            label="Vendido (qtd)"
            value={kpis.totalOrderedQty.toLocaleString('pt-BR')}
            sub={`${formatCurrency(kpis.totalOrderedValue)}`}
            highlight
          />
          <KpiCard
            icon={DollarSign}
            label="Ticket médio"
            value={formatCurrency(kpis.avgOrderValue)}
            sub="por pedido"
          />
          <KpiCard
            icon={Users}
            label="Vendedores"
            value={String(kpis.uniqueSellers)}
            sub="ativos"
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
                yAxisId="qty"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                width={45}
              />
              <YAxis
                yAxisId="value"
                orientation="right"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                width={35}
                hide
              />
              <Tooltip content={<SalesTooltip />} />
              <Bar
                yAxisId="qty"
                dataKey="quotedQty"
                fill="hsl(var(--primary) / 0.25)"
                name="Qtd Orçada"
                radius={[2, 2, 0, 0]}
                barSize={6}
              />
              <Bar
                yAxisId="qty"
                dataKey="orderedQty"
                fill="hsl(var(--primary))"
                name="Qtd Vendida"
                radius={[2, 2, 0, 0]}
                barSize={6}
              />
              <Area
                yAxisId="value"
                type="monotone"
                dataKey="orderedValue"
                stroke="hsl(142 71% 45%)"
                fill="hsl(142 71% 45% / 0.1)"
                strokeWidth={1.5}
                name="Faturamento"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Top sellers */}
        {kpis.topSellers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Crown className="h-3 w-3" /> Top Vendedores
            </p>
            <div className="space-y-1">
              {kpis.topSellers.map((seller, i) => (
                <SellerRow key={seller.sellerId} seller={seller} rank={i + 1} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Sub-components ----------

function KpiCard({ icon: Icon, label, value, sub, highlight, alert }: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg p-2 text-center",
      alert ? "bg-destructive/10 border border-destructive/20" :
      highlight ? "bg-primary/10 border border-primary/20" :
      "bg-muted/50"
    )}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={cn("h-3 w-3", highlight ? "text-primary" : "text-muted-foreground")} />
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
      <p className={cn(
        "text-sm font-bold",
        highlight ? "text-primary" : "text-foreground"
      )}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function SellerRow({ seller, rank }: { seller: SellerRanking; rank: number }) {
  const initials = seller.sellerName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 text-xs p-1.5 rounded-md hover:bg-muted/50 transition-colors">
      <span className={cn(
        "w-4 text-center font-bold",
        rank === 1 ? "text-amber-500" : "text-muted-foreground"
      )}>
        {rank}
      </span>
      <Avatar className="h-5 w-5">
        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-foreground flex-1 truncate">{seller.sellerName}</span>
      <span className="text-muted-foreground">{seller.totalQty} un</span>
      <span className="font-semibold text-foreground">{formatCurrency(seller.totalValue)}</span>
      <div className="flex gap-1">
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
          {seller.quoteCount} orç
        </Badge>
        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
          {seller.orderCount} ped
        </Badge>
      </div>
    </div>
  );
}

function SalesTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-2 space-y-1.5">
        {data.quotedQty > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Orçado:</span>
            <span className="font-semibold">{data.quotedQty} un · {formatCurrency(data.quotedValue)}</span>
          </div>
        )}
        {data.orderedQty > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-primary">Vendido:</span>
            <span className="font-semibold text-primary">{data.orderedQty} un · {formatCurrency(data.orderedValue)}</span>
          </div>
        )}
        {data.quoteCount > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Orçamentos:</span>
            <span>{data.quoteCount}</span>
          </div>
        )}
        {data.orderCount > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pedidos:</span>
            <span>{data.orderCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
