import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  DollarSign, TrendingUp, ShoppingCart, Target,
  Clock, BarChart3, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  Legend,
} from "recharts";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  converted: "Convertido",
  expired: "Expirado",
};

const STATUS_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}

export default function FinancialDashboardPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "365d">("30d");
  const { data, isLoading } = useFinancialDashboard(period);

  const periods = [
    { value: "7d" as const, label: "7 dias" },
    { value: "30d" as const, label: "30 dias" },
    { value: "90d" as const, label: "90 dias" },
    { value: "365d" as const, label: "1 ano" },
  ];

  return (
    <MainLayout>
      <PageSEO
        title="Dashboard Financeiro"
        description="Visão completa de receitas, conversões e performance de vendas."
        path="/financeiro"
        noIndex
      />

      <div className="space-y-6 animate-fade-in p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              Dashboard Financeiro
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise de receitas, conversões e performance
            </p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {periods.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p.value)}
                className="text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Receita Total"
              value={formatCurrency(data?.totalRevenue || 0)}
              icon={DollarSign}
              trend={data?.totalRevenue ? "up" : undefined}
              className="border-primary/20"
            />
            <KpiCard
              title="Pedidos"
              value={String(data?.totalOrders || 0)}
              icon={ShoppingCart}
              subtitle={`Ticket médio: ${formatCurrency(data?.averageTicket || 0)}`}
            />
            <KpiCard
              title="Taxa de Conversão"
              value={`${(data?.conversionRate || 0).toFixed(1)}%`}
              icon={Target}
              subtitle={`${data?.approvedQuotes || 0} de ${data?.quotesCount || 0} orçamentos`}
            />
            <KpiCard
              title="Receita Pendente"
              value={formatCurrency(data?.pendingRevenue || 0)}
              icon={Clock}
              subtitle="Orçamentos em aberto"
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Receita Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (data?.monthlyRevenue?.length || 0) > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data!.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthLabel}
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      className="text-xs fill-muted-foreground"
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                      labelFormatter={formatMonthLabel}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados de receita para o período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Orçamentos por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (data?.revenueByStatus?.length || 0) > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data!.revenueByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count }) => `${STATUS_LABELS[status] || status} (${count})`}
                    >
                      {data!.revenueByStatus.map((_, index) => (
                        <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        STATUS_LABELS[name] || name,
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados de orçamentos para o período
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Top 10 Produtos por Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.topProducts?.length || 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Produto</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Qtd</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Receita</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topProducts.map((product, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {i + 1}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-medium max-w-[300px] truncate">
                          {product.name}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {product.quantity.toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {data!.totalRevenue > 0
                            ? `${((product.revenue / data!.totalRevenue) * 100).toFixed(1)}%`
                            : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Sem dados de vendas para o período
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
