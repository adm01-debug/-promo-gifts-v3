

## Sugestões de melhoria — Connections Hub

Baseado no estado atual (`mem://integrations/connections-hub`: 5 abas, 6 tabelas, 5 edge functions, crons, health card, auditoria), identifiquei **6 melhorias** organizadas por prioridade. Você escolhe quais executar.

---

### 🔴 Alta prioridade (segurança & confiabilidade)

**1. Rotação de secrets com versionamento**
Hoje o `secrets-manager` lista/seta, mas não há histórico nem rotação programada. Adicionar:
- Tabela `secret_rotation_log` (quem girou, quando, antigo `masked_suffix`)
- Botão "Rotacionar" no `SecretField` que aceita novo valor + invalida cache
- Alerta no `IntegrationsHealthCard` quando secret crítico tem >90 dias

**2. Replay manual de webhook delivery falho**
Hoje o cron retenta automaticamente entregas <1h. Falta UI para:
- Listar `webhook_deliveries` com `success=false` na aba Webhooks (tabela paginada)
- Botão "Reenviar" por linha → invoca `webhook-dispatcher` com o payload original (já temos `payload_hash`)
- Filtro por evento + período

**3. Circuit breaker por webhook**
Se um endpoint falha N vezes seguidas, marcar `outbound_webhooks.active = false` automaticamente e disparar notificação. Hoje fica retentando para sempre, gastando quota.

---

### 🟡 Média prioridade (observabilidade)

**4. Painel de timeline por conexão**
Drilldown ao clicar numa conexão em `external_connections`:
- Gráfico de latência (`last_test_at` + `latency_ms` histórico — exige nova tabela `connection_test_history`)
- Últimos 50 testes com status code
- Top 5 erros agrupados

**5. Dashboard de eventos inbound**
Hoje `inbound_webhook_events` só é gravado. Adicionar aba/seção:
- Volume por endpoint (gráfico 7 dias)
- Taxa de assinatura HMAC inválida (alerta de tentativas suspeitas)
- Payload viewer com pretty-print JSON

---

### 🟢 Baixa prioridade (DX)

**6. Editor visual de eventos do webhook outbound**
Hoje `events: string[]` é input livre. Substituir por multi-select com catálogo conhecido (`quote.created`, `order.approved`, `discount.requested`, `kit.shared`, etc.) extraído dos triggers existentes — zero erro de digitação.

---

### Recomendação

Começar por **#1 + #2 + #3** (mesma onda de hardening, todas tocam segurança/confiabilidade). Estimativa: 1 migração + extensão de 2 edge functions + 2 componentes novos. Sem mudança de arquitetura.

Diga quais quer e eu detalho o plano de implementação de cada uma.

