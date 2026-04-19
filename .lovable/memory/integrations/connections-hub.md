---
name: connections-hub
description: Hub central /admin/conexoes — 5 abas, 7 tabelas, 5 edge functions, crons, health card, auditoria, rotação de secrets, replay, circuit breaker, timeline por conexão, dashboard inbound, catálogo de eventos SSOT
type: feature
---

# Connections Hub — `/admin/conexoes`

## Abas (5)
Bancos · Bitrix24 · n8n · MCP · Webhooks (sub-abas: Saída / Entrada / **Eventos recebidos** / Entregas falhas).

## Tabelas (7)
`external_connections`, `outbound_webhooks` (+ `consecutive_failures`, `auto_disabled_at`, `auto_disabled_reason`), `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`, `secret_rotation_log`, **`connection_test_history`** (retenção automática 200/conexão via trigger).

## Edge functions (5)
`secrets-manager` (list/set/delete/rotate/rotation_history), `connection-tester` (+ grava `connection_test_history`), `webhook-dispatcher` (+ replay + circuit breaker 5 falhas), `webhook-inbound`, `mcp-server`.

## Onda 11 — hardening
- Rotação de secrets versionada (`SecretField` + `secret_rotation_log`)
- Replay manual de entregas falhas (`FailedDeliveriesPanel`)
- Circuit breaker (`active=false` após 5 falhas seguidas, botão "Reativar")
- Health card: alertas para `staleSecrets >90d` e `autoDisabledWebhooks > 0`

## Onda 12 — observabilidade & DX (10/10)
- **#4 Timeline por conexão**: `ConnectionTimelineDrawer` (Sheet) com sparkline `recharts` 7d, tabela paginada 50 testes, top 5 erros agrupados; botão "Histórico" em todas as abas (Bancos, Bitrix24, n8n).
- **#5 Dashboard inbound**: `InboundEventsPanel` (sub-aba "Eventos recebidos"): KPIs 7d (total, % HMAC inválido com tons de alerta, % não processados), gráfico de barras stacked por endpoint, tabela paginada com filtros (período/endpoint/inválidos/não processados), drawer com payload JSON pretty-print.
- **#6 Editor visual de eventos**: catálogo SSOT em `src/lib/webhook-events-catalog.ts` (4 grupos: quote/order/discount/kit, 16 eventos), componente `EventsMultiSelect` substitui input livre — multi-select agrupado, busca, "todos do grupo", chips warning para legacy.

## Crons
- `webhook-retry-failed` `*/10 * * * *`
- `webhook-logs-cleanup-daily` `30 3 * * *`
