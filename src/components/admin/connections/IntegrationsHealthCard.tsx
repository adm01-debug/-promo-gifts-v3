/**
 * IntegrationsHealthCard — Onda 9
 * Card read-only no topo de /admin/conexoes com auto-refresh 60s.
 * Mostra saúde agregada de webhooks, conexões e MCP keys.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Webhook,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HealthData {
  activeWebhooks: number;
  totalWebhooks: number;
  successRate24h: number | null;
  totalDeliveries24h: number;
  lastSuccessAt: string | null;
  failingConnections: number;
  mcpKeysUsed24h: number;
}

async function fetchHealth(): Promise<HealthData> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeWebhooks },
    { count: totalWebhooks },
    { data: deliveries24h },
    { data: lastSuccess },
    { count: failingConnections },
    { count: mcpKeysUsed24h },
  ] = await Promise.all([
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }),
    supabase.from("webhook_deliveries").select("success").gte("delivered_at", since24h),
    supabase
      .from("webhook_deliveries")
      .select("delivered_at")
      .eq("success", true)
      .order("delivered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("external_connections")
      .select("id", { count: "exact", head: true })
      .eq("last_test_ok", false),
    supabase
      .from("mcp_api_keys")
      .select("id", { count: "exact", head: true })
      .gte("last_used_at", since24h)
      .is("revoked_at", null),
  ]);

  const total = deliveries24h?.length ?? 0;
  const success = deliveries24h?.filter((d) => d.success).length ?? 0;
  const rate = total > 0 ? (success / total) * 100 : null;

  return {
    activeWebhooks: activeWebhooks ?? 0,
    totalWebhooks: totalWebhooks ?? 0,
    successRate24h: rate,
    totalDeliveries24h: total,
    lastSuccessAt: lastSuccess?.delivered_at ?? null,
    failingConnections: failingConnections ?? 0,
    mcpKeysUsed24h: mcpKeysUsed24h ?? 0,
  };
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "destructive" | "muted";
  children: React.ReactNode;
}) {
  const cls = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {children}
    </Badge>
  );
}

interface MetricProps {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "destructive";
}

function Metric({ icon: Icon, label, value, badge, tone = "default" }: MetricProps) {
  const iconCls = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center justify-between">
        <Icon className={cn("h-4 w-4", iconCls)} aria-hidden="true" />
        {badge}
      </div>
      <div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function IntegrationsHealthCard() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["integrations-health"],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const successTone =
    data?.successRate24h === null
      ? "default"
      : (data?.successRate24h ?? 0) >= 95
        ? "success"
        : (data?.successRate24h ?? 0) >= 70
          ? "warning"
          : "destructive";

  const failingTone = (data?.failingConnections ?? 0) > 0 ? "destructive" : "success";

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            Saúde das Integrações
          </CardTitle>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            aria-label="Atualizar saúde das integrações"
          >
            <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
            {isFetching ? "Atualizando…" : "Auto 60s"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Metric
              icon={Webhook}
              label="Webhooks ativos"
              value={`${data.activeWebhooks}/${data.totalWebhooks}`}
              tone={data.activeWebhooks > 0 ? "success" : "default"}
            />
            <Metric
              icon={CheckCircle2}
              label={`Sucesso 24h (${data.totalDeliveries24h} envios)`}
              value={data.successRate24h === null ? "—" : `${data.successRate24h.toFixed(1)}%`}
              tone={successTone}
              badge={
                data.successRate24h !== null && (
                  <StatusBadge
                    tone={
                      successTone === "success"
                        ? "success"
                        : successTone === "warning"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {successTone === "success" ? "OK" : successTone === "warning" ? "Atenção" : "Crítico"}
                  </StatusBadge>
                )
              }
            />
            <Metric
              icon={Clock}
              label="Última entrega bem-sucedida"
              value={
                data.lastSuccessAt
                  ? formatDistanceToNow(new Date(data.lastSuccessAt), { locale: ptBR, addSuffix: true })
                  : "Nunca"
              }
            />
            <Metric
              icon={AlertTriangle}
              label="Conexões com falha"
              value={String(data.failingConnections)}
              tone={failingTone}
              badge={
                data.failingConnections > 0 ? (
                  <StatusBadge tone="destructive">Verificar</StatusBadge>
                ) : (
                  <StatusBadge tone="success">OK</StatusBadge>
                )
              }
            />
            <Metric
              icon={KeyRound}
              label="Chaves MCP usadas (24h)"
              value={String(data.mcpKeysUsed24h)}
              tone={data.mcpKeysUsed24h > 0 ? "success" : "default"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
