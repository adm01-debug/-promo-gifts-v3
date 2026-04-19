
Connections Hub está 100% entregue (rota, sidebar, 5 abas, edge functions, memória). Não há trabalho pendente das ondas 1-8 nem do hub. Inventar mais "ondas" sem necessidade real seria inflar escopo — proibido pela governança.

Proponho **Onda 9 — Operacionalização do Connections Hub**: 3 itens pequenos que tornam o que já foi construído realmente útil em produção, em vez de criar features novas.

# Plano: Onda 9 — Operacionalização (3 itens)

## 1. Cron de retry para webhooks falhados
Função `retry_failed_webhook_deliveries()` SECURITY DEFINER que pega entregas em `webhook_deliveries` com `success=false` e `attempt < max_attempts` da última hora, e re-invoca `webhook-dispatcher` via `pg_net`. Cron a cada 10 min. Evita perda silenciosa quando o destino estava fora.

## 2. Limpeza automática de logs de webhook (90 dias)
Função `cleanup_webhook_logs()` apaga `webhook_deliveries` e `inbound_webhook_events` com mais de 90 dias. Cron diário 03:30 UTC (não conflita com cron de hardening 04:00/04:05). Mantém tabelas leves.

## 3. Card "Saúde das Integrações" no AdminConexoesPage
Componente `IntegrationsHealthCard.tsx` no topo da página `/admin/conexoes` mostrando: total de webhooks ativos, taxa de sucesso 24h (de `webhook_deliveries`), última entrega, conexões com `last_test_ok=false`, chaves MCP usadas nas últimas 24h. Read-only, atualiza a cada 60s.

## Arquivos
- **Novos**: `src/components/admin/connections/IntegrationsHealthCard.tsx`, `supabase/migrations/<ts>_webhook_retry_and_cleanup.sql`.
- **Modificados**: `src/pages/admin/AdminConexoesPage.tsx` (montar card no topo).

Após aprovação executo na ordem: migração (função retry + função cleanup + 2 crons) → componente de saúde → integração na página.
