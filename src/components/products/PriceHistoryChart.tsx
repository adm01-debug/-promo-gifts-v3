import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, History, Loader2 } from "lucide-react";
import { usePriceHistory } from "@/hooks/usePriceHistory";

interface PriceHistoryChartProps {
  productId: string;
  currentPrice?: number;
  productName?: string;
}

export function PriceHistoryChart({ productId, currentPrice, productName }: PriceHistoryChartProps) {
  const { history, isLoading } = usePriceHistory(productId);

  const chartData = useMemo(() => {
    return history.map((entry) => {
      const dateStr = entry.changed_at || '';
      const dateObj = dateStr ? new Date(dateStr) : new Date();
      const oldPrice = entry.old_price;
      const changePercent = oldPrice && oldPrice > 0
        ? ((entry.new_price - oldPrice) / oldPrice) * 100
        : null;
      return {
        date: format(dateObj, "dd/MM/yy", { locale: ptBR }),
        fullDate: format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
        price: entry.new_price,
        oldPrice,
        changePercent,
        source: entry.source,
      };
    });
  }, [history]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const prices = history.map((h) => h.new_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const first = prices[0];
    const last = prices[prices.length - 1];
    const totalChange = first > 0 ? ((last - first) / first) * 100 : 0;
    return { min, max, avg, totalChange };
  }, [history]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Preços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum registro de alteração de preço encontrado para este produto.
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground">{data.fullDate}</p>
        <p className="text-sm font-semibold text-foreground mt-1">
          {formatCurrency(data.price)}
        </p>
        {data.changePercent !== null && (
          <p className={`text-xs mt-1 ${data.changePercent > 0 ? "text-destructive" : data.changePercent < 0 ? "text-green-500" : "text-muted-foreground"}`}>
            {data.changePercent > 0 ? "+" : ""}
            {data.changePercent}%
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1 capitalize">
          Fonte: {data.source === "sync" ? "Sincronização" : data.source === "manual" ? "Manual" : data.source}
        </p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Preços
            </CardTitle>
            <CardDescription className="mt-1">
              {history.length} registro{history.length !== 1 ? "s" : ""} de alteração
            </CardDescription>
          </div>
          {stats && (
            <Badge
              variant={stats.totalChange > 0 ? "destructive" : stats.totalChange < 0 ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {stats.totalChange > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : stats.totalChange < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {stats.totalChange > 0 ? "+" : ""}
              {stats.totalChange.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Mínimo</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(stats.min)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Média</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(stats.avg)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Máximo</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(stats.max)}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tickFormatter={(v) => `R$${v}`}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                width={65}
              />
              <Tooltip content={<CustomTooltip />} />
              {currentPrice && (
                <ReferenceLine
                  y={currentPrice}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  label={{ value: "Atual", position: "right", fontSize: 10 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
