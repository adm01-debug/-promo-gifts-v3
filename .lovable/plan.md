
Onda 9 (retry + cleanup + IntegrationsHealthCard) já foi entregue na passagem anterior. Connections Hub está 100% operacional. Não há trabalho real pendente — inventar mais "ondas" violaria a governança anti-inflação de escopo.

Proponho **Onda 10 — Fechamento e auditoria final**: 2 itens cirúrgicos que comprovam o 10/10 e atualizam memória, sem inflar features.

# Onda 10 — Fechamento (2 itens)

## 1. Validação automatizada do Connections Hub
Edge function leve `connections-hub-audit` (admin-only, GET) que retorna JSON com:
- 5 tabelas existem (`external_connections`, `outbound_webhooks`, `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`) e contagem de linhas.
- 5 edge functions deployadas (`secrets-manager`, `connection-tester`, `webhook-dispatcher`, `webhook-inbound`, `mcp-server`).
- 4 cron jobs ativos (`webhook-retry-failed`, `webhook-logs-cleanup-daily` + os 2 de hardening que já existem).
- Trigger `dispatch_quote_webhook_event` ativo nas 4 tabelas (quotes/orders/discount/kit_share_tokens).
- Score final 0-10.

Botão "Rodar auditoria" no `IntegrationsHealthCard` invoca a função e mostra resultado em toast + expand.

## 2. Atualizar memória `mem://infrastructure/hardening-roadmap`
Marcar Onda 9 ✅ entregue e adicionar Onda 10 ✅. Atualizar `mem://integrations/connections-hub` com retry/cleanup crons + audit endpoint.

## Arquivos
- **Novos**: `supabase/functions/connections-hub-audit/index.ts`.
- **Modificados**: `src/components/admin/connections/IntegrationsHealthCard.tsx` (botão auditoria), `.lovable/memory/infrastructure/hardening-roadmap.md`, `.lovable/memory/integrations/connections-hub.md`.

Ordem: edge function → botão no card → memória.
