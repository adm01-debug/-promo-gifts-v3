/**
 * MyDiscountRequestsWidget — solicitações de desconto do usuário logado.
 * Filtro explícito por seller_id = auth.uid() sobre a RLS existente.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Percent, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function MyDiscountRequestsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data = [] } = useQuery({
    queryKey: ["my-discount-requests-widget", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_approval_requests")
        .select("id, status, requested_discount_percent, quote_id, created_at")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            Minhas Solicitações de Desconto
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/descontos")} className="text-xs gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Percent className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Desconto solicitado: {Number(r.requested_discount_percent ?? 0).toFixed(1)}%
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px] px-1.5 py-0">
                  {r.status}
                </Badge>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
