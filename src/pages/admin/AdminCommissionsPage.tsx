/**
 * AdminCommissionsPage — Gestão de comissões para admins.
 * Permite criar/editar regras e gerenciar entradas de comissão.
 */
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Settings, DollarSign, Plus, Check, X, Pencil,
  Users, Percent, ShieldCheck, Clock, CheckCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function AdminCommissionsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["admin-commission-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["admin-commission-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["seller-profiles-for-commissions"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, email");
      return data || [];
    },
  });

  const getSellerName = (sellerId: string) => {
    const p = profilesQuery.data?.find(p => p.user_id === sellerId);
    return p?.full_name || p?.email || sellerId.slice(0, 8);
  };

  const updateEntryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "paid") updateData.paid_at = new Date().toISOString();
      const { error } = await supabase
        .from("commission_entries")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commission-entries"] });
      toast.success("Comissão atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  // New rule form
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [rulePercent, setRulePercent] = useState("5");
  const [ruleMin, setRuleMin] = useState("0");
  const [ruleMax, setRuleMax] = useState("");
  const [ruleDefault, setRuleDefault] = useState(false);

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("commission_rules").insert({
        commission_percent: parseFloat(rulePercent),
        min_order_value: parseFloat(ruleMin) || 0,
        max_order_value: ruleMax ? parseFloat(ruleMax) : null,
        is_default: ruleDefault,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commission-rules"] });
      toast.success("Regra criada!");
      setShowRuleForm(false);
      setRulePercent("5");
      setRuleMin("0");
      setRuleMax("");
      setRuleDefault(false);
    },
    onError: () => toast.error("Erro ao criar regra"),
  });

  const toggleRuleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("commission_rules")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commission-rules"] });
    },
  });

  const entries = entriesQuery.data || [];
  const pendingEntries = entries.filter(e => e.status === "pending");
  const approvedEntries = entries.filter(e => e.status === "approved");
  const paidEntries = entries.filter(e => e.status === "paid");

  const totalPending = pendingEntries.reduce((s, e) => s + (e.commission_amount || 0), 0);
  const totalApproved = approvedEntries.reduce((s, e) => s + (e.commission_amount || 0), 0);
  const totalPaid = paidEntries.reduce((s, e) => s + (e.commission_amount || 0), 0);

  if (role !== "admin" && role !== "manager") {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageSEO title="Gestão de Comissões" description="Administre regras e pagamentos de comissões." path="/admin/comissoes" noIndex />

      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
              <Settings className="h-6 w-6 text-warning" />
            </div>
            Gestão de Comissões
          </h1>
          <p className="text-muted-foreground mt-1">Regras, aprovações e pagamentos</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(totalPending)}</p>
              <p className="text-[11px] text-muted-foreground">{pendingEntries.length} entradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Aprovada</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalApproved)}</p>
              <p className="text-[11px] text-muted-foreground">{approvedEntries.length} entradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Paga</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
              <p className="text-[11px] text-muted-foreground">{paidEntries.length} entradas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="entries">
          <TabsList>
            <TabsTrigger value="entries">
              <DollarSign className="h-3.5 w-3.5 mr-1" />Comissões ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Percent className="h-3.5 w-3.5 mr-1" />Regras ({rulesQuery.data?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Entradas de Comissão</CardTitle>
              </CardHeader>
              <CardContent>
                {entriesQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma comissão registrada</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {entries.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{getSellerName(entry.seller_id)}</p>
                            <StatusBadge status={entry.status} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {entry.commission_percent}% sobre {formatCurrency(entry.order_total)}
                            {" = "}<strong>{formatCurrency(entry.commission_amount)}</strong>
                            {" · "}{formatDate(entry.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {entry.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-success hover:text-success"
                                onClick={() => updateEntryStatus.mutate({ id: entry.id, status: "approved" })}
                                title="Aprovar"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => updateEntryStatus.mutate({ id: entry.id, status: "cancelled" })}
                                title="Cancelar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {entry.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateEntryStatus.mutate({ id: entry.id, status: "paid" })}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />Pagar
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowRuleForm(!showRuleForm)}>
                <Plus className="h-4 w-4 mr-2" />Nova Regra
              </Button>
            </div>

            {showRuleForm && (
              <Card className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Comissão (%)</Label>
                      <Input type="number" min={0} max={100} step={0.5} value={rulePercent} onChange={e => setRulePercent(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Valor mínimo (R$)</Label>
                      <Input type="number" min={0} step={100} value={ruleMin} onChange={e => setRuleMin(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Valor máximo (R$)</Label>
                      <Input type="number" min={0} step={100} value={ruleMax} onChange={e => setRuleMax(e.target.value)} placeholder="Sem limite" className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={ruleDefault} onCheckedChange={setRuleDefault} />
                    <Label className="text-xs">Regra padrão (aplica a todos os vendedores)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => createRule.mutate()} disabled={createRule.isPending}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Criar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowRuleForm(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Regras de Comissão</CardTitle>
              </CardHeader>
              <CardContent>
                {rulesQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                ) : (rulesQuery.data || []).length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma regra cadastrada</p>
                ) : (
                  <div className="space-y-1.5">
                    {(rulesQuery.data || []).map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{rule.commission_percent}%</p>
                            {rule.is_default && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
                            {!rule.is_active && <Badge variant="destructive" className="text-[10px]">Inativa</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {rule.min_order_value > 0 ? `Mín: ${formatCurrency(rule.min_order_value)}` : "Sem mínimo"}
                            {rule.max_order_value ? ` · Máx: ${formatCurrency(rule.max_order_value)}` : ""}
                            {rule.seller_id ? ` · Vendedor específico` : ""}
                          </p>
                        </div>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(active) => toggleRuleActive.mutate({ id: rule.id, active })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
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
