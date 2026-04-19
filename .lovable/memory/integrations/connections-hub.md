---
name: connections-hub
description: Hub central /admin/conexoes com 5 abas, edge functions, crons, health card, auditoria, rotação de secrets, replay de webhooks falhos e circuit breaker
type: feature
---

# Connections Hub — `/admin/conexoes`

## Abas (5)
Bancos · Bitrix24 · n8n · MCP · Webhooks (sub-abas: Saída / Entrada / **Entregas falhas**).

## Tabelas (7)
`external_connections`, `outbound_webhooks` (+ `consecutive_failures`, `auto_disabled_at`, `auto_disabled_reason`), `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`, **`secret_rotation_log`**.

## Edge functions (5)
`secrets-manager` (list/set/delete/**rotate**/**rotation_history**), `connection-tester`, `webhook-dispatcher` (+ **replay_delivery_id** + **circuit breaker** 5 falhas → `active=false`), `webhook-inbound`, `mcp-server`.

## Hardening Onda 11 (atual)
- **Rotação de secrets**: botão "Rotacionar" em `SecretField`, hook `rotateSecret/getRotationHistory`, log em `secret_rotation_log`.
- **Replay manual**: `FailedDeliveriesPanel` (paginado, filtro por evento, auto-refresh 30s) → `webhook-dispatcher { replay_delivery_id }` re-entrega ignorando `active=false`.
- **Circuit breaker**: 5 falhas consecutivas desativam o webhook automaticamente (`auto_disabled_at/reason`); botão "Reativar" zera o contador. Sucesso reseta `consecutive_failures=0`.
- **Health card**: faixas de alerta para `staleSecrets >90d` e `autoDisabledWebhooks > 0`.

## Crons
- `webhook-retry-failed` `*/10 * * * *`
- `webhook-logs-cleanup-daily` `30 3 * * *`
