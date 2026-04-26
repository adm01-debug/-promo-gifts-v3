/**
 * MyRecentQuotesWidget — lista propostas recentes do usuário logado, com
 * busca textual, filtro de status e intervalo de datas.
 * Aplica filtro explícito por seller_id = auth.uid() (defesa em profundidade
 * sobre a RLS já existente).
 */
import { useMemo, useState } from "react";
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
import {
  WidgetFiltersBar,
  EMPTY_FILTERS,
  matchesSearch,
  withinDateRange,
  type WidgetFiltersValue,
} from "./widget-filters/WidgetFiltersBar";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
  pending_approval: "Aguardando aprovação",
  converted: "Convertido",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function MyRecentQuotesWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<WidgetFiltersValue>(EMPTY_FILTERS);

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
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return data.filter(
      (q) =>
        (filters.status === "all" || q.status === filters.status) &&
        withinDateRange(q.updated_at, filters.dateRange) &&
        matchesSearch([q.quote_number, q.client_name, q.client_company], filters.search),
    );
  }, [data, filters]);

  const visible = filtered.slice(0, 5);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Minhas Propostas Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/orcamentos")} className="text-xs gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <WidgetFiltersBar
          value={filters}
          onChange={setFilters}
          statusOptions={STATUS_OPTIONS}
          searchPlaceholder="Buscar por número ou cliente…"
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma proposta encontrada com os filtros atuais.
          </p>
        ) : (
          visible.map((q) => (
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
          ))
        )}
        {filtered.length > visible.length && (
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Exibindo {visible.length} de {filtered.length} resultado(s).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
