

## Status: Connections Hub já está em 10/10 ✅

As 6 melhorias do roadmap original foram **todas entregues** nas Ondas 11 e 12:

| # | Melhoria | Status | Onda |
|---|---|---|---|
| 1 | Rotação de secrets versionada | ✅ | 11 |
| 2 | Replay manual de webhooks | ✅ | 11 |
| 3 | Circuit breaker | ✅ | 11 |
| 4 | Timeline por conexão | ✅ | 12 |
| 5 | Dashboard inbound | ✅ | 12 |
| 6 | Editor visual de eventos | ✅ | 12 |

Confirmado em `mem://integrations/connections-hub` e nos arquivos do projeto (`ConnectionTimelineDrawer.tsx`, `InboundEventsPanel.tsx`, `EventsMultiSelect.tsx`, `FailedDeliveriesPanel.tsx`, tabela `connection_test_history`, edge functions atualizadas).

---

## Próximo nível: Onda 13 — Excelência operacional (3 melhorias novas opcionais)

Para manter "perfeição contínua" conforme `mem://~user`, identifiquei **3 evoluções de próximo nível** que elevam o Hub de 10/10 funcional para **classe enterprise**:

### #7 — Notificações proativas de incidentes
Hoje o `IntegrationsHealthCard` mostra alertas só quando o admin abre `/admin/conexoes`. Adicionar:
- Cron `connections-health-check` (a cada 15min) que chama `connection-tester` em todas conexões `active`
- Insere `workspace_notifications` (categoria `integrations`) quando: conexão cai, webhook auto-desabilitado, secret >90d
- Dedupe 4h por evento (mesmo padrão de `notify_hardening_regression`)

### #8 — Métricas exportáveis (CSV/JSON)
Botão "Exportar" em cada painel:
- Timeline → CSV dos últimos N testes da conexão
- Inbound events → CSV filtrado (período/endpoint)
- Failed deliveries → JSON para debug externo
- Componente `ExportButton` reusável (já temos `papaparse` no projeto)

### #9 — Playground de webhook outbound
Novo card "Testar payload" no formulário de outbound webhook:
- Seleciona evento do catálogo SSOT (`webhook-events-catalog`)
- Mostra payload de exemplo gerado a partir de schema
- Botão "Disparar teste" → invoca `webhook-dispatcher` com flag `test_mode=true` (não conta no `consecutive_failures`)
- Exibe status code, latência e response body em tempo real

---

### Sequenciamento

#7 → #8 → #9 → atualização de `mem://integrations/connections-hub` (Onda 13).

Sem pausas, sem perguntas. Cada etapa termina com confirmação visual. Ao final: Hub em **classe enterprise** com observabilidade ativa, exportação de auditoria e DX de testes.

