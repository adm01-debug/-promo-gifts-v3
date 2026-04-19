import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow } from "lucide-react";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useConnectionTester } from "@/hooks/useConnectionTester";

export function N8nTab() {
  const { secrets, list } = useSecretsManager();
  const { test, isTesting } = useConnectionTester();
  useEffect(() => { list(); }, [list]);
  const get = (n: string) => secrets.find((s) => s.name === n);
  const base = get("N8N_BASE_URL");
  const status = base?.has_value ? "active" : "unconfigured";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              <CardTitle>n8n</CardTitle>
            </div>
            <ConnectionStatusBadge status={status} />
          </div>
          <CardDescription>
            Conecte uma instância n8n para automatizar workflows a partir de eventos do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          <SecretField label="Base URL" secretName="N8N_BASE_URL" status={base} onSaved={list}
            helperText="Ex: https://n8n.suaempresa.com" />
          <SecretField label="API Key" secretName="N8N_API_KEY" status={get("N8N_API_KEY")} onSaved={list} />
          <div className="pt-2">
            <Button size="sm" disabled={isTesting} onClick={() => test("n8n")}>
              {isTesting ? "Testando…" : "Testar /healthz"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflows registrados</CardTitle>
          <CardDescription>
            Cada workflow vira automaticamente um destino na aba "Webhooks → Saída".
            Crie um webhook lá com a URL do trigger n8n e selecione os eventos desejados.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
