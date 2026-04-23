import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow } from "lucide-react";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useConnectionTester } from "@/hooks/useConnectionTester";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";
import { LastTestLine, type LastTestInfo } from "./LastTestLine";
import { ConnectionTestHistoryPanel } from "./ConnectionTestHistoryPanel";
import { RetestButton } from "./RetestButton";
import { ConnectionTestDetailsDialog } from "./ConnectionTestDetailsDialog";
import { RefreshFromDbButton } from "./RefreshFromDbButton";
import { hasSuspiciousLength } from "./secretValidators";

export function N8nTab() {
  const { secrets, list } = useSecretsManager();
  const { test, isTesting, fetchLastTest } = useConnectionTester();
  const [last, setLast] = useState<LastTestInfo | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => { list(); }, [list]);
  const hydrate = useCallback(async () => {
    const r = await fetchLastTest("n8n");
    setLast(r ? { ok: r.ok, tested_at: r.tested_at, latency_ms: r.latency_ms, message: r.message } : null);
  }, [fetchLastTest]);
  useEffect(() => { hydrate(); }, [hydrate]);

  const get = (n: string) => secrets.find((s) => s.name === n);
  const base = get("N8N_BASE_URL");
  const credsOk = !!base?.has_value;
  const suspicious = hasSuspiciousLength(secrets, ["N8N_BASE_URL", "N8N_API_KEY"]);
  const credsLooksValid = credsOk && !suspicious;
  const status: "active" | "error" | "unconfigured" = !credsOk
    ? "unconfigured"
    : last?.ok === false ? "error" : "active";

  const onTest = async () => {
    const r = await test("n8n");
    setLast({ ok: r.ok, tested_at: r.tested_at ?? new Date().toISOString(), latency_ms: r.latency_ms, message: r.error ?? r.message, status: r.status, error_kind: r.error_kind ?? null });
    setHistoryKey((k) => k + 1);
  };

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
          <div className="pt-2 flex flex-wrap gap-2">
            <Button size="sm" disabled={isTesting || !credsLooksValid}
              title={!credsOk ? "Configure a Base URL primeiro"
                : !credsLooksValid ? "Credenciais com formato suspeito (comprimento curto) — re-salve antes de testar"
                : "Testar /healthz"}
              onClick={onTest}>
              {isTesting ? "Testando…" : "Testar /healthz"}
            </Button>
            <ConnectionTimelineDrawer type="n8n" label="n8n" />
            <RefreshFromDbButton onRefreshed={list} />
          </div>
          <LastTestLine
            info={last}
            onClick={last?.tested_at ? () => setDetailsDialogOpen(true) : undefined}
            action={
              <RetestButton
                onRetest={onTest}
                disabled={!credsLooksValid}
                disabledReason={!credsOk ? "Configure a Base URL primeiro" : "Credenciais com formato suspeito — re-salve antes de testar"}
              />
            }
          />
          <ConnectionTestHistoryPanel type="n8n" label="n8n" refreshKey={historyKey} />
          <ConnectionTestDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            connectionType="n8n"
            connectionLabel="n8n"
          />
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
