

## Plano: Onda 12 — Melhorias #4, #5, #6 do Connections Hub

Status atual: #1 (rotação de secrets), #2 (replay), #3 (circuit breaker) entregues na Onda 11. Restam 3 para 10/10. Execução autônoma sequencial conforme `mem://~user`.

---

### Etapa 1 — Painel de timeline por conexão (#4)

**Migração:** nova tabela `connection_test_history` (`connection_id`, `tested_at`, `success`, `latency_ms`, `status_code`, `error_message`) + RLS admin-only + índice `(connection_id, tested_at desc)` + trigger de retenção (mantém últimos 200 por conexão).

**Edge function:** `connection-tester` insere 1 linha em `connection_test_history` a cada teste, além de atualizar `external_connections.last_test_*` (já faz).

**UI:** novo `ConnectionTimelineDrawer.tsx` (Sheet lateral) com:
- Sparkline `recharts` de `latency_ms` últimos 7 dias
- Tabela paginada dos últimos 50 testes (timestamp / status / latência / erro truncado)
- Card "Top 5 erros agrupados" (group by `error_message`)
- Botão "Histórico" em cada card de conexão (Supabase, Bitrix, n8n, MCP).

---

### Etapa 2 — Dashboard de eventos inbound (#5)

Sem migração — `inbound_webhook_events` já existe.

**UI:** novo `InboundEventsPanel.tsx` adicionado como sub-aba dentro de `WebhooksTab` ("Entrada › Eventos recebidos"):
- KPIs 7d: total, % HMAC inválido (alerta amarelo >5%, vermelho >15%), % não processado
- Gráfico de barras `recharts`: volume/dia por endpoint
- Tabela paginada: `received_at`, endpoint, `event_type`, `signature_valid`, `processed`, `source_ip`
- Drawer ao clicar em linha → JSON pretty-print do `payload`
- Filtros: período (24h/7d/30d), endpoint, só inválidos, só não processados.

---

### Etapa 3 — Editor visual de eventos do webhook outbound (#6)

**Catálogo SSOT:** novo `src/lib/webhook-events-catalog.ts`:
- Quote: created/updated/approved/rejected/expired
- Order: created/approved/fulfilled/cancelled
- Discount: requested/approved/rejected
- Kit: created/shared/viewed

**UI:** novo `<EventsMultiSelect>` substitui input livre no formulário de outbound webhook em `WebhooksTab`:
- Multi-select agrupado por categoria com busca interna
- "Selecionar todos do grupo" por categoria
- Eventos legacy (fora do catálogo) preservados como chips com badge "legacy"

**Memória:** atualizar `mem://integrations/connections-hub` registrando Onda 12 + adicionar 5° linha no `IntegrationsHealthCard` ("Histórico de testes ativo") fechando 10/10.

---

### Sequenciamento

Etapa 1 → Etapa 2 → Etapa 3 → atualização de memória. Sem pausas, sem perguntas intermediárias. Cada etapa termina apenas com suggestion de teste no final da Onda completa.

