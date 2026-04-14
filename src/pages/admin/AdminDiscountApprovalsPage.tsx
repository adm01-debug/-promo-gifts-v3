/**
 * AdminDiscountApprovalsPage — Gestão de limites de desconto + fila de aprovações
 */
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Percent,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSellerDiscountLimits, type SellerDiscountLimit } from "@/hooks/useSellerDiscountLimits";
import { useDiscountApproval, type DiscountApprovalWithQuote } from "@/hooks/useDiscountApproval";
import { cn } from "@/lib/utils";

interface SellerProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export default function AdminDiscountApprovalsPage() {
  const { limits, isLoading: limitsLoading, fetchAllLimits, setLimit, deleteLimit } = useSellerDiscountLimits();
  const { pendingRequests, isLoading: requestsLoading, fetchPendingRequests, respondToApproval } = useDiscountApproval();

  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [editDialog, setEditDialog] = useState<{ open: boolean; userId: string; name: string; currentLimit: number; notes: string }>({ open: false, userId: "", name: "", currentLimit: 5, notes: "" });
  const [respondDialog, setRespondDialog] = useState<{ open: boolean; request: DiscountApprovalWithQuote | null; action: "approve" | "reject" | null; notes: string }>({ open: false, request: null, action: null, notes: "" });

  useEffect(() => {
    fetchAllLimits();
    fetchPendingRequests();
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, role")
      .order("full_name");
    setSellers((data || []) as SellerProfile[]);
  };

  const handleSetLimit = async () => {
    const ok = await setLimit(editDialog.userId, editDialog.currentLimit, editDialog.notes);
    if (ok) {
      setEditDialog({ open: false, userId: "", name: "", currentLimit: 5, notes: "" });
      fetchAllLimits();
    }
  };

  const handleRespond = async () => {
    if (!respondDialog.request || !respondDialog.action) return;
    const ok = await respondToApproval(
      respondDialog.request.id,
      respondDialog.action === "approve",
      respondDialog.notes
    );
    if (ok) {
      setRespondDialog({ open: false, request: null, action: null, notes: "" });
      fetchPendingRequests();
    }
  };

  const getLimitForSeller = (userId: string) => limits.find(l => l.user_id === userId);
  const pendingCount = pendingRequests.filter(r => r.status === "pending").length;

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <MainLayout>
      <PageSEO title="Gestão de Descontos" description="Gerencie limites de desconto e aprovações" path="/admin/aprovacoes-desconto" noIndex />

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Gestão de Descontos
          </h1>
          <p className="text-muted-foreground">Defina limites de desconto por vendedor e gerencie solicitações de aprovação</p>
        </div>

        <Tabs defaultValue="limits" className="space-y-4">
          <TabsList>
            <TabsTrigger value="limits" className="gap-2">
              <Percent className="h-4 w-4" /> Limites
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2 relative">
              <Clock className="h-4 w-4" /> Aprovações
              {pendingCount > 0 && (
                <Badge className="ml-1 h-5 min-w-[20px] px-1 text-[10px] bg-warning text-warning-foreground">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* === LIMITS TAB === */}
          <TabsContent value="limits" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Limites de Desconto por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {limitsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sellers.map(seller => {
                      const limit = getLimitForSeller(seller.user_id);
                      return (
                        <div key={seller.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {(seller.full_name || seller.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{seller.full_name || seller.email}</p>
                              <p className="text-xs text-muted-foreground">{seller.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {limit ? (
                              <Badge variant="secondary" className="gap-1 tabular-nums">
                                <Percent className="h-3 w-3" />
                                {limit.max_discount_percent}% máx
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Sem limite definido
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => setEditDialog({
                                open: true,
                                userId: seller.user_id,
                                name: seller.full_name || seller.email || "",
                                currentLimit: limit?.max_discount_percent || 5,
                                notes: limit?.notes || "",
                              })}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            {limit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-destructive hover:text-destructive"
                                onClick={async () => {
                                  await deleteLimit(limit.id);
                                  fetchAllLimits();
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {sellers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Nenhum vendedor encontrado</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === APPROVALS TAB === */}
          <TabsContent value="approvals" className="space-y-4">
            {requestsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-success/50" />
                  <p className="font-medium">Nenhuma solicitação pendente</p>
                  <p className="text-sm text-muted-foreground">Todas as solicitações foram respondidas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <Card key={req.id} className={cn(
                    "transition-colors",
                    req.status === "pending" && "border-warning/50 bg-warning/5"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={req.status === "pending" ? "default" : req.status === "approved" ? "secondary" : "destructive"} className="gap-1">
                              {req.status === "pending" && <Clock className="h-3 w-3" />}
                              {req.status === "approved" && <CheckCircle className="h-3 w-3" />}
                              {req.status === "rejected" && <XCircle className="h-3 w-3" />}
                              {req.status === "pending" ? "Pendente" : req.status === "approved" ? "Aprovado" : "Rejeitado"}
                            </Badge>
                            {req.quote && (
                              <span className="text-sm font-mono font-medium">{req.quote.quote_number}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Vendedor</p>
                              <p className="font-medium">{req.seller?.full_name || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Cliente</p>
                              <p className="font-medium">{req.quote?.client_name || req.quote?.client_company || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Desconto Solicitado</p>
                              <p className="font-bold text-warning">{req.requested_discount_percent}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Limite Autorizado</p>
                              <p className="font-medium">{req.max_allowed_percent}%</p>
                            </div>
                          </div>
                          {req.quote && (
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatCurrency(req.quote.total)}</span></span>
                            </div>
                          )}
                          {req.seller_notes && (
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                              <span className="font-medium">Nota do vendedor:</span> {req.seller_notes}
                            </p>
                          )}
                          {req.admin_notes && (
                            <p className="text-sm bg-primary/5 rounded-lg px-3 py-2">
                              <span className="font-medium">Nota do admin:</span> {req.admin_notes}
                            </p>
                          )}
                        </div>
                        {req.status === "pending" && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="success"
                              className="gap-1"
                              onClick={() => setRespondDialog({ open: true, request: req, action: "approve", notes: "" })}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => setRespondDialog({ open: true, request: req, action: "reject", notes: "" })}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Limit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Limite de Desconto — {editDialog.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Desconto Máximo (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={editDialog.currentLimit}
                onChange={(e) => setEditDialog(prev => ({ ...prev, currentLimit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={editDialog.notes}
                onChange={(e) => setEditDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações sobre este limite..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button onClick={handleSetLimit}>Salvar Limite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={respondDialog.open} onOpenChange={(open) => !open && setRespondDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {respondDialog.action === "approve" ? (
                <><CheckCircle className="h-5 w-5 text-success" /> Aprovar Desconto</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Rejeitar Desconto</>
              )}
            </DialogTitle>
          </DialogHeader>
          {respondDialog.request && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p><span className="font-medium">Orçamento:</span> {respondDialog.request.quote?.quote_number}</p>
                <p><span className="font-medium">Vendedor:</span> {respondDialog.request.seller?.full_name}</p>
                <p><span className="font-medium">Desconto:</span> {respondDialog.request.requested_discount_percent}% (limite: {respondDialog.request.max_allowed_percent}%)</p>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={respondDialog.notes}
                  onChange={(e) => setRespondDialog(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={respondDialog.action === "reject" ? "Motivo da rejeição..." : "Observações..."}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondDialog(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button
              variant={respondDialog.action === "approve" ? "success" : "destructive"}
              onClick={handleRespond}
            >
              {respondDialog.action === "approve" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
