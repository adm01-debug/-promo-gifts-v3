import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useConnectionTester } from "@/hooks/useConnectionTester";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";

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
  const { test, isTesting } = useConnectionTester();

  useEffect(() => { list(); }, [list]);

  const get = (n: string) => secrets.find((s) => s.name === n);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ENVS.map((env) => {
        const url = env.urlSecret ? get(env.urlSecret) : undefined;
        const anon = env.anonSecret ? get(env.anonSecret) : undefined;
        const svc = env.serviceSecret ? get(env.serviceSecret) : undefined;
        const status = env.readOnly
          ? "active"
          : url?.has_value && svc?.has_value ? "active" : "unconfigured";
        const canTest = !env.readOnly && !!url?.has_value && !!svc?.has_value;
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
                      title={canTest ? "Testar conexão real" : "Configure URL e Service Role Key primeiro"}
                      onClick={() => test("supabase", { env_key: env.envKey! })}
                    >
                      {isTesting ? "Testando…" : "Testar conexão"}
                    </Button>
                    <ConnectionTimelineDrawer type="supabase" label={env.name} triggerVariant="ghost" />
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin/external-db">
                        <ExternalLink className="h-4 w-4 mr-1" /> Ver schema
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
