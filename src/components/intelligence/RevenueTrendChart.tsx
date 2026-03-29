import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueTrend } from "@/hooks/useCommercialIntelligence";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart } from "recharts";
import { TrendingUp } from "lucide-react";

export function RevenueTrendChart({ days = 30, categoryId, supplierId }: { days?: number; categoryId?: string | null; supplierId?: string | null }) {
  const { data: trendData, isLoading } = useRevenueTrend(days, categoryId, supplierId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-64 rounded-xl" /></CardContent>
      </Card>
    );
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

  const formatDate = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            📈 Tendência de Receita
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!trendData?.length ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            Sem dados para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-[10px]"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval={days <= 7 ? 0 : days <= 30 ? 4 : 13}
              />
              <YAxis
                yAxisId="revenue"
                tickFormatter={formatCurrency}
                className="text-[10px]"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={60}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                className="text-[10px]"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={formatDate}
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return [formatCurrency(value), 'Receita'];
                  if (name === 'orders') return [value, 'Pedidos'];
                  if (name === 'quotes') return [value, 'Orçamentos'];
                  return [value, name];
                }}
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
              <Bar yAxisId="count" dataKey="orders" fill="hsl(var(--chart-2))" opacity={0.7} barSize={6} radius={[2, 2, 0, 0]} />
              <Bar yAxisId="count" dataKey="quotes" fill="hsl(var(--chart-4))" opacity={0.5} barSize={6} radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
