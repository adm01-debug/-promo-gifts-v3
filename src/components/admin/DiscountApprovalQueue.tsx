/**
 * DiscountApprovalQueue — fila administrativa de solicitações de desconto pendentes.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function DiscountApprovalQueue() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["discount-approval-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_approval_requests")
        .select("*, quotes:quote_id(quote_number, client_name, client_company, total)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("discount_approval_requests")
        .update({
          status: approved ? "approved" : "rejected",
          admin_id: u.user?.id ?? null,
          admin_notes: notes[id] ?? null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resposta registrada");
      qc.invalidateQueries({ queryKey: ["discount-approval-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((req) => {
        const quote = (req as { quotes?: { quote_number?: string; client_name?: string; client_company?: string; total?: number } }).quotes;
        return (
          <Card key={req.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Orçamento {quote?.quote_number ?? "—"}</span>
                <Badge variant="destructive">
                  {req.requested_discount_percent}% (limite {req.max_allowed_percent}%)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cliente: <strong>{quote?.client_name || quote?.client_company || "—"}</strong>
                {quote?.total != null && <> · Total: <strong>R$ {Number(quote.total).toFixed(2)}</strong></>}
              </p>
              {req.seller_notes && (
                <p className="text-sm bg-muted/40 rounded p-2">📝 {req.seller_notes}</p>
              )}
              <Textarea
                placeholder="Notas (opcional)"
                value={notes[req.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [req.id]: e.target.value })}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => respond.mutate({ id: req.id, approved: false })}
                  disabled={respond.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Recusar
                </Button>
                <Button onClick={() => respond.mutate({ id: req.id, approved: true })} disabled={respond.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
