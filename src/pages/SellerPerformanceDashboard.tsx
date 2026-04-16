/**
 * SellerPerformanceDashboard — Painel de performance comercial.
 * Exibe KPIs de vendas, conversão, ranking de vendedores e tendências.
 */
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  TrendingUp, DollarSign, FileText, ShoppingCart,
  Target, Trophy, ArrowUpRight, Users, BarChart3,
} from "lucide-react";
import { useSellerPerformance, type SellerMetrics } from "@/hooks/useSellerPerformance";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export default function SellerPerformanceDashboard() {
  const [period, setPeriod] = useState("30");
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "manager";
  const { data, isLoading } = useSellerPerformance(parseInt(period));

  const my = data?.myMetrics;

  return (
    <MainLayout>
      <PageSEO
        title="Performance Comercial"
        description="Acompanhe métricas de vendas, conversão e ranking de vendedores."
        path="/performance"
        noIndex
      />

      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              Performance Comercial
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? "Visão geral de toda a equipe" : "Suas métricas de vendas"}
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main KPIs */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <KPICard
                title="Orçamentos"
                value={my?.totalQuotes || 0}
                icon={FileText}
                color="primary"
                subtitle={`${my?.sentQuotes || 0} enviados`}
              />
              <KPICard
                title="Pedidos"
                value={my?.totalOrders || 0}
                icon={ShoppingCart}
                color="success"
                subtitle={`${my?.approvedQuotes || 0} aprovados`}
              />
              <KPICard
                title="Faturamento"
                value={formatCurrency(my?.totalRevenue || 0)}
                icon={DollarSign}
                color="warning"
                subtitle={`Ticket médio: ${formatCurrency(my?.avgTicket || 0)}`}
              />
              <KPICard
                title="Conversão"
                value={`${my?.conversionRate || 0}%`}
                icon={Target}
                color="info"
                subtitle={`Win rate: ${my?.winRate || 0}%`}
              />
            </>
          )}
        </div>

        {/* Funnel + Ranking */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Quote Funnel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Funil de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : (
                <FunnelChart metrics={my} />
              )}
            </CardContent>
          </Card>

          {/* Ranking (Admin only) or Win Rate Details */}
          {isAdmin && data?.allSellers && data.allSellers.length > 1 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" />
                  Ranking de Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <SellerRanking sellers={data.allSellers} />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-success" />
                  Detalhamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-40 rounded-lg" />
                ) : (
                  <MetricsBreakdown metrics={my} />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// ── Sub-components ──

function KPICard({
  title, value, icon: Icon, color, subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: "primary" | "success" | "warning" | "info";
  subtitle?: string;
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    info: "text-primary/70 bg-primary/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", colorMap[color])}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FunnelChart({ metrics }: { metrics: SellerMetrics | null | undefined }) {
  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  const stages = [
    { label: "Criados", value: metrics.totalQuotes, color: "bg-muted-foreground" },
    { label: "Enviados", value: metrics.sentQuotes, color: "bg-primary" },
    { label: "Aprovados", value: metrics.approvedQuotes, color: "bg-success" },
    { label: "Convertidos", value: metrics.convertedQuotes || metrics.totalOrders, color: "bg-warning" },
  ];

  const max = Math.max(metrics.totalQuotes, 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={stage.label} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{stage.label}</span>
            <span className="text-xs text-muted-foreground font-bold">{stage.value}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", stage.color)}
              initial={{ width: 0 }}
              animate={{ width: `${(stage.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SellerRanking({ sellers }: { sellers: SellerMetrics[] }) {
  const maxRevenue = Math.max(sellers[0]?.totalRevenue || 1, 1);

  return (
    <div className="space-y-2">
      {sellers.slice(0, 8).map((seller, i) => (
        <motion.div
          key={seller.sellerId}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            i === 0 ? "bg-warning/20 text-warning" :
            i === 1 ? "bg-muted text-muted-foreground" :
            i === 2 ? "bg-orange/20 text-orange" :
            "bg-muted/50 text-muted-foreground"
          )}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{seller.sellerName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Progress
                value={(seller.totalRevenue / maxRevenue) * 100}
                className="h-1.5 flex-1"
              />
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatCurrency(seller.totalRevenue)}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {seller.conversionRate}%
          </Badge>
        </motion.div>
      ))}
    </div>
  );
}

function MetricsBreakdown({ metrics }: { metrics: SellerMetrics | null | undefined }) {
  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  const rows = [
    { label: "Orçamentos criados", value: metrics.totalQuotes },
    { label: "Orçamentos enviados", value: metrics.sentQuotes },
    { label: "Aprovados", value: metrics.approvedQuotes },
    { label: "Rejeitados", value: metrics.rejectedQuotes },
    { label: "Pedidos gerados", value: metrics.totalOrders },
    { label: "Faturamento total", value: formatCurrency(metrics.totalRevenue) },
    { label: "Ticket médio", value: formatCurrency(metrics.avgTicket) },
    { label: "Taxa de conversão", value: `${metrics.conversionRate}%` },
    { label: "Win rate", value: `${metrics.winRate}%` },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
          <span className="text-xs text-muted-foreground">{row.label}</span>
          <span className="text-sm font-semibold">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
