import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useConnectionTester } from "@/hooks/useConnectionTester";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";
import { LastTestLine, type LastTestInfo } from "./LastTestLine";
import { ConnectionTestHistoryPanel } from "./ConnectionTestHistoryPanel";
import { RetestButton } from "./RetestButton";
import { hasSuspiciousLength } from "./secretValidators";

export function Bitrix24Tab() {
  const { secrets, list } = useSecretsManager();
  const { test, isTesting, fetchLastTest } = useConnectionTester();
  const [last, setLast] = useState<LastTestInfo | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => { list(); }, [list]);

  const hydrate = useCallback(async () => {
    const r = await fetchLastTest("bitrix24");
    setLast(r ? { ok: r.ok, tested_at: r.tested_at, latency_ms: r.latency_ms, message: r.message } : null);
  }, [fetchLastTest]);
  useEffect(() => { hydrate(); }, [hydrate]);

  const get = (n: string) => secrets.find((s) => s.name === n);
  const wh = get("BITRIX24_WEBHOOK_URL");
  const credsOk = !!wh?.has_value;
  const suspicious = hasSuspiciousLength(secrets, ["BITRIX24_WEBHOOK_URL"]);
  const credsLooksValid = credsOk && !suspicious;
  const status: "active" | "error" | "unconfigured" = !credsOk
    ? "unconfigured"
    : last?.ok === false ? "error" : "active";

  const onTest = async () => {
    const r = await test("bitrix24");
    setLast({ ok: r.ok, tested_at: r.tested_at ?? new Date().toISOString(), latency_ms: r.latency_ms, message: r.error ?? r.message, status: r.status });
    setHistoryKey((k) => k + 1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>Bitrix24</CardTitle>
          </div>
          <ConnectionStatusBadge status={status} />
        </div>
        <CardDescription>
          Sincronização automática de orçamentos e contatos com o Bitrix24.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        <SecretField label="Webhook URL completa"
          secretName="BITRIX24_WEBHOOK_URL" status={wh} onSaved={list}
          helperText="Ex: https://seudominio.bitrix24.com.br/rest/1/abc123xyz/" />
        <SecretField label="Domínio Bitrix24"
          secretName="BITRIX24_DOMAIN" status={get("BITRIX24_DOMAIN")} onSaved={list} />
        <SecretField label="User ID" secretName="BITRIX24_USER_ID" status={get("BITRIX24_USER_ID")} onSaved={list} />
        <SecretField label="Token" secretName="BITRIX24_TOKEN" status={get("BITRIX24_TOKEN")} onSaved={list} />
        <div className="pt-2 flex gap-2">
          <Button size="sm" disabled={isTesting || !credsLooksValid}
            title={!credsOk ? "Configure o Webhook URL primeiro"
              : !credsLooksValid ? "Webhook com formato suspeito (comprimento curto) — re-salve antes de testar"
              : "Testar conexão"}
            onClick={onTest}>
            {isTesting ? "Testando…" : "Testar conexão (crm.contact.fields)"}
          </Button>
          <ConnectionTimelineDrawer type="bitrix24" label="Bitrix24" />
        </div>
        <LastTestLine
          info={last}
          action={
            <RetestButton
              onRetest={onTest}
              disabled={!credsLooksValid}
              disabledReason={!credsOk ? "Configure o Webhook URL primeiro" : "Webhook com formato suspeito — re-salve antes de testar"}
            />
          }
        />
        <ConnectionTestHistoryPanel type="bitrix24" label="Bitrix24" refreshKey={historyKey} />
      </CardContent>
    </Card>
  );
}
