

# Tornar "Testar conexão" 100% funcional com credenciais persistidas

## Diagnóstico

A infraestrutura nova já está no lugar:
- Tabela `integration_credentials` (admin-only RLS) existe
- Helper `_shared/credentials.ts` lê DB → env → cache 60s
- `secrets-manager` persiste de verdade
- `connection-tester` aceita `env_key` e resolve credenciais via helper
- `useConnectionTester` repassa `env_key`

Falta fechar o ciclo de UX no clique do botão **"Testar conexão"**:

1. **Resultado some**: o toast aparece e desaparece. O card não mostra "Última verificação às 14:32 — 142ms" persistente.
2. **`external_connections` não é atualizado**: o tester roda o ping mas não grava `last_test_at`/`last_status`/`last_latency_ms` para os bancos `promobrind`/`crm` (só grava quando há `connection_id` para Bitrix/n8n/MCP/webhook).
3. **Bitrix/n8n/MCP**: o botão "Testar" chama `test("bitrix24")` sem `connection_id`, então o tester não sabe qual conexão pingar e responde erro genérico.
4. **Sem feedback inline**: badge de status do card continua "Sem credenciais" por 1-2s mesmo após salvar (espera o `list()` voltar).

## Solução

### 1. Backend — `connection-tester` grava resultado dos bancos externos

Para `type: "supabase"` com `env_key`, após o ping fazer `upsert` em `external_connections` por `(env_key, type)` com:
- `last_test_at = now()`
- `last_status = 'ok' | 'error'`
- `last_latency_ms`
- `last_error` (quando falha)

Assim o resultado fica persistido e qualquer card pode reler.

### 2. Backend — endpoint auxiliar `last_test`

Adicionar `action: "last_test"` no `connection-tester` (ou novo `connection-status`) que retorna a última verificação por `env_key`/`connection_id`. Usado pelos cards para hidratar "Última verificação há Xm — 142ms".

### 3. Frontend — `SupabaseConnectionsTab`

- Após `test()` retornar, atualizar estado local `lastTestByEnv[env_key] = { ok, latency_ms, ts }` e renderizar abaixo dos botões:
  ```text
  ✓ Última verificação há 3s — 142ms (HTTP 200)
  ```
  ou em vermelho:
  ```text
  ✗ Falhou há 3s — DNS lookup failed
  ```
- Ao montar, chamar o `last_test` para hidratar do banco (sobrevive ao reload).
- Badge de status do card considera `last_status === 'ok'` como `active`, `error` como `error`.

### 4. Frontend — Bitrix/n8n/McpTab

Esses tabs hoje fazem `test("bitrix24")` sem `connection_id`. Ajustar para:
- Buscar a primeira `external_connections` linha de `type='bitrix24'` (ou `n8n`/`mcp`) ativa.
- Se existir → passar `connectionId`; se não → toast "Cadastre a conexão primeiro" + desabilitar botão.
- Mesma UI de "Última verificação" abaixo do botão.

### 5. Frontend — `SecretField` invalida cache do helper

Quando o admin salva uma credencial nova, o helper backend ainda tem 60s de cache. Adicionar `action: "invalidate_cache"` no `secrets-manager` que chama `invalidateCredentialCache(name)` (já exportado em `_shared/credentials.ts`). Disparado automaticamente após `set`/`rotate`.

### 6. Hook `useConnectionTester` — retornar resultado normalizado

Hoje retorna `r` cru. Padronizar para `{ ok, latency_ms, status, error, tested_at }` para o componente consumir sem unwrap manual.

## O que o usuário verá

1. Configura URL + Service Key em **Catálogo Promobrind** → badge vira "Ativo".
2. Clica **"Testar conexão"** → spinner 200ms → toast verde + linha persistente no card:
   ```text
   ✓ Verificado há instantes — 142ms (HTTP 200)
   ```
3. Recarrega a página → a linha continua lá (vem do `external_connections.last_test_at`).
4. Se a credencial estiver errada → badge fica "Erro", linha vermelha mostra `DNS lookup failed` ou `401 Invalid API key`.
5. Mesmo comportamento em **Bitrix24**, **n8n** e **MCP** (com guarda "cadastre a conexão primeiro" se não existe).

## Arquivos tocados

**Backend**
- `supabase/functions/connection-tester/index.ts`: persistir resultado em `external_connections` para `env_key`; novo `action: "last_test"`.
- `supabase/functions/secrets-manager/index.ts`: invalidar cache do helper após `set`/`rotate`/`delete`.
- Migration: garantir colunas `last_test_at timestamptz`, `last_status text`, `last_latency_ms int`, `last_error text` em `external_connections` (adicionar se não existirem) + índice `(env_key)`.

**Frontend**
- `src/hooks/useConnectionTester.ts`: padronizar retorno; expor `lastResult`.
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`: hidratar última verificação ao montar; renderizar linha persistente; badge usa `last_status`.
- `src/components/admin/connections/Bitrix24Tab.tsx`, `N8nTab.tsx`, `McpTab.tsx`: buscar `connection_id` ativo; mostrar última verificação; desabilitar botão quando não há conexão cadastrada.
- `src/components/admin/connections/LastTestLine.tsx` (novo): componente compartilhado `<LastTestLine status latency_ms tested_at error />` com formato relativo (`há 3s`).

## Fora de escopo

- Não vamos enviar notificação por e-mail em falha (próxima onda).
- Não vamos criar gráfico histórico de latência (já existe `connection_test_log` que pode alimentar isso depois).
- Cache TTL continua 60s; quem precisar de leitura imediata usa `invalidate_cache`.

