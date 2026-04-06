/**
 * Admin AI Usage Dashboard — /admin/consumo-ia
 * Shows consumption stats, charts, per-user breakdown, and quota management.
 */
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Zap, DollarSign, Users, TrendingUp, AlertTriangle,
  Activity, Settings2, Save, BarChart3
} from "lucide-react";
import {
  useAiUsageStats,
  useAiUsageLogs,
  useAiQuotas,
  useUpdateQuota,
} from "@/hooks/useAiUsage";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { toast } from "sonner";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  vendedor: "Vendedor",
};

const formatCurrency = (val: number) => `$${val.toFixed(4)}`;
const formatNumber = (val: number) => val.toLocaleString("pt-BR");

export default function AdminAiUsagePage() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const { data: stats, isLoading: statsLoading } = useAiUsageStats(period);
  const { data: logs, isLoading: logsLoading } = useAiUsageLogs({ period, limit: 200 });
  const { data: quotas, isLoading: quotasLoading } = useAiQuotas();
  const updateQuota = useUpdateQuota();

  const [editingQuotas, setEditingQuotas] = useState<Record<string, { limit: number; unlimited: boolean }>>({});

  const handleSaveQuota = async (id: string, role: string) => {
    const edit = editingQuotas[id];
    if (!edit) return;
    try {
      await updateQuota.mutateAsync({ id, monthly_limit: edit.limit, is_unlimited: edit.unlimited });
      toast.success(`Quota do ${ROLE_LABELS[role] || role} atualizada`);
      setEditingQuotas((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      toast.error("Erro ao atualizar quota");
    }
  };

  return (
    <MainLayout>
      <PageSEO title="Consumo de IA" description="Dashboard de consumo de IA por usuário" path="/admin/consumo-ia" />
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Consumo de IA</h1>
              <p className="text-sm text-muted-foreground">Monitoramento de uso e quotas por usuário</p>
            </div>
          </div>

          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="day">Hoje</TabsTrigger>
              <TabsTrigger value="week">7 dias</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Zap className="h-4 w-4" />}
            label="Requisições"
            value={stats ? formatNumber(stats.totalRequests) : "--"}
            sub={stats ? `${stats.successCount} ok / ${stats.errorCount} erros` : ""}
            loading={statsLoading}
            color="text-blue-500"
          />
          <SummaryCard
            icon={<Activity className="h-4 w-4" />}
            label="Tokens Totais"
            value={stats ? formatNumber(stats.totalTokens) : "--"}
            sub="input + output"
            loading={statsLoading}
            color="text-emerald-500"
          />
          <SummaryCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Custo Estimado"
            value={stats ? formatCurrency(stats.totalCost) : "--"}
            sub="USD no período"
            loading={statsLoading}
            color="text-amber-500"
          />
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label="Usuários Ativos"
            value={stats ? formatNumber(stats.byUser.length) : "--"}
            sub="com chamadas de IA"
            loading={statsLoading}
            color="text-purple-500"
          />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Daily consumption chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Consumo Diário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats?.byDay || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(val: number, name: string) => [formatNumber(val), name === "count" ? "Requisições" : name === "tokens" ? "Tokens" : "Custo"]}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Requisições" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* By function pie chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Por Função
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats?.byFunction || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, count }) => `${name.replace(/^(generate-|ai-)/, "")} (${count})`}
                      labelLine={false}
                    >
                      {(stats?.byFunction || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => [formatNumber(val), "Chamadas"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Users Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Top Usuários por Consumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-2 px-3 text-xs font-medium">Usuário</th>
                      <th className="text-right py-2 px-3 text-xs font-medium">Requisições</th>
                      <th className="text-right py-2 px-3 text-xs font-medium">Tokens</th>
                      <th className="text-right py-2 px-3 text-xs font-medium">Custo (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.byUser || []).slice(0, 10).map((u) => (
                      <tr key={u.userId} className="border-b border-border/20 hover:bg-accent/20">
                        <td className="py-2 px-3 font-mono text-xs">{u.userId.slice(0, 8)}...</td>
                        <td className="py-2 px-3 text-right">{formatNumber(u.count)}</td>
                        <td className="py-2 px-3 text-right">{formatNumber(u.tokens)}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(u.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Model Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" /> Consumo por Modelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-2 px-3 text-xs font-medium">Modelo</th>
                      <th className="text-right py-2 px-3 text-xs font-medium">Chamadas</th>
                      <th className="text-right py-2 px-3 text-xs font-medium">Tokens</th>
                      <th className="text-right py-2 px-3 text-xs font-medium">Custo (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.byModel || []).map((m) => (
                      <tr key={m.name} className="border-b border-border/20 hover:bg-accent/20">
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="font-mono text-xs">{m.name}</Badge>
                        </td>
                        <td className="py-2 px-3 text-right">{formatNumber(m.count)}</td>
                        <td className="py-2 px-3 text-right">{formatNumber(m.tokens)}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quota Management */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Gestão de Quotas por Papel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quotasLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(quotas || []).map((q) => {
                  const editing = editingQuotas[q.id];
                  const isEditing = !!editing;
                  const currentLimit = isEditing ? editing.limit : q.monthly_limit;
                  const currentUnlimited = isEditing ? editing.unlimited : q.is_unlimited;

                  return (
                    <div key={q.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{ROLE_LABELS[q.role] || q.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentUnlimited ? "Uso ilimitado" : `${currentLimit} req/mês`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Ilimitado</label>
                        <Switch
                          checked={currentUnlimited}
                          onCheckedChange={(checked) =>
                            setEditingQuotas((prev) => ({
                              ...prev,
                              [q.id]: { limit: currentLimit, unlimited: checked },
                            }))
                          }
                        />
                      </div>

                      {!currentUnlimited && (
                        <Input
                          type="number"
                          className="w-24 h-8 text-sm"
                          value={currentLimit}
                          min={0}
                          onChange={(e) =>
                            setEditingQuotas((prev) => ({
                              ...prev,
                              [q.id]: { limit: parseInt(e.target.value) || 0, unlimited: false },
                            }))
                          }
                        />
                      )}

                      {isEditing && (
                        <Button
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => handleSaveQuota(q.id, q.role)}
                          disabled={updateQuota.isPending}
                        >
                          <Save className="h-3 w-3" /> Salvar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" /> Últimas Chamadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-2 px-2 font-medium">Data</th>
                      <th className="text-left py-2 px-2 font-medium">Usuário</th>
                      <th className="text-left py-2 px-2 font-medium">Função</th>
                      <th className="text-left py-2 px-2 font-medium">Modelo</th>
                      <th className="text-right py-2 px-2 font-medium">Tokens</th>
                      <th className="text-right py-2 px-2 font-medium">Custo</th>
                      <th className="text-right py-2 px-2 font-medium">Tempo</th>
                      <th className="text-center py-2 px-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs || []).map((log) => (
                      <tr key={log.id} className="border-b border-border/20 hover:bg-accent/20">
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-1.5 px-2 font-mono">{log.user_id.slice(0, 8)}</td>
                        <td className="py-1.5 px-2">
                          <Badge variant="outline" className="text-[10px]">{log.function_name}</Badge>
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">{(log.model || "").replace(/^(google|openai)\//, "")}</td>
                        <td className="py-1.5 px-2 text-right">{formatNumber(log.total_tokens)}</td>
                        <td className="py-1.5 px-2 text-right">{formatCurrency(Number(log.estimated_cost_usd))}</td>
                        <td className="py-1.5 px-2 text-right">{log.duration_ms ? `${log.duration_ms}ms` : "-"}</td>
                        <td className="py-1.5 px-2 text-center">
                          {log.status === "success" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">OK</Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="text-[10px]">Erro</Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">{log.error_message}</TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  loading,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  loading: boolean;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className={color}>{icon}</span>
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
