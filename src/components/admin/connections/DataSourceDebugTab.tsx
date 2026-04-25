import { useEffect, useState, useCallback } from "react";
import { Bug, Database, KeyRound, RefreshCw, CheckCircle2, AlertCircle, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { toast } from "sonner";

type ExternalConnRow = {
  id: string;
  name: string | null;
  type: string | null;
  status: string | null;
  last_test_at: string | null;
  updated_at: string | null;
};

type DataSourceMap = {
  field: string;
  description: string;
  source: "integration_credentials" | "external_connections" | "ambos (sync trigger)";
  notes: string;
};

const FIELD_MAP: DataSourceMap[] = [
  {
    field: "URL / API Key (valor mascarado)",
    description: "Valores mostrados nos cards Catálogo/CRM Promobrind",
    source: "integration_credentials",
    notes: "Lido via edge function `secrets-manager` (RLS por admin)",
  },
  {
    field: "Status (Ativo/Inativo)",
    description: "Badge verde/cinza nos cards e tabela Overview",
    source: "ambos (sync trigger)",
    notes: "SSOT em `integration_credentials`; espelhado por trigger",
  },
  {
    field: "Histórico de testes (last_test_at, latência)",
    description: "Coluna 'Último teste' em ConnectionsOverviewTable",
    source: "external_connections",
    notes: "Atualizado pelo botão 'Testar conexão' e auto-test cron",
  },
  {
    field: "Health agregado (Pulse Bar, Saúde)",
    description: "Indicador no topo + zona Saúde",
    source: "external_connections",
    notes: "Usa status + last_test_at desta tabela",
  },
  {
    field: "Lista de produtos (catálogo)",
    description: "Dados do banco Promobrind",
    source: "integration_credentials",
    notes: "URL/key consumidos pelo `external-db-bridge` em runtime",
  },
];

export function DataSourceDebugTab() {
  const { secrets, list, loading: secretsLoading } = useSecretsManager();
  const [extConns, setExtConns] = useState<ExternalConnRow[] | null>(null);
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);

  const loadExternal = useCallback(async () => {
    setExtLoading(true);
    setExtError(null);
    const { data, error } = await supabase
      .from("external_connections")
      .select("id,name,type,status,last_test_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      setExtError(error.message);
      setExtConns([]);
    } else {
      setExtConns((data ?? []) as ExternalConnRow[]);
    }
    setExtLoading(false);
  }, []);

  useEffect(() => {
    list();
    loadExternal();
  }, [list, loadExternal]);

  const refresh = useCallback(() => {
    list();
    loadExternal();
    toast.success("Dados de debug recarregados");
  }, [list, loadExternal]);

  const integrationCount = secrets.length;
  const externalCount = extConns?.length ?? 0;
  const inSync = !secretsLoading && !extLoading && integrationCount === externalCount;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Bug className="h-5 w-5 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Debug de Origem de Dados</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Compara as duas fontes que alimentam esta tela: <code className="text-xs px-1 py-0.5 rounded bg-muted">integration_credentials</code> (SSOT, valores secretos) e <code className="text-xs px-1 py-0.5 rounded bg-muted">external_connections</code> (espelho operacional, histórico de testes).
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={secretsLoading || extLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${secretsLoading || extLoading ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </div>

      {/* Counts */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              integration_credentials
            </CardTitle>
            <CardDescription className="text-xs">SSOT — valores secretos (mascarados)</CardDescription>
          </CardHeader>
          <CardContent>
            {secretsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold tabular-nums">{integrationCount}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">linha(s) acessíveis via edge function</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              external_connections
            </CardTitle>
            <CardDescription className="text-xs">Espelho operacional + histórico</CardDescription>
          </CardHeader>
          <CardContent>
            {extLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold tabular-nums">{externalCount}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">linha(s) na tabela espelhada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {inSync ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              Sincronização
            </CardTitle>
            <CardDescription className="text-xs">
              Trigger: <code className="text-[10px]">sync_external_connections_from_credentials</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {secretsLoading || extLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <Badge variant={inSync ? "default" : "secondary"} className={inSync ? "bg-green-600" : ""}>
                {inSync ? "Espelhado" : "Divergente"}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {inSync
                ? "Ambas tabelas têm o mesmo nº de linhas."
                : `Diferença de ${Math.abs(integrationCount - externalCount)} linha(s).`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Field map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapa de campos → fonte</CardTitle>
          <CardDescription>De onde cada dado mostrado em /admin/conexoes é lido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Campo / UI</th>
                  <th className="py-2 pr-3 font-medium">Origem</th>
                  <th className="py-2 font-medium">Observações</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_MAP.map((row) => (
                  <tr key={row.field} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{row.field}</div>
                      <div className="text-xs text-muted-foreground">{row.description}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge
                        variant="outline"
                        className={
                          row.source === "integration_credentials"
                            ? "border-primary/40 text-primary"
                            : row.source === "external_connections"
                              ? "border-blue-500/40 text-blue-600"
                              : "border-green-500/40 text-green-700"
                        }
                      >
                        {row.source}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Raw rows */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">integration_credentials (linhas)</CardTitle>
          </CardHeader>
          <CardContent>
            {secretsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : secrets.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma credencial encontrada.</p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {secrets.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-2 border-b pb-1.5 last:border-0">
                    <span className="truncate">{s.name}</span>
                    <div className="flex items-center gap-1.5">
                      {s.masked_suffix && (
                        <span className="text-[10px] text-muted-foreground">••••{s.masked_suffix}</span>
                      )}
                      <Badge
                        variant={s.has_value ? "default" : "secondary"}
                        className={`text-[10px] ${s.has_value ? "bg-green-600" : ""}`}
                      >
                        {s.has_value ? (s.source ?? "db") : "vazio"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">external_connections (linhas)</CardTitle>
          </CardHeader>
          <CardContent>
            {extLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : extError ? (
              <p className="text-xs text-destructive">Erro: {extError}</p>
            ) : !extConns || extConns.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma linha encontrada.</p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {extConns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 border-b pb-1.5 last:border-0">
                    <span className="truncate">{c.name ?? c.id}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{c.type ?? "—"}</Badge>
                      <Badge
                        variant={c.status === "active" ? "default" : "secondary"}
                        className={`text-[10px] ${c.status === "active" ? "bg-green-600" : ""}`}
                      >
                        {c.status ?? "—"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
