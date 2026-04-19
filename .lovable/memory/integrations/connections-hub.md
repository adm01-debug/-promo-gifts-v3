---
name: connections-hub
description: Hub central /admin/conexoes com 5 abas (Bancos, Bitrix24, n8n, MCP, Webhooks), edge functions, crons operacionais, card de saúde e endpoint de auditoria
type: feature
---

# Connections Hub — `/admin/conexoes`

## Abas (5)
Bancos de Dados · Bitrix24 · n8n · MCP (Claude) · Webhooks.

## Tabelas (6)
`external_connections`, `outbound_webhooks`, `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`.

## Edge functions (5)
`secrets-manager`, `connection-tester`, `webhook-dispatcher`, `webhook-inbound`, `mcp-server`.

## Triggers
`dispatch_quote_webhook_event` em `quotes`, `orders`, `discount_approval_requests`, `kit_share_tokens` — usa `extensions.http_post` (nunca quebra transação principal).

## HMAC
SHA-256 sobre payload JSON, header `X-Signature: sha256=<hex>` em outbound + validação em inbound.

## Operação automatizada (Onda 8)
- `retry_failed_webhook_deliveries()` SECURITY DEFINER → re-invoca `webhook-dispatcher` para entregas com `success=false` e `attempt < max_attempts` da última hora.
- `cleanup_webhook_logs()` → apaga `webhook_deliveries` e `inbound_webhook_events` > 90 dias.
- Crons:
  - `webhook-retry-failed` — `*/10 * * * *`
  - `webhook-logs-cleanup-daily` — `30 3 * * *`

## UI de saúde (Onda 9)
`<IntegrationsHealthCard />` montado no topo de `/admin/conexoes`:
- 5 KPIs: webhooks ativos, taxa sucesso 24h, última entrega, conexões com falha, MCP keys 24h.
- Auto-refresh 60s via `useQuery`.
- Botão "Rodar auditoria" → invoca `connections-hub-audit` e exibe score em toast.

## Auditoria (Onda 10)
- Endpoint: `GET /functions/v1/connections-hub-audit` (admin Bearer)
- Verifica: 6 tabelas, 5 edge functions, 2 crons do hub, 4 triggers
- Retorna JSON `{ score: 0-10, passed, total, checks: {...} }`
