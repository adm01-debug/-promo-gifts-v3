

# Exibir última verificação persistida na listagem de conexões

## Diagnóstico

A persistência já existe (Onda anterior):
- `external_connections` tem `last_test_at`, `last_test_ok`, `last_test_message`, `last_latency_ms`
- `connection-tester` faz upsert após cada teste (por `env_key` para bancos, por `connection_id` para Bitrix/n8n/MCP/webhooks)
- Componente `LastTestLine` já existe e é usado dentro dos cards individuais

**O que falta**: nenhuma "listagem" consolidada mostra esses dados lado a lado. Hoje o usuário precisa abrir cada aba (Bancos, Bitrix24, n8n, MCP, Webhooks) para ver o status de cada conexão. O `IntegrationsHealthCard` mostra contagens agregadas mas não a linha por conexão com timestamp + latência.

## Solução

### 1. Nova tabela "Visão geral das conexões" no topo de `/admin/conexoes`

Componente `ConnectionsOverviewTable` colocado **acima das abas**, abaixo do `IntegrationsHealthCard`. Mostra todas as conexões cadastradas em uma tabela única:

| Tipo | Nome | Status | Última verificação | Latência | Mensagem | Ação |
|---|---|---|---|---|---|---|
| 🗄️ Banco | Catálogo Promobrind | ✓ Ativo | há 3min | 142ms | HTTP 200 | [Testar] |
| 🗄️ Banco | CRM | ✗ Erro | há 12min | — | DNS lookup failed | [Testar] |
| 💼 Bitrix24 | Webhook principal | ✓ Ativo | há 1h | 387ms | crm.contact.fields ok | [Testar] |
| ⚡ n8n | Webhook eventos | — Nunca verificado | — | — | — | [Testar] |
| 🔌 MCP | Claude desktop | ✓ Ativo | há 2d | 89ms | tools/list ok | [Testar] |

### 2. Fonte de dados

Query única em `external_connections` ordenada por `type, name`. Inclui:
- Conexões "virtuais" por `env_key` (Supabase Promobrind/CRM) — já são gravadas pelo tester com `env_key` preenchido
- Conexões reais por `id` (Bitrix24, n8n, MCP, webhooks)

A tabela já tem unique index em `(env_key, type)` — então cada banco aparece como uma linha consolidada.

### 3. Comportamento das colunas

- **Status**: reutiliza `ConnectionStatusBadge` (active/error/unconfigured/never_tested)
- **Última verificação**: reutiliza formato relativo do `LastTestLine` (`há 3min`, `agora há pouco`)
- **Latência**: badge colorido — verde <500ms, amarelo 500-2000ms, vermelho >2000ms
- **Mensagem**: truncada com tooltip mostrando texto completo
- **Ação "Testar"**: dispara `useConnectionTester.test()` com o `env_key` ou `connection_id` correto; spinner inline; atualiza a linha sem recarregar a tabela inteira

### 4. Refresh automático

- Polling leve a cada 30s (`useEffect` + `setInterval`) para refletir testes disparados em outras abas/sessões
- Botão "Atualizar" no header da tabela para força-refresh manual
- Botão "Testar todas" que dispara em paralelo um teste por linha (Promise.all com limite 3 simultâneos) — útil para diagnóstico em massa

### 5. Filtros e estados vazios

- Filtro inline: `[Todas] [Ativas] [Com erro] [Nunca verificadas]` (chips no header)
- Estado vazio por filtro: "Nenhuma conexão com erro 🎉" / "Todas as conexões já foram testadas"
- Skeleton de 5 linhas durante o load inicial

### 6. Linkagem com as abas

Cada linha tem um link discreto "Configurar →" que muda a aba ativa do `Tabs` e rola até o card correspondente (via `defaultValue` controlado e `scrollIntoView` em ref do card).

## O que o usuário verá

Ao abrir `/admin/conexoes`:

```text
┌─ Saúde das integrações ─────────────────────────────┐
│ 5 ativas · 1 com erro · 2 nunca verificadas         │
└─────────────────────────────────────────────────────┘

┌─ Visão geral das conexões ──────────[Atualizar][Testar todas]─┐
│ [Todas (8)] [Ativas (5)] [Erro (1)] [Nunca (2)]               │
│                                                                │
│ Tipo      Nome              Status    Última         Latência │
│ ─────────────────────────────────────────────────────────────  │
│ 🗄️ Banco  Promobrind        ✓ Ativo   há 3min        142ms    │
│ 🗄️ Banco  CRM               ✗ Erro    há 12min       —        │
│ 💼 Bitrix Webhook principal ✓ Ativo   há 1h          387ms    │
│ ⚡ n8n    Eventos           — Nunca   —              —        │
│ 🔌 MCP    Claude desktop    ✓ Ativo   há 2d          89ms     │
└────────────────────────────────────────────────────────────────┘

[Tabs: Bancos | Bitrix24 | n8n | MCP | Webhooks]
```

Após clicar "Testar" em uma linha:
- Linha entra em modo loading (spinner na coluna Status)
- Após resposta: badge atualiza, "Última verificação" vira "agora há pouco", latência aparece
- Toast verde/vermelho confirmando

Após reload da página: tudo persiste (vem de `external_connections.last_test_*`).

## Arquivos tocados

**Frontend (novos)**
- `src/components/admin/connections/ConnectionsOverviewTable.tsx` (~180 linhas): tabela principal com filtros, polling, ações inline.
- `src/components/admin/connections/LatencyBadge.tsx` (~25 linhas): badge colorido por threshold.
- `src/hooks/useConnectionsOverview.ts` (~80 linhas): query única em `external_connections`, normalização de linhas (env_key vs id), refresh manual + polling 30s.

**Frontend (editados)**
- `src/pages/admin/AdminConexoesPage.tsx`: incluir `<ConnectionsOverviewTable />` entre o `IntegrationsHealthCard` e as `Tabs`.
- `src/components/admin/connections/ConnectionStatusBadge.tsx`: garantir suporte ao estado `never_tested` (se ainda não tiver).

**Backend**
- Nenhuma mudança. Todos os dados já são persistidos pelo `connection-tester` desde a Onda anterior. A query é direta na tabela via cliente (RLS já restringe a admins).

## Fora de escopo

- Não adiciona gráfico histórico de latência (já existe `connection_test_history` que pode alimentar isso depois)
- Não adiciona alertas por e-mail (cron `connections-health-check` já cobre via `workspace_notifications`)
- Não muda os cards individuais nas abas — são complementares à visão geral
- Não adiciona edição inline (admin continua usando o card da aba para configurar credenciais)

