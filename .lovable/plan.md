

# Timeout configurável + categorização de erros (timeout / network / http)

## Diagnóstico

Em `_shared/connection-test-runner.ts`:
- Já existe `withTimeout(ms)` com `AbortController` e default `timeoutMs: 8000`.
- Quando aborta, captura `AbortError` e retorna `error: "Timeout após 8000ms"` — mas a UI vê só uma string solta, sem categoria.
- **Network errors** (ex: `TypeError: failed to fetch`, DNS, ECONNREFUSED) caem no `catch` genérico e viram `result.error = err.message` sem distinção visual.
- **HTTP errors** (4xx/5xx) retornam `ok: false` mas com `status` preenchido — UI já distingue, mas mensagem é só `HTTP 500`.
- O timeout é fixo em 8s para todos os tipos (Bitrix REST, n8n /healthz, Supabase /rest/v1/, webhook arbitrário) — alguns provedores legitimamente demoram mais.

A UI (`ConnectionErrorDetailsDialog`, `LastTestLine`) já tem `suggestionFor()` que adivinha categoria via regex no texto. Frágil — depende da string do erro vir num idioma/formato específico.

## Solução

### 1. Backend: categoria estruturada `error_kind`

Adicionar ao `RunResult` um campo discriminado:

```ts
export type ErrorKind = "timeout" | "network" | "dns" | "http" | "auth" | "config" | "unknown";

export interface RunResult {
  ok: boolean;
  status?: number;
  latency_ms?: number;
  error?: string;        // mensagem human-readable em PT-BR
  error_kind?: ErrorKind; // NOVO — categoria estruturada
  message?: string;
  tested_at: string;
  connection_id?: string;
}
```

Lógica de classificação no catch genérico de `runConnectionTest`:

```ts
function classifyError(err: unknown, status: number | undefined): { kind: ErrorKind; message: string } {
  if (err instanceof Error && err.name === "AbortError") {
    return { kind: "timeout", message: `Timeout após ${timeoutMs}ms — o serviço não respondeu a tempo` };
  }
  const m = err instanceof Error ? err.message : String(err);
  const lower = m.toLowerCase();
  if (lower.includes("dns") || lower.includes("getaddrinfo") || lower.includes("enotfound")) {
    return { kind: "dns", message: "DNS não resolvido — verifique a URL configurada" };
  }
  if (lower.includes("econnrefused") || lower.includes("failed to fetch") || lower.includes("network")) {
    return { kind: "network", message: "Falha de rede — serviço inalcançável (offline ou bloqueado)" };
  }
  if (status === 401 || status === 403) {
    return { kind: "auth", message: `Credenciais rejeitadas (HTTP ${status})` };
  }
  if (status && status >= 400) {
    return { kind: "http", message: `HTTP ${status} retornado pelo serviço` };
  }
  if (lower.includes("ausente") || lower.includes("missing")) {
    return { kind: "config", message: m };
  }
  return { kind: "unknown", message: m };
}
```

Aplicado também no caminho de sucesso quando `res.ok === false` (HTTP erro), gerando mensagem útil em vez de só `HTTP 500`.

### 2. Backend: timeout configurável por tipo (com defaults sãos)

Tabela de defaults em `connection-test-runner.ts`:

```ts
const DEFAULT_TIMEOUTS_MS: Record<ConnectionType, number> = {
  supabase: 5000,        // /rest/v1/ é instantâneo
  bitrix24: 10000,       // REST do Bitrix pode demorar
  n8n: 6000,             // /healthz é leve
  mcp: 3000,             // só checa DB local
  webhook_outbound: 8000, // arbitrário
};
```

Override por request: `BodySchema` aceita `timeout_ms: z.number().int().min(1000).max(30000).optional()`. Frontend pode passar custom; senão usa default por tipo.

`runConnectionTest` resolve: `opts.timeoutMs ?? DEFAULT_TIMEOUTS_MS[type] ?? 8000`.

### 3. Backend: persistir `error_kind` no histórico

Adicionar coluna `error_kind text` em `connection_test_history` (migration). Update do `insert` para incluir o campo. Coluna nova é nullable, backward-compatible com rows antigas.

`external_connections.last_test_message` continua texto (não precisa coluna nova) — categoria fica só no histórico para análise futura.

### 4. Frontend: respeitar `error_kind` em vez de regex frágil

`useConnectionTester.ts`:
- `TestResult` ganha `error_kind?: ErrorKind` opcional.
- Toast usa mensagem mais clara baseada no kind:
  - `timeout` → "Tempo esgotado" (8s)
  - `network` → "Sem conexão com o serviço"
  - `dns` → "URL não encontrada"
  - `auth` → "Credenciais rejeitadas"
  - `http` → "Serviço retornou erro"
  - `config` → "Configuração incompleta"
  - default → mantém mensagem do servidor

`LastTestInfo` (em `LastTestLine.tsx`) ganha `error_kind?: ErrorKind`.

`ConnectionErrorDetailsDialog`:
- Substitui o regex de `suggestionFor()` por lookup direto no `error_kind`:
  ```ts
  const SUGGESTIONS: Record<ErrorKind, string> = {
    timeout: "Aumente o timeout ou verifique se o serviço está sobrecarregado.",
    network: "O serviço pode estar offline ou bloqueando o IP da função.",
    dns: "DNS não resolvido — verifique a URL configurada.",
    auth: "Verifique se as credenciais estão corretas e não expiraram.",
    http: "Serviço externo retornou erro — verifique logs do destino.",
    config: "Configure as credenciais necessárias antes de testar.",
    unknown: null as never,
  };
  ```
- Adiciona badge visual da categoria no header do dialog ao lado do tipo da conexão:
  ```
  ✗ Detalhes da falha   [Bitrix24]   [⏱ Timeout]
  ```
  Cores por kind: timeout=âmbar, network/dns=vermelho, auth=laranja, http=destructive, config=muted.

Mantém fallback regex para rows antigas sem `error_kind`.

### 5. Frontend: campo "Timeout (ms)" opcional no card (avançado)

**Não** adicionar input visível no MVP. O default por tipo já cobre 95% dos casos. Se algum tipo precisar override, fica para próxima iteração com `<Collapsible>` "Configurações avançadas" no `*Tab`. Decisão: out of scope.

### 6. Logs estruturados no `connections-auto-test`

Já loga `error: r.error`. Adicionar `error_kind: r.error_kind` no objeto JSON de log para alertas/dashboards futuros distinguirem timeouts de falhas reais.

### 7. Estado visual

```text
Antes:
✗ Falhou há 2min — Timeout após 8000ms                [↻ Testar novamente]

Depois (timeout):
✗ Falhou há 2min — Tempo esgotado (8s)                 [↻ Testar novamente]
   ↑ clique abre dialog com badge [⏱ Timeout]

Depois (DNS):
✗ Falhou há 2min — URL não encontrada                  [↻ Testar novamente]
   ↑ clique abre dialog com badge [🌐 DNS]

Depois (auth):
✗ Falhou há 2min — Credenciais rejeitadas (HTTP 401)   [↻ Testar novamente]
   ↑ clique abre dialog com badge [🔑 Auth]
```

## Arquivos tocados

**Backend (editados)**
- `supabase/functions/_shared/connection-test-runner.ts`:
  - Tipo `ErrorKind` exportado.
  - Função `classifyError()` interna.
  - `DEFAULT_TIMEOUTS_MS` por tipo.
  - `runConnectionTest` propaga `error_kind` no `RunResult`, persiste no `connection_test_history` insert, propaga em `last_test_message` mantendo string mas com mensagem categorizada.
- `supabase/functions/connection-tester/index.ts`:
  - `BodySchema` aceita `timeout_ms` opcional.
  - Response inclui `error_kind` no objeto `result`.
  - Action `last_test` e `test_history` propagam `error_kind` quando disponível.
- `supabase/functions/connections-auto-test/index.ts`:
  - Log JSON inclui `error_kind`.

**Database (migration)**
- `connection_test_history` ganha coluna `error_kind text` nullable.

**Frontend (editados)**
- `src/hooks/useConnectionTester.ts`: `TestResult` ganha `error_kind?`; toast usa mapeamento por kind.
- `src/components/admin/connections/LastTestLine.tsx`: `LastTestInfo` ganha `error_kind?`.
- `src/components/admin/connections/ConnectionErrorDetailsDialog.tsx`:
  - `SUGGESTIONS` map por `error_kind`.
  - Badge categórico no header.
  - Mantém `suggestionFor()` regex como fallback para rows antigas.
- `src/components/admin/connections/Bitrix24Tab.tsx`, `N8nTab.tsx`, `SupabaseConnectionsTab.tsx`: propagar `r.error_kind` ao montar `LastTestInfo` no `setLast(...)`.

## Fora de escopo

- UI para customizar timeout por conexão (fica para depois — defaults por tipo cobrem 95%).
- Retry com backoff dentro do tester (1 tentativa só; histórico mostra padrões).
- Alertas proativos por categoria (ex: "3 timeouts seguidos") — pertence ao `connections-health-check`.
- Não muda `webhook-dispatcher` nem `mcp-server` (têm seus próprios timeouts).
- Não migra rows antigas de `connection_test_history` — `error_kind` fica `null` para histórico anterior.

