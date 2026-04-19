
Vou propor uma seção `/admin/conexoes` no painel admin que centraliza TODAS as integrações externas do sistema. Análise rápida do que já existe: 3 ambientes Supabase (Local, Catálogo Promobrind, CRM), Bitrix24 (sync de orçamentos via SalesPro/Bitrix), edge functions `external-db-bridge`, `crm-db-bridge`, `quote-public-view`. Não há gestão centralizada de credenciais nem webhooks de saída.

# Plano: Seção "Conexões" no Admin (5 abas)

## Arquitetura
Nova rota `/admin/conexoes` (AdminRoute), entrada na sidebar admin (`Plug` icon, abaixo de "Acesso & Bots"). Página com 5 abas tab-controlled. Toda escrita de credencial vai para Supabase Secrets via edge function admin-only `secrets-manager` (read masked / write / delete / rotate). Nenhum secret é exposto ao frontend — apenas status (configurado/vazio + últimos 4 chars).

## Migrações (1 nova)
1. `external_connections` — registry de conexões nomeadas (id, type=`supabase|bitrix24|n8n|mcp|webhook_outbound|webhook_inbound`, name, config jsonb não-secreto, secret_ref text, status, last_test_at, last_test_ok, created_by, timestamps). RLS admin-only.
2. `outbound_webhooks` — destinos (id, name, url, secret_ref, events text[], active, retry_policy jsonb, created_by). RLS admin-only.
3. `webhook_deliveries` — log de entregas (id, webhook_id, event, payload_hash, status_code, response_body_truncated, attempt, delivered_at). RLS admin-only.
4. `inbound_webhook_endpoints` — endpoints de entrada (id, slug único, name, source_system, hmac_secret_ref, allowed_events, active). RLS admin-only.
5. `inbound_webhook_events` — log de eventos recebidos (id, endpoint_id, event_type, payload jsonb, signature_valid, processed, error). RLS admin-only.
6. `mcp_api_keys` — chaves emitidas para MCP/Claude (id, name, key_hash, scopes text[], last_used_at, expires_at, revoked_at, created_by). RLS admin-only.
7. Funções: `dispatch_outbound_webhook(event,payload)`, `verify_inbound_hmac(slug,signature,body)`, `validate_mcp_key(key_plain) returns scopes[]`.

## Edge functions novas
- `secrets-manager` — admin-only (JWT + role check). Actions: `list` (retorna nomes + has_value + masked_suffix), `set`, `delete`, `test`. Whitelist de nomes permitidos por aba.
- `connection-tester` — testa cada tipo: ping Supabase externo (SELECT 1 via service key), ping Bitrix24 (`crm.contact.fields`), ping n8n (GET `/healthz` ou webhook ping), valida MCP key local.
- `webhook-dispatcher` — invoca `outbound_webhooks` ativos, assina payload com HMAC-SHA256, retry 3x backoff, grava em `webhook_deliveries`.
- `webhook-inbound/[slug]` — recebe POST, valida HMAC, grava em `inbound_webhook_events`, dispara handler conforme `source_system`.
- `mcp-server` (verify_jwt=false, autentica via header `X-MCP-Key`) — implementa MCP via mcp-lite (Hono + StreamableHttpTransport) expondo tools: `list_quotes`, `get_quote`, `list_products`, `search_products`, `create_quote_draft`, `list_companies`. Cada tool valida scope da key.

## UI — 5 abas

### Aba 1: "Bancos de Dados" (Supabase)
3 cards (Local, Catálogo Promobrind, CRM Promobrind) cada um com:
- Status (verde/amarelo/vermelho) + último teste
- Campos: URL (read-only para Local, editável para os outros), `anon_key` (masked), `service_role_key` (masked, set/rotate)
- Botões: "Testar conexão", "Atualizar credenciais", "Ver schema" (linka para `/admin/external-db-inspect` que já existe)

### Aba 2: "Bitrix24"
- Webhook URL (input), User ID, Token, Domain
- Mapeamento de campos (jsonb editor): UF_CRM_* para markup, desconto real, quote_number
- Toggle: "Sync automático em aprovação", "Sync de status reverso"
- Botão "Testar" (chama `crm.contact.fields`), "Forçar resync de N orçamentos pendentes"
- Histórico das últimas 20 syncs (lê de `admin_audit_log` com action LIKE `bitrix_%`)

### Aba 3: "n8n"
- Base URL da instância n8n
- API Key (masked)
- Lista editável de "Workflows registrados" (name, webhook_url, trigger_event do nosso lado)
- Cada workflow vira automaticamente um destino em `outbound_webhooks`
- Botão "Testar webhook" (envia payload de exemplo)

### Aba 4: "MCP (Claude / Lovable)"
- Endpoint público do MCP server: `https://<project>.supabase.co/functions/v1/mcp-server` (copy button)
- Lista de chaves emitidas com: name, scopes (multi-select de tools), last_used, expires, ações (revogar)
- Botão "Gerar nova chave" → modal com nome + scopes → mostra a chave UMA VEZ (depois só hash)
- Snippet pronto para colar em `claude_desktop_config.json` e em outro projeto Lovable
- Documentação inline das tools disponíveis

### Aba 5: "Webhooks"
**Sub-aba "Saída" (outbound):**
- Lista de webhooks: name, url, events (chips), status, sucessos/falhas últimas 24h
- CRUD com modal: name, url, events (checklist: `quote.created`, `quote.approved`, `quote.rejected`, `order.created`, `kit.shared`, `discount.requested`, `discount.approved`)
- Cada webhook tem secret HMAC auto-gerado (mostrado uma vez)
- Histórico de entregas paginado (filtro por status_code, retry attempts)

**Sub-aba "Entrada" (inbound):**
- Endpoints com slug auto-gerado: `https://<project>.supabase.co/functions/v1/webhook-inbound/<slug>`
- HMAC secret obrigatório (rotacionável)
- Source system (free text), eventos esperados
- Log de eventos recebidos (payload preview, validação HMAC, processamento)

## Hooks de disparo (em código existente)
Adicionar chamada a `webhook-dispatcher` em pontos-chave:
- `quotes` trigger AFTER INSERT/UPDATE → pg_net call para `webhook-dispatcher` com event `quote.*`
- `orders` AFTER INSERT → `order.created`
- `discount_approval_requests` AFTER INSERT/UPDATE → `discount.*`
- `kit_share_tokens` AFTER INSERT → `kit.shared`

## Arquivos
**Novos**:
- `src/pages/admin/AdminConexoesPage.tsx`
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`
- `src/components/admin/connections/Bitrix24Tab.tsx`
- `src/components/admin/connections/N8nTab.tsx`
- `src/components/admin/connections/McpTab.tsx`
- `src/components/admin/connections/WebhooksTab.tsx`
- `src/components/admin/connections/WebhookDeliveryLog.tsx`
- `src/components/admin/connections/InboundWebhookList.tsx`
- `src/components/admin/connections/ConnectionStatusBadge.tsx`
- `src/components/admin/connections/SecretField.tsx` (input masked com set/rotate/clear)
- `src/hooks/useConnections.ts`, `useSecretsManager.ts`, `useWebhooks.ts`, `useMcpKeys.ts`
- `supabase/functions/secrets-manager/index.ts`
- `supabase/functions/connection-tester/index.ts`
- `supabase/functions/webhook-dispatcher/index.ts`
- `supabase/functions/webhook-inbound/index.ts` (roteia por slug)
- `supabase/functions/mcp-server/index.ts` + `deno.json` (mcp-lite)
- `supabase/migrations/<ts>_external_connections_and_webhooks.sql`

**Modificados**:
- `src/App.tsx` (rota nova)
- `src/components/layout/AppSidebar.tsx` (item "Conexões" no grupo Admin)
- `supabase/config.toml` (verify_jwt=false só para `webhook-inbound` e `mcp-server`)
- `.lovable/memory/index.md` + nova memória `mem://integrations/connections-hub`

Após aprovação, executo na ordem: migração → secrets-manager → connection-tester → UI das 5 abas → webhook-dispatcher + triggers → webhook-inbound → mcp-server → sidebar/rota → memória.
