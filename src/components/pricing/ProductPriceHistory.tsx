import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Calendar, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PriceHistoryEntry {
  date: string;
  price: number;
  reason?: string;
}

interface ProductPriceHistoryProps {
  currentPrice: number;
  priceHistory?: PriceHistoryEntry[];
  productName?: string;
  className?: string;
  compact?: boolean;
}

// Generate mock history if none provided
const generateMockHistory = (currentPrice: number): PriceHistoryEntry[] => {
  const history: PriceHistoryEntry[] = [];
  let price = currentPrice * 0.9; // Start 10% lower

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    // Random price variation
    const variation = (Math.random() - 0.3) * 0.1;
    price = price * (1 + variation);
    
    history.push({
      date: date.toISOString(),
      price: Math.round(price * 100) / 100,
      reason: i === 3 ? "Reajuste fornecedor" : i === 1 ? "Promoção" : undefined,
    });
  }

  // Add current price
  history.push({
    date: new Date().toISOString(),
    price: currentPrice,
    reason: "Preço atual",
  });

  return history;
};

export function ProductPriceHistory({
  currentPrice,
  priceHistory,
  productName,
  className,
  compact = false,
}: ProductPriceHistoryProps) {
  const history = useMemo(() => {
    return priceHistory || generateMockHistory(currentPrice);
  }, [currentPrice, priceHistory]);

  const chartData = useMemo(() => {
    return history.map(entry => ({
      date: format(new Date(entry.date), "MMM/yy", { locale: ptBR }),
      price: entry.price,
      fullDate: format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR }),
      reason: entry.reason,
    }));
  }, [history]);

  const priceChange = useMemo(() => {
    if (history.length < 2) return { value: 0, percentage: 0, trend: "stable" as const };
    
    const oldPrice = history[0].price;
    const newPrice = history[history.length - 1].price;
    const change = newPrice - oldPrice;
    const percentage = (change / oldPrice) * 100;

    return {
      value: change,
      percentage,
      trend: change > 0 ? "up" as const : change < 0 ? "down" as const : "stable" as const,
    };
  }, [history]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const TrendIcon = priceChange.trend === "up" 
    ? TrendingUp 
    : priceChange.trend === "down" 
    ? TrendingDown 
    : Minus;

  const trendColor = priceChange.trend === "up"
    ? "text-red-600"
    : priceChange.trend === "down"
    ? "text-green-600"
    : "text-muted-foreground";

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1 cursor-help", className)}>
              <History className="h-3 w-3 text-muted-foreground" />
              <TrendIcon className={cn("h-3 w-3", trendColor)} />
              <span className={cn("text-xs", trendColor)}>
                {priceChange.percentage >= 0 ? "+" : ""}
                {priceChange.percentage.toFixed(1)}%
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-3 w-64">
            <p className="font-medium mb-2">Histórico de Preços (6 meses)</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs mt-2 text-muted-foreground">
              <span>{chartData[0]?.date}</span>
              <span>{chartData[chartData.length - 1]?.date}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" />
          Histórico de Preços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current price and trend */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm text-muted-foreground">Preço Atual</p>
            <p className="text-2xl font-bold">{formatCurrency(currentPrice)}</p>
          </div>
          <div className="text-right">
            <Badge
              variant="secondary"
              className={cn(
                "gap-1",
                priceChange.trend === "up" && "bg-red-100 text-red-700 dark:bg-red-900/30",
                priceChange.trend === "down" && "bg-green-100 text-green-700 dark:bg-green-900/30"
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {priceChange.percentage >= 0 ? "+" : ""}
              {priceChange.percentage.toFixed(1)}%
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              últimos 6 meses
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${value}`}
                width={50}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg p-2 shadow-lg">
                      <p className="text-xs text-muted-foreground">{data.fullDate}</p>
                      <p className="font-semibold">{formatCurrency(data.price)}</p>
                      {data.reason && (
                        <p className="text-xs text-primary">{data.reason}</p>
                      )}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Min/Max */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 rounded bg-green-50 dark:bg-green-900/20">
            <p className="text-xs text-muted-foreground">Menor preço</p>
            <p className="font-semibold text-green-700 dark:text-green-400">
              {formatCurrency(Math.min(...history.map(h => h.price)))}
            </p>
          </div>
          <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
            <p className="text-xs text-muted-foreground">Maior preço</p>
            <p className="font-semibold text-red-700 dark:text-red-400">
              {formatCurrency(Math.max(...history.map(h => h.price)))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
