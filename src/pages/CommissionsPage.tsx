/**
 * CommissionsPage — Painel de comissões do vendedor.
 */
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DollarSign, Clock, CheckCircle, Wallet, TrendingUp, Percent } from "lucide-react";
import { useCommissions } from "@/hooks/useCommissions";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function CommissionsPage() {
  const { entries, rules, summary, isLoading } = useCommissions();
  const { role } = useAuth();

  const defaultRule = rules.find(r => r.is_default);

  return (
    <MainLayout>
      <PageSEO title="Comissões" description="Acompanhe suas comissões de vendas." path="/comissoes" noIndex />

      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-success/20 to-success/10">
              <Wallet className="h-6 w-6 text-success" />
            </div>
            Comissões
          </h1>
          <p className="text-muted-foreground mt-1">
            {defaultRule ? `Regra padrão: ${defaultRule.commission_percent}% sobre vendas` : "Acompanhe seus ganhos por comissão"}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <CommissionKPI
                title="Pendente"
                value={formatCurrency(summary.totalPending)}
                icon={Clock}
                color="text-warning bg-warning/10"
              />
              <CommissionKPI
                title="Aprovada"
                value={formatCurrency(summary.totalApproved)}
                icon={CheckCircle}
                color="text-primary bg-primary/10"
              />
              <CommissionKPI
                title="Paga"
                value={formatCurrency(summary.totalPaid)}
                icon={DollarSign}
                color="text-success bg-success/10"
              />
              <CommissionKPI
                title="Total Geral"
                value={formatCurrency(summary.totalPending + summary.totalApproved + summary.totalPaid)}
                icon={TrendingUp}
                color="text-foreground bg-muted"
              />
            </>
          )}
        </div>

        {/* Current Rule */}
        {defaultRule && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 flex items-center gap-3">
              <Percent className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Comissão padrão: <strong>{defaultRule.commission_percent}%</strong>
                {defaultRule.min_order_value > 0 && ` (pedidos acima de ${formatCurrency(defaultRule.min_order_value)})`}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Entries Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma comissão registrada</p>
                <p className="text-xs mt-1">Comissões serão calculadas automaticamente sobre pedidos fechados</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {entries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {formatCurrency(entry.commission_amount)}
                        </p>
                        <StatusBadge status={entry.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {entry.commission_percent}% sobre {formatCurrency(entry.order_total)}
                        {" · "}
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function CommissionKPI({
  title, value, icon: Icon, color,
}: {
  title: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "Pendente", variant: "outline" },
    approved: { label: "Aprovada", variant: "secondary" },
    paid: { label: "Paga", variant: "default" },
    cancelled: { label: "Cancelada", variant: "destructive" },
  };
  const c = config[status] || config.pending;
  return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>;
}
