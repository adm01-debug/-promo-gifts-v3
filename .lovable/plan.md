

## Timeout configurável por tipo de conexão no backend do tester

### Objetivo
Hoje o `connection-tester` usa um timeout fixo (~10s) para todas as conexões. Tipos diferentes têm latências diferentes (ex.: webhooks externos podem ser lentos, MCP local é instantâneo). Vamos:
1. Definir timeouts padrão **por tipo** no edge function.
2. Permitir override via `body.timeout_ms` (com clamp seguro).
3. Quando ocorrer `AbortError`, devolver `error_kind: "timeout"` com o **timeout efetivo aplicado** dentro da resposta para a UI exibir.

### Onde está hoje
- Edge: `supabase/functions/connection-tester/index.ts` (entrypoint)
- Lógica compartilhada: `supabase/functions/_shared/connection-test-runner.ts` (recebe `timeoutMs`)
- Cron usa `PER_TEST_TIMEOUT_MS = 8000` em `connections-auto-test/index.ts`
- Hook UI: `src/hooks/useConnectionTester.ts` envia `body: { action, type, config, connection_id, env_key }` (sem timeout)
- Tipo `TestResult` em `useConnectionTester.ts` não tem `timeout_ms`

### O que será criado

**`supabase/functions/_shared/connection-timeouts.ts`** (novo, ~25 linhas)
SSOT compartilhado entre `connection-tester` e `connections-auto-test`:

```ts
export const DEFAULT_TIMEOUTS_MS: Record<ConnectionType, number> = {
  supabase: 6000,          // PostgREST local, deve ser rápido
  bitrix24: 12000,         // CRM externo, pode ter lag
  n8n: 10000,              // automação, médio
  mcp: 8000,               // chamada interna
  webhook_outbound: 15000, // webhooks externos arbitrários
};
export const MIN_TIMEOUT_MS = 1000;
export const MAX_TIMEOUT_MS = 30000;
export function resolveTimeout(type: ConnectionType, override?: number | null): number {
  const base = DEFAULT_TIMEOUTS_MS[type] ?? 10000;
  if (override == null) return base;
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, override));
}
```

### O que será alterado

**`supabase/functions/connection-tester/index.ts`**
- Importa `resolveTimeout` + `DEFAULT_TIMEOUTS_MS`.
- Adiciona `timeout_ms?: number` ao Zod schema de `action: "test"` com `.int().min(1000).max(30000).optional()`.
- Calcula `effectiveTimeout = resolveTimeout(type, body.timeout_ms)` e passa para `runConnectionTest({ timeoutMs: effectiveTimeout })`.
- No retorno (sucesso ou falha), inclui `timeout_ms: effectiveTimeout` no objeto `result`.

**`supabase/functions/_shared/connection-test-runner.ts`**
- Em cada caso (`supabase`, `bitrix24`, `n8n`, `mcp`, `webhook_outbound`), o `AbortController` já existe. Quando o catch detecta `err.name === "AbortError"`, hoje devolve `{ ok:false, error_kind:"timeout", error: "timeout" }`. Vamos enriquecer:
  - `error: \`timeout após ${timeoutMs}ms\``
  - `timeout_ms: timeoutMs` no objeto retornado
- Adicionar `timeout_ms?: number` ao tipo `TestRunResult` (ou equivalente).

**`supabase/functions/connections-auto-test/index.ts`**
- Substitui `PER_TEST_TIMEOUT_MS = 8000` por `resolveTimeout(conn.type as ConnectionType)` por conexão.
- Continua passando `timeoutMs` para o runner.

**`src/hooks/useConnectionTester.ts`**
- Adiciona `timeout_ms?: number` à interface `TestResult` e propaga no `normalized`.
- Na descrição do toast de timeout, se `result.timeout_ms` existir, anexa `(${ms}ms)` à hint.

**`src/lib/connection-error-copy.ts`**
- Para `kind: "timeout"`, aceita opcionalmente o `timeout_ms` via novo argumento opcional na função (ou via `fallbackMessage`) e renderiza: `"O endpoint não respondeu em N ms. Verifique se o serviço está ativo."`. Mantém retro-compat (sem `timeout_ms` usa o texto atual).

**`src/components/admin/connections/ConnectionTestDetailsDialog.tsx`** + **`LastTestLine.tsx`**
- Quando `error_kind === "timeout"` e `timeout_ms` presente, exibe badge extra `timeout: 12000ms` ao lado dos badges `kind` / `HTTP`.

### Detalhes técnicos
- **Sem migração de DB**: a coluna `connection_test_history` não precisa armazenar o timeout (já temos `latency_ms`); o valor é apenas informativo na resposta + UI. Se quiser persistir depois, é adendo trivial.
- **Backwards compat**: requests sem `timeout_ms` continuam funcionando (usa default por tipo). Resposta sem `timeout_ms` (versões antigas) continua válida no UI (campo opcional).
- **Validação**: clamp em `[1000, 30000]ms` evita abuso (timeout de 5min trava worker).
- **Cron**: passa a respeitar timeouts realistas por tipo, evitando matar webhooks lentos prematuramente.
- **Logs**: o objeto JSON estruturado de `auto-test` ganha `timeout_ms` para auditoria.

### Resultado visual (timeout no UI)

Antes:
```
✗ Tempo esgotado · há 1min
O endpoint não respondeu em tempo. Verifique se o serviço está ativo.
HTTP - · timeout
```

Depois:
```
✗ Tempo esgotado · há 1min
O endpoint não respondeu em 12000ms. Verifique se o serviço está ativo.
[kind: timeout] [timeout: 12000ms]
```

