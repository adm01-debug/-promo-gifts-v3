
Onda 9 já foi proposta e aprovada anteriormente. Reapresento de forma enxuta para execução imediata na próxima passagem em modo default.

# Onda 9 — Operacionalização do Connections Hub (3 itens)

## 1. Migração: retry + cleanup de webhooks
- Função `retry_failed_webhook_deliveries()` SECURITY DEFINER → re-invoca `webhook-dispatcher` via `extensions.http_post` para entregas com `success=false` e `attempt < max_attempts` da última hora.
- Função `cleanup_webhook_logs()` → apaga `webhook_deliveries` e `inbound_webhook_events` > 90 dias.
- 2 cron jobs: `webhook-retry-failed` (`*/10 * * * *`) e `webhook-logs-cleanup-daily` (`30 3 * * *`, sem conflito com hardening 04:00/04:05).

## 2. Componente `IntegrationsHealthCard.tsx`
Card read-only no topo de `/admin/conexoes` com auto-refresh 60s mostrando:
- Webhooks ativos (count de `outbound_webhooks` where `active=true`)
- Taxa de sucesso 24h (de `webhook_deliveries`)
- Última entrega bem-sucedida
- Conexões com `last_test_ok=false` (de `external_connections`)
- Chaves MCP usadas nas últimas 24h (de `mcp_api_keys.last_used_at`)

Layout: usa `KpiCard` existente em grid de 5 colunas, badges semânticos (verde/amarelo/vermelho).

## 3. Integração na página
Montar `<IntegrationsHealthCard />` em `AdminConexoesPage.tsx` logo abaixo do header e acima das `Tabs`.

## Arquivos
- **Novos**: `src/components/admin/connections/IntegrationsHealthCard.tsx`, `supabase/migrations/<ts>_webhook_retry_and_cleanup.sql`.
- **Modificados**: `src/pages/admin/AdminConexoesPage.tsx`.

Ordem de execução: migração → componente → integração na página.
