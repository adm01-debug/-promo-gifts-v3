import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useConnectionTester } from "@/hooks/useConnectionTester";

export function Bitrix24Tab() {
  const { secrets, list } = useSecretsManager();
  const { test, isTesting } = useConnectionTester();
  useEffect(() => { list(); }, [list]);

  const get = (n: string) => secrets.find((s) => s.name === n);
  const wh = get("BITRIX24_WEBHOOK_URL");
  const status = wh?.has_value ? "active" : "unconfigured";

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
        <div className="pt-2">
          <Button size="sm" disabled={isTesting} onClick={() => test("bitrix24")}>
            {isTesting ? "Testando…" : "Testar conexão (crm.contact.fields)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
