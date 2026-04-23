import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useConnectionTester } from "@/hooks/useConnectionTester";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";
import { LastTestLine, type LastTestInfo } from "./LastTestLine";
import { ConnectionTestHistoryPanel } from "./ConnectionTestHistoryPanel";
import { RetestButton } from "./RetestButton";
import { ConnectionErrorDetailsDialog } from "./ConnectionErrorDetailsDialog";
import { RefreshFromDbButton } from "./RefreshFromDbButton";
import { hasSuspiciousLength } from "./secretValidators";

const ENVS = [
  {
    key: "local", name: "Lovable Cloud (Local)", readOnly: true,
    envKey: null,
    urlSecret: null, anonSecret: null, serviceSecret: null,
    description: "Banco principal do sistema. Gerenciado automaticamente pelo Lovable.",
  },
  {
    key: "promobrind", name: "Catálogo Promobrind",
    envKey: "promobrind" as const,
    urlSecret: "EXTERNAL_PROMOBRIND_URL",
    anonSecret: "EXTERNAL_PROMOBRIND_ANON_KEY",
    serviceSecret: "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY",
    description: "Banco SSOT de produtos, fornecedores e categorias.",
  },
  {
    key: "crm", name: "CRM Promobrind",
    envKey: "crm" as const,
    urlSecret: "EXTERNAL_CRM_URL",
    anonSecret: "EXTERNAL_CRM_ANON_KEY",
    serviceSecret: "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    description: "Banco do CRM externo (empresas, contatos, agendas).",
  },
] as const;

export function SupabaseConnectionsTab() {
  const { secrets, list } = useSecretsManager();
  const { test, isTesting, fetchLastTest } = useConnectionTester();
  const [lastByEnv, setLastByEnv] = useState<Record<string, LastTestInfo | null>>({});
  const [historyKeyByEnv, setHistoryKeyByEnv] = useState<Record<string, number>>({});
  const [errorDialogByEnv, setErrorDialogByEnv] = useState<Record<string, boolean>>({});

  useEffect(() => { list(); }, [list]);

  const hydrate = useCallback(async () => {
    const entries = await Promise.all(
      ENVS.filter((e) => e.envKey).map(async (e) => {
        const last = await fetchLastTest("supabase", { env_key: e.envKey! });
        return [e.key, last ? {
          ok: last.ok,
          tested_at: last.tested_at,
          latency_ms: last.latency_ms,
          message: last.message,
        } as LastTestInfo : null] as const;
      }),
    );
    setLastByEnv(Object.fromEntries(entries));
  }, [fetchLastTest]);

  useEffect(() => { hydrate(); }, [hydrate]);

  const get = (n: string) => secrets.find((s) => s.name === n);

  const handleTest = async (envKey: "promobrind" | "crm", localKey: string) => {
    const r = await test("supabase", { env_key: envKey });
    setLastByEnv((cur) => ({
      ...cur,
      [localKey]: {
        ok: r.ok,
        tested_at: r.tested_at ?? new Date().toISOString(),
        latency_ms: r.latency_ms,
        message: r.error ?? r.message,
        status: r.status,
      },
    }));
    setHistoryKeyByEnv((cur) => ({ ...cur, [localKey]: (cur[localKey] ?? 0) + 1 }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ENVS.map((env) => {
        const url = env.urlSecret ? get(env.urlSecret) : undefined;
        const anon = env.anonSecret ? get(env.anonSecret) : undefined;
        const svc = env.serviceSecret ? get(env.serviceSecret) : undefined;
        const last = env.readOnly ? null : lastByEnv[env.key] ?? null;
        const credsConfigured = !!url?.has_value && !!svc?.has_value;
        const suspicious = !env.readOnly
          ? hasSuspiciousLength(secrets, [env.urlSecret!, env.anonSecret!, env.serviceSecret!])
          : false;
        const credsLooksValid = credsConfigured && !suspicious;
        const status: "active" | "error" | "unconfigured" = env.readOnly
          ? "active"
          : !credsConfigured
            ? "unconfigured"
            : last?.ok === false
              ? "error"
              : "active";
        const canTest = !env.readOnly && credsLooksValid;
        return (
          <Card key={env.key}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{env.name}</CardTitle>
                </div>
                <ConnectionStatusBadge status={status} />
              </div>
              <CardDescription>{env.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {env.readOnly ? (
                <p className="text-sm text-muted-foreground">
                  Credenciais gerenciadas automaticamente. Não requer configuração manual.
                </p>
              ) : (
                <>
                  <SecretField label="URL do projeto" secretName={env.urlSecret!} status={url} onSaved={list} />
                  <SecretField label="Anon Key" secretName={env.anonSecret!} status={anon} onSaved={list} />
                  <SecretField label="Service Role Key" secretName={env.serviceSecret!} status={svc} onSaved={list}
                    helperText="Nunca exposto ao frontend. Usado apenas em edge functions admin." />
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isTesting || !canTest}
                      title={!credsConfigured ? "Configure URL e Service Role Key primeiro"
                        : !credsLooksValid ? "Credenciais com formato suspeito (comprimento curto) — re-salve antes de testar"
                        : "Testar conexão real"}
                      onClick={() => handleTest(env.envKey!, env.key)}
                    >
                      {isTesting ? "Testando…" : "Testar conexão"}
                    </Button>
                    <ConnectionTimelineDrawer type="supabase" label={env.name} triggerVariant="ghost" />
                    <RefreshFromDbButton onRefreshed={list} />
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin/external-db">
                        <ExternalLink className="h-4 w-4 mr-1" /> Ver schema
                      </Link>
                    </Button>
                  </div>
                  <LastTestLine
                    info={last}
                    onClick={last?.ok === false ? () => setErrorDialogByEnv((cur) => ({ ...cur, [env.key]: true })) : undefined}
                    action={
                      <RetestButton
                        onRetest={() => handleTest(env.envKey!, env.key)}
                        disabled={!canTest}
                        disabledReason={!credsConfigured ? "Configure URL e Service Role Key primeiro" : "Credenciais com formato suspeito — re-salve antes de testar"}
                      />
                    }
                  />
                  <ConnectionTestHistoryPanel
                    type="supabase"
                    envKey={env.envKey!}
                    label={env.name}
                    refreshKey={historyKeyByEnv[env.key] ?? 0}
                  />
                  <ConnectionErrorDetailsDialog
                    open={!!errorDialogByEnv[env.key]}
                    onOpenChange={(v) => setErrorDialogByEnv((cur) => ({ ...cur, [env.key]: v }))}
                    connectionType="supabase"
                    connectionLabel={env.name}
                    summary={last}
                    envKey={env.envKey!}
                  />
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
