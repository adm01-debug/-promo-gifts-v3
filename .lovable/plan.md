

## Persistir `error_kind` no histórico de testes de conexão

### Objetivo
Hoje a tabela `connection_test_history` tem a coluna `error_kind` (text nullable) já no schema, mas precisamos garantir que:
1. O backend **sempre grava** `error_kind` quando há falha (atualmente nem todos os caminhos preenchem).
2. O frontend **lê e exibe** o badge semântico no histórico, com **fallback inteligente** para registros antigos sem `error_kind` (deriva via heurística do `error_message`/`status_code`).

### Onde está hoje

- Schema: `connection_test_history.error_kind text` já existe (visto no types.ts).
- Backend escrita: `connection-tester/index.ts` insere `error_kind: result.error_kind ?? null` ✅. `connections-auto-test/index.ts` precisa verificar se grava.
- Frontend leitura: `useConnectionTestDetails.ts` busca `connection_test_history` e mapeia para `error.kind`. Provável que para registros antigos venha `null`.
- Componente: `ConnectionTestDetailsDialog.tsx` já tem badge colorido por `kind` via `getKindBadgeClass`.
- Histórico de execuções (drawer/lista): provável `ConnectionTestHistorySheet.tsx` ou similar — verificar se exibe kind.

### O que será criado

**`src/lib/error-kind-inference.ts`** (novo, ~40 linhas)
Heurística pura para inferir `error_kind` a partir de `error_message` + `status_code`, usado como fallback no frontend para registros antigos:
```ts
export type ErrorKind = "timeout" | "network" | "dns" | "auth" | "http" | "config" | "unknown";

export function inferErrorKind(opts: {
  errorKind?: string | null;
  errorMessage?: string | null;
  statusCode?: number | null;
  success?: boolean | null;
}): ErrorKind | null {
  if (opts.success) return null;
  if (opts.errorKind) return opts.errorKind as ErrorKind;
  
  const msg = (opts.errorMessage ?? "").toLowerCase();
  if (/timeout|timed?\s?out|abort/.test(msg)) return "timeout";
  if (/dns|enotfound|getaddrinfo/.test(msg)) return "dns";
  if (/network|fetch failed|econnrefused|econnreset/.test(msg)) return "network";
  if (opts.statusCode === 401 || opts.statusCode === 403 || /unauthor|forbidden|invalid.*(token|key|secret)/.test(msg)) return "auth";
  if (opts.statusCode && opts.statusCode >= 400) return "http";
  if (/config|missing.*(url|secret|key)/.test(msg)) return "config";
  return "unknown";
}
```

### O que será alterado

**Backend**

**`supabase/functions/connections-auto-test/index.ts`**
- Verificar se o INSERT em `connection_test_history` inclui `error_kind: testResult.error_kind ?? null`. Se não, adicionar.

**`supabase/functions/connection-tester/index.ts`**
- Já grava ✅. Confirmar via leitura — sem mudança esperada.

**Frontend**

**`src/hooks/useConnectionTestDetails.ts`**
- Importa `inferErrorKind`.
- No mapeamento da última falha (`details.error.kind`), aplicar fallback: `kind: inferErrorKind({ errorKind: row.error_kind, errorMessage: row.error_message, statusCode: row.status_code, success: row.success })`.

**`src/components/admin/connections/ConnectionTestHistorySheet.tsx`** (se existir; senão, no componente que lista o histórico)
- Para cada linha de falha, exibir o badge semântico (mesmo `getKindBadgeClass` + `getKindLabel` já criados), aplicando `inferErrorKind` para registros antigos.
- Se o componente não existir como nome esperado, vou localizar via search no diretório `src/components/admin/connections/`.

**`src/components/admin/connections/LastTestLine.tsx`**
- Já recebe `error_kind` via props. Aplicar `inferErrorKind` se `error_kind` for null mas `success === false`, para mostrar badge correto.

### Detalhes técnicos

- **Sem migração de DB**: a coluna já existe.
- **Backwards compat**: registros antigos com `error_kind = null` recebem inferência heurística no client. Novos registros têm `error_kind` real do backend.
- **SSOT da heurística**: `inferErrorKind` no client. Não duplicar no edge (lá usamos detecção direta com `err.name`/HTTP status no momento do erro, mais preciso).
- **Risk**: heurística por regex em `error_message` é melhor-esforço; se vier mensagem em outro idioma do servidor remoto, pode cair em `unknown` — aceitável.

### Resultado visual

Antes (registro antigo no histórico):
```
✗ HTTP 504 — Gateway Timeout (sem badge)
```

Depois:
```
✗ HTTP 504 — Gateway Timeout  [Timeout]  [HTTP 504]
```

