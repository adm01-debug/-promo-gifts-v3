/**
 * MyRecentQuotesWidget — lista propostas recentes do usuário logado.
 * Aplica filtro explícito por seller_id = auth.uid() (defesa em profundidade
 * sobre a RLS já existente).
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
};

export function MyRecentQuotesWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data = [] } = useQuery({
    queryKey: ["my-recent-quotes-widget", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, status, total, client_name, client_company, updated_at")
        .eq("seller_id", user!.id)
        .order("updated_at", { ascending: false })
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
            <FileText className="h-4 w-4 text-primary" />
            Minhas Propostas Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/orcamentos")} className="text-xs gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((q) => (
          <button
            key={q.id}
            onClick={() => navigate(`/orcamentos/${q.id}`)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                #{q.quote_number} · {q.client_company || q.client_name || "Sem cliente"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={q.status === "draft" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                  {STATUS_LABELS[q.status] ?? q.status}
                </Badge>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDistanceToNow(new Date(q.updated_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
            {q.total != null && (
              <p className="text-sm font-semibold text-primary flex-shrink-0">
                {Number(q.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
