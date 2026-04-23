---
name: connections-hub
description: Hub central /admin/conexoes — 5 abas, 7 tabelas, 6 edge functions (incluindo health-check cron 15min), crons, health card, auditoria, rotação de secrets, replay, circuit breaker, timeline por conexão, dashboard inbound, catálogo de eventos SSOT, exportação CSV/JSON, playground de testes
type: feature
---

# Connections Hub — `/admin/conexoes`

## Abas (5)
Bancos · Bitrix24 · n8n · MCP · Webhooks (sub-abas: Saída + **Playground** / Entrada / Eventos recebidos / Entregas falhas).

## Tabelas (7)
`external_connections` (+ `auto_test_enabled` toggle por conexão), `outbound_webhooks` (+ `consecutive_failures`, `auto_disabled_at`, `auto_disabled_reason`), `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`, `secret_rotation_log`, `connection_test_history` (retenção automática 200/conexão via trigger).

## Edge functions (6)
`secrets-manager` · `connection-tester` (+ grava `connection_test_history`) · `webhook-dispatcher` (+ replay + circuit breaker + **`test_mode`**) · `webhook-inbound` · `mcp-server` · **`connections-health-check`** (cron `*/15 * * * *`, dedupe 4h via `workspace_notifications.metadata.incident_key`).

## Onda 11 — hardening
- Rotação versionada (`SecretField` + `secret_rotation_log`)
- Replay manual (`FailedDeliveriesPanel`)
- Circuit breaker (`active=false` após 5 falhas seguidas)
- Health card com alertas para staleSecrets/autoDisabled

## Onda 12 — observabilidade & DX
- `ConnectionTimelineDrawer` (sparkline 7d + top 5 erros)
- `InboundEventsPanel` (KPIs + barras stacked + JSON viewer)
- `EventsMultiSelect` (catálogo SSOT em `webhook-events-catalog.ts`, 16 eventos)

## Onda 13 — classe enterprise (10/10 ⇒ 11/10)
- **#7 Notificações proativas**: edge `connections-health-check` + cron 15min insere `workspace_notifications` (categoria `integrations`) para webhooks auto-desabilitados, secrets >90d e conexões caídas na última hora. Dedupe 4h por `incident_key`.
- **#8 Exportação**: componente `ExportButton` reusável (CSV + JSON, sem deps extras — usa `trends-export.ts`). Aplicado em Timeline, Inbound events e Failed deliveries.
- **#9 Playground**: `WebhookPlaygroundPanel` na sub-aba "Saída" com seleção de webhook + evento do catálogo, payload de exemplo editável (`webhook-events-payload-samples.ts` com 16 amostras), disparo via `webhook-dispatcher` em `test_mode=true` (não conta `consecutive_failures`, não persiste em `webhook_deliveries`, não aciona breaker).

## Crons
- `webhook-retry-failed` `*/10 * * * *`
- `connections-health-check` `*/15 * * * *` (Onda 13)
- `webhook-logs-cleanup-daily` `30 3 * * *`
