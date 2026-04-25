# /admin/conexoes — Auditoria Estratégica & Plano de Excelência

## Diagnóstico atual (estado da arte do que já existe)

O módulo já tem fundação sólida: 5 abas, 7 tabelas, 6 edge functions, cron auto-test, health-check 15min, circuit breaker, rotação versionada de secrets, replay manual, timeline por conexão, dashboard inbound, catálogo SSOT de eventos, exportação CSV/JSON, playground de testes, alertas de plataforma e telemetria de cold-start. **A base está em ~9/10. As melhorias abaixo levam a 11/10.**

## Problemas observados na tela atual (screenshot)

1. **Vazio comunica fraqueza, não confiança.** Estados "0/0", "—", "Nunca", "aguardando 1ª execução" empilhados criam sensação de "nada funciona" para um admin novo. Falta um *empty state guiado* com CTA.
2. **Hierarquia visual achatada.** 5 KPIs do header + 2 cards de configuração + 1 status do cron + 1 tabela = 4 blocos competindo. Sem agrupamento semântico (Saúde / Configuração / Operação).
3. **Densidade de informação subaproveitada** em 1515px — cards usam só ~50% da largura útil.
4. **"Conexões com falha: 0 OK"** ambíguo — o "OK" verde ao lado de "0" parece um botão. Padrão visual inconsistente.
5. **Auto-test, Janela de falha e Job status** são 3 cards relacionados a *operação do cron*, mas estão soltos em layout desigual.
6. **Sem priorização por severidade.** Tudo tem o mesmo peso visual — uma falha 503 crítica e "0 webhooks ativos" parecem igualmente importantes.
7. **Sem onboarding/discoverability.** Admin não sabe por onde começar quando entra pela 1ª vez.
8. **Linguagem técnica vazada** ("aguardando 1ª execução", "cron", "auto-test"). Falta camada de tradução para admins menos técnicos.

---

## Roadmap de Excelência — 8 Ondas

### Onda 14 — Information Architecture & Hierarquia Visual `[UX foundation]`

**Objetivo:** transformar a página de "lista de cards" em uma narrativa visual com hierarquia clara: *Status → Ação → Configuração → Detalhes*.

- **Reorganizar em 4 zonas semânticas** com separadores discretos:
  1. **Pulse Bar** (sticky, 64px) — status global em 1 linha: bolinha verde/amarela/vermelha + "Tudo operacional" / "2 conexões com falhas" + ações rápidas (Testar todas, Auditar).
  2. **Saúde** — KPIs reagrupados em 2 fileiras (Disponibilidade vs Volume) ao invés de 5 cards iguais.
  3. **Operação** — auto-test, janela de falha, job status agrupados em 1 card-painel "Automação" com tabs internas.
  4. **Conexões** — tabela detalhada (já existe).
- **Ancoragem lateral** (TOC sticky em telas ≥1280px): navegação por âncoras "Saúde · Automação · Conexões · Webhooks · Auditoria".
- **Breadcrumb com contagem viva**: `Admin / Conexões (12 ativas · 2 com falha)`.

### Onda 15 — Empty States Inteligentes & Onboarding `[Activation]`

**Objetivo:** primeira sessão precisa virar *valor* em <60s.

- **Empty state da tabela** (hoje "Nenhuma conexão cadastrada") vira **wizard de 4 passos**:
  1. "Conectar Banco Externo" (CTA primário com ícone)
  2. "Adicionar Webhook"
  3. "Cadastrar Bitrix24/n8n"
  4. "Importar config (JSON)"
- **Setup Progress** — barra de progresso "Configuração inicial 2/7" persistida em `system_settings` com checklist:
  - [x] Bancos cadastrados
  - [x] Auto-test habilitado
  - [ ] Webhook de saída configurado
  - [ ] Endpoint inbound testado
  - [ ] MCP key gerada
  - [ ] Smoke test executado
  - [ ] Notificações configuradas
- **Tour guiado** (Driver.js ou similar) na 1ª visita, com toggle "Não mostrar mais" em `user_preferences`.
- **Estado "aguardando 1ª execução"** com CTA `[Executar agora]` que dispara o cron manualmente via RPC.

### Onda 16 — Severity-First Dashboard & Smart Alerts `[Observability+]`

**Objetivo:** o que está pegando fogo aparece primeiro, sempre.

- **Incident Strip** no topo (acima do header) — só aparece quando há P0/P1:
  - Vermelho: conexões críticas down >5min, secrets expirados, circuit breaker aberto
  - Amarelo: latência >2× baseline, taxa de erro >5%, secrets >80 dias
  - Verde: nada (não exibe)
  - Cada item com mini-sparkline 60min + CTAs `[Investigar]` `[Silenciar 1h]` `[Resolver]`.
- **Severidade por conexão** (P0/P1/P2/P3) configurável (ex: banco principal = P0, webhook de marketing = P3) — alertas e cron priorizam por severidade.
- **Anomaly detection leve** — comparar latência atual vs baseline rolling 7d (média + 2σ) e marcar outliers no painel de timeline.
- **Smart grouping** — falhas correlacionadas (ex: 3 webhooks no mesmo host falhando juntos) agrupam em 1 incidente único.
- **Alertas via Slack/Discord/Webhook externo** (configurável) para incidentes P0/P1 — usar `outbound_webhooks` existentes.

### Onda 17 — IA Diagnóstica & Auto-Remediação `[Intelligence layer]`

**Objetivo:** transformar o admin em *supervisor*, não *bombeiro*.

- **"Analisar com IA"** em cada falha (Gemini 2.5 Flash via Lovable AI) — recebe: error_kind, message, status_code, headers, request payload, últimos 10 testes, e retorna:
  - Causa provável (3 hipóteses ranqueadas)
  - Passos de remediação numerados
  - Se aplica: link direto para o painel correto (ex: rotação de secret)
- **Runbook automático por error_kind** — biblioteca de respostas pré-aprovadas (sem IA) para casos conhecidos: `dns_failure`, `tls_handshake`, `timeout`, `4xx_auth`, `5xx_service`, `cold_start`.
- **Auto-remediação opt-in** por conexão (toggle `auto_heal_enabled`):
  - Cold-start 503 → retry com backoff já existe (manter)
  - Token expirado → tentar refresh automático (OAuth)
  - DNS flap → aumentar timeout temporariamente +50% por 1h
  - Circuit breaker aberto → tentar half-open após N min
- **Postmortem assistido** — ao resolver um incidente P0/P1, IA gera draft de postmortem (causa, impacto, timeline, ações) salvo em `incident_postmortems`.

### Onda 18 — Operação Avançada & Bulk Actions `[Power user]`

**Objetivo:** tornar gestão em escala (50+ conexões) viável.

- **Multi-select na tabela** (checkboxes) com bulk actions:
  - Testar selecionadas
  - Habilitar/desabilitar auto-test
  - Aplicar tag/grupo
  - Exportar selecionadas
  - Rotacionar secrets em lote (com confirmação 2FA)
- **Tags/Grupos** — coluna `tags text[]` em `external_connections` + filtro por tag (ex: `crítico`, `produção`, `staging`, `cliente-X`).
- **Saved Views** — admin salva combinações de filtros como "Visões" (ex: "Só produção com falha", "Webhooks lentos") em `system_settings` por usuário.
- **Comparador de conexões** — selecionar 2-4 conexões e ver lado a lado: latência 7d, taxa de erro, último teste, headers de resposta.
- **Diff de configuração** — quando uma conexão muda (URL, headers, timeout), mostrar diff visual no histórico.
- **Atalhos de teclado** (já há registry):
  - `g c` → ir para Conexões
  - `t` → testar selecionadas
  - `/` → focar busca
  - `?` → cheat sheet

### Onda 19 — Comando, Pesquisa & Playground Avançado `[DX]`

**Objetivo:** velocidade de operação digna de Vercel/Linear/Stripe.

- **Command Palette (`Cmd+K`)** específico do hub: "Testar bitrix produção", "Rotacionar secret X", "Abrir timeline Y", "Ver últimas falhas 503".
- **Busca global na tabela** com fuzzy match (já tem filtros, falta search livre).
- **Webhook Playground v2**:
  - Replay com modificação inline (edita payload e re-dispara)
  - Comparador de payloads (request vs response)
  - Modo `dry-run` mostrando o que *seria* enviado sem disparar
  - Geração de payload via IA a partir de descrição natural
- **Inspector HTTP estilo Postman** — request/response completo com syntax highlighting, copy as cURL, copy as fetch, copy as Python.
- **Rate limit calculator** — preview "se você dispara 100 req/min para este webhook, o consumo do budget é X%".

### Onda 20 — Confiabilidade Empresarial & Governança `[Enterprise]`

**Objetivo:** atender SOC2/ISO27001 mentality.

- **SLO/SLI por conexão** — definir SLO (ex: 99.5% sucesso, p95 <800ms) e mostrar error budget consumido.
- **Audit log dedicado** (`connection_audit_log`) — toda mudança (criação, edição, rotação, disable) com `actor_id`, `before`, `after`, `ip`, `user_agent`, `reason` (campo opcional para admin justificar).
- **Aprovação dupla** (4 olhos) opcional para ações sensíveis (rotacionar secret produção, deletar conexão crítica) — `pending_approvals` table.
- **Janelas de manutenção agendadas** — agendar pausa do auto-test e silenciamento de alertas em janelas conhecidas (ex: deploy semanal sábado 22h-23h).
- **Compliance pack** — botão "Exportar relatório de compliance" gera PDF com: inventário de conexões, secrets >90d, último teste de cada, RLS aplicada, retenção de logs.
- **Backup/Restore de configuração** — snapshot completo da config (sem secrets) em JSON versionado para disaster recovery.
- **Webhook signing** — HMAC-SHA256 com secret rotacionável, timestamp anti-replay (já comum no mercado, validar se já existe).

### Onda 21 — Refinamento Visual & Microinterações `[Polish]`

**Objetivo:** sensação de produto premium em cada pixel.

- **Skeleton states** específicos por card (não genéricos).
- **Loading states com previsão de tempo** ("Testando 12 conexões — ~8s restantes").
- **Microcopy revisado** — eliminar jargão técnico desnecessário:
  - "aguardando 1ª execução" → "Vamos testar pela primeira vez em até X min — ou clique aqui para testar agora"
  - "consecutive_failures" → "falhas seguidas"
  - "circuit breaker open" → "Pausado automaticamente após muitas falhas"
- **Color semantics consistentes** — verde=sucesso, âmbar=degradado, vermelho=falha, azul=ação, roxo=automação. Hoje há mistura.
- **Animações motion-reduce friendly** (respeitar `prefers-reduced-motion`).
- **Densidade ajustável** — toggle "Compacto / Confortável / Espaçoso" salvo em preferências.
- **Modo escuro de classe A** — auditar contrastes WCAG AAA nos badges de status.
- **Sparklines inline** em cada linha da tabela mostrando latência últimas 24h.
- **Ícones lucide consistentes** — auditar e padronizar (hoje há mistura de Plug, Plug2, Workflow, Webhook).

---

## Priorização sugerida (ROI vs esforço)

| Ordem | Onda | Esforço | Impacto | Tipo |
|-------|------|---------|---------|------|
| 1 | **14 — IA & hierarquia visual** | M | Alto | UX |
| 2 | **16 — Severity-first** | M | Alto | Confiança |
| 3 | **15 — Empty states & onboarding** | S | Alto | Activation |
| 4 | **17 — IA diagnóstica** | M | Muito Alto | Diferenciação |
| 5 | **18 — Bulk actions & tags** | M | Médio | Power user |
| 6 | **21 — Polish visual** | S | Médio | Percepção |
| 7 | **19 — Command palette & playground v2** | M | Médio | DX |
| 8 | **20 — Governança enterprise** | L | Alto (em vendas B2B) | Compliance |

---

## Detalhes técnicos (resumido)

- **Novas tabelas:** `incident_postmortems`, `connection_audit_log`, `connection_tags`, `pending_approvals`, `maintenance_windows`, `saved_views`, `connection_slo_config`.
- **Novas edge functions:** `connection-ai-diagnose` (Gemini 2.5 Flash), `connection-auto-heal`, `compliance-report-generator` (PDF via pdf-lib).
- **Componentes novos chave:** `IncidentStrip`, `PulseBar`, `SetupProgressChecklist`, `BulkActionsBar`, `CommandPaletteConexoes`, `AiDiagnoseDialog`, `ConnectionComparator`, `SloErrorBudgetCard`, `MaintenanceWindowScheduler`.
- **Reusos:** `webhook-events-catalog` SSOT, `bridge-status-events` event bus, `cold-start-recorder`, `usePlatformFailureMetrics`, `notificationService`, `Lovable AI Gateway` (sem chave do usuário).
- **Sem breaking changes** — tudo é aditivo. Migrations idempotentes, RLS preservada, secrets nunca expostos client-side.

---

## O que entregar primeiro (recomendação executiva)

Se aprovar, sugiro começar por **3 entregáveis concretos** que já dão salto perceptível:

1. **Pulse Bar + Incident Strip + reorganização de zonas** (Onda 14 + 16 parcial) — 1 PR.
2. **Empty states com wizard + Setup Progress checklist** (Onda 15) — 1 PR.
3. **Botão "Analisar com IA" nas falhas + runbook automático** (Onda 17 parcial) — 1 PR.

Após esses 3, a tela já se sente um produto de classe Vercel/Linear. Aí seguimos para bulk actions, command palette e governança.

**Confirma esse caminho ou quer reordenar / cortar / aprofundar alguma onda específica antes de eu começar?**
