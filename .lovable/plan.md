

## Modal de detalhes do último teste por conexão

Adicionar um modal acessível pela linha de mensagem (`LastTestLine`) e pelas linhas da `ConnectionsOverviewTable`, exibindo a **resposta completa** do último teste — não só erros, mas também sucessos com payload, headers, DNS e timing detalhado.

### Comportamento

- Hoje, `LastTestLine` só é clicável quando `ok === false` (abre `ConnectionErrorDetailsDialog`). Passa a ser clicável **sempre que houver `tested_at`**, abrindo um novo `ConnectionTestDetailsDialog` unificado.
- Na `ConnectionsOverviewTable`, a célula de mensagem/última verificação ganha um botão "Ver detalhes" (ícone `Info`) que abre o mesmo modal.
- O modal carrega o registro completo via edge function `connection-tester` (action: `last_test_full` — novo) ou reusa `test_history` com `limit: 1` se já trouxer payload bruto.

### Conteúdo do modal (4 seções)

1. **Resumo** — status (OK/Falha), `tested_at` absoluto + relativo, `triggered_by` (manual/cron/webhook), autor (quando manual).
2. **HTTP** — método, URL (mascarada para webhooks/Bitrix com tokens), status code + classe (2xx/4xx/5xx), `content-type`, tamanho da resposta.
3. **Timing detalhado** — barra empilhada com: `dns_ms`, `tcp_ms`, `tls_ms`, `ttfb_ms`, `download_ms`, total = `latency_ms`. Quando o backend não fornecer breakdown, mostra apenas `latency_ms` total + nota "breakdown indisponível para este tipo de conexão".
4. **Payload bruto** — `<pre>` com JSON da resposta (truncado em 8KB com botão "Expandir"), botão "Copiar resposta", botão "Copiar como cURL" (reconstrói a partir de método+URL+headers seguros).

### Acessibilidade & UX

- Trigger no `LastTestLine`: o `<button>` existente vira sempre clicável (com `aria-label="Ver detalhes do último teste"`); cursor `pointer` quando houver dados.
- Modal usa `Dialog` (`max-w-2xl`), com `Tabs` interno: `Resumo` · `HTTP` · `Timing` · `Resposta`.
- Atalho `Esc` fecha (nativo do Radix), `C` copia payload quando aba "Resposta" ativa.
- Loading skeleton enquanto busca `last_test_full`.

### Backend (edge function `connection-tester`)

- Adicionar action `last_test_full` que retorna o registro completo da tabela de histórico (`connection_test_history` ou similar — confirmar nome no schema), incluindo colunas: `request_method`, `request_url`, `response_status`, `response_headers` (jsonb), `response_body` (text, truncado em 16KB no servidor), `dns_ms`, `tcp_ms`, `tls_ms`, `ttfb_ms`, `download_ms`, `triggered_by`, `triggered_by_user_id`.
- Para conexões sem essas colunas hoje, o backend retorna `null` nos campos faltantes — frontend já lida com isso.
- Se as colunas de timing breakdown ainda não existirem, criar migração adicionando-as (nullable) à tabela de histórico — populadas opcionalmente em testes futuros via `performance.now()` segmentado no `connection-tester`. **Não retroativo.**
- Mascaramento server-side: tokens em `Authorization`, `?auth=`, e segmentos de path do Bitrix (`/rest/<id>/<token>/`) são substituídos por `••••` antes de retornar.

### Arquivos

- **Novo**: `src/components/admin/connections/ConnectionTestDetailsDialog.tsx` — modal com 4 abas, mascaramento client-side defensivo, copy-to-clipboard, cURL builder.
- **Novo**: `src/hooks/useConnectionTestDetails.ts` — fetch via `connection-tester` action `last_test_full`, cache por chave `(type, env_key|connection_id)`, refetch on open.
- **Modificado**: `src/components/admin/connections/LastTestLine.tsx` — `onClick` passa a ser oferecido sempre que houver `tested_at`; remove restrição de `!info.ok`.
- **Modificado**: `src/components/admin/connections/Bitrix24Tab.tsx`, `N8nTab.tsx`, `McpTab.tsx`, `WebhooksTab.tsx`, `SupabaseConnectionsTab.tsx` — substituir `setErrorDialogOpen` por `setDetailsDialogOpen` que abre o novo modal unificado (mantém `ConnectionErrorDetailsDialog` apenas como fallback se `last.ok === false` e quisermos manter ações de troubleshooting; senão deprecia).
- **Modificado**: `src/components/admin/connections/ConnectionsOverviewTable.tsx` — botão `Info` por linha que abre o modal com o `type` + `connection_id` da linha.
- **Modificado**: `supabase/functions/connection-tester/index.ts` — adicionar handler `last_test_full` com mascaramento e truncamento.
- **Migração** (condicional): `ALTER TABLE` de histórico para adicionar `dns_ms int`, `tcp_ms int`, `tls_ms int`, `ttfb_ms int`, `download_ms int`, `response_headers jsonb`, `response_body text` se ainda não existirem. Confirmar nome real da tabela antes de migrar.

### Detalhes técnicos

- Tipo de retorno:
  ```ts
  interface TestDetails {
    id: string;
    tested_at: string;
    ok: boolean;
    triggered_by: "manual" | "cron" | "webhook";
    triggered_by_user_email?: string | null;
    request: { method: string; url: string };
    response: { status: number | null; headers: Record<string,string> | null; body: string | null; truncated: boolean };
    timing: { latency_ms: number; dns_ms: number | null; tcp_ms: number | null; tls_ms: number | null; ttfb_ms: number | null; download_ms: number | null };
    error?: { kind: ErrorKind | null; message: string | null };
  }
  ```
- O modal mantém a key composta `${type}:${env_key ?? connection_id}` para evitar mostrar dados velhos ao alternar entre conexões.
- Mascaramento adicional client-side é defensivo: o servidor já retorna mascarado, mas re-aplica regex sobre `body` exibido.
- Sem alteração em RLS (acesso via edge function autenticada por JWT admin já existente).

