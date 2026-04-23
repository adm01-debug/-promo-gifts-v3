

# Histórico de testes inline nos cards de `/admin/conexoes`

## Diagnóstico

Já existe `ConnectionTimelineDrawer` (botão "Histórico" em cada card) que abre um drawer lateral com o histórico. O usuário agora quer um **painel inline expansível dentro do próprio card**, mostrando rapidamente os últimos testes sem precisar abrir um drawer.

A persistência já existe:
- Tabela `connection_test_history` (ou `connection_test_log`) recebe um insert a cada teste do `connection-tester`
- Cada linha tem: `tested_at`, `ok`, `status`, `latency_ms`, `message`/`error`, `type`, `env_key`/`connection_id`

## Solução

### 1. Novo componente `ConnectionTestHistoryPanel`

Painel colapsável que renderiza no rodapé de cada card de conexão (Bancos, Bitrix24, n8n, MCP, Webhooks). Estado padrão: **fechado** (mostra só o cabeçalho `▸ Histórico de testes (12)` com a contagem total).

Quando aberto, exibe lista compacta dos **últimos 10 testes** ordenados por `tested_at desc`:

```text
▾ Histórico de testes (12)                                  [Ver tudo →]
─────────────────────────────────────────────────────────────────────
✓ há 3min       142ms   HTTP 200 — REST ok
✓ há 12min      138ms   HTTP 200 — REST ok
✗ há 1h         —       DNS lookup failed: ENOTFOUND
✓ há 3h         156ms   HTTP 200 — REST ok
✓ há 6h         149ms   HTTP 200 — REST ok
... (5 mais)
─────────────────────────────────────────────────────────────────────
Taxa de sucesso (últimas 10): 90% · Latência média: 146ms
```

### 2. Comportamento das linhas

- **Ícone**: ✓ verde (ok) ou ✗ vermelho (falha) — reutiliza estilo de `LastTestLine`
- **Tempo relativo**: `há 3min`, `há 1h`, `há 2d` (mesmo helper já usado)
- **Latência**: usa `LatencyBadge` (verde/amarelo/vermelho por threshold)
- **Mensagem**: truncada com tooltip do texto completo (mesmo padrão do `ConnectionsOverviewTable`)
- **Hover na linha**: destaque sutil + timestamp absoluto no tooltip (ex: `24/03/2026 14:32:18`)

### 3. Resumo no rodapé

Calculado client-side a partir dos 10 itens carregados:
- **Taxa de sucesso**: `% de ok / total`
- **Latência média**: média dos `latency_ms` nas linhas com `ok = true`
- **Última falha**: se houver, link "ver erro mais recente" rola até a primeira linha vermelha

### 4. Integração com cards existentes

O painel é renderizado por:
- `SupabaseConnectionsTab` (3 cards: Local, Promobrind, CRM — mas só Promobrind/CRM tem histórico real)
- `Bitrix24Tab`, `N8nTab`, `McpTab` (1 card cada com histórico por `connection_id` ou `type`)
- `WebhooksTab` (1 painel por webhook outbound cadastrado)

Cada card recebe `<ConnectionTestHistoryPanel type="..." envKey="..." connectionId="..." refreshKey={...} />`.

### 5. Refresh sincronizado com "Testar"

Cada card já tem um `refreshKey` ou state `last` que muda quando o admin clica "Testar conexão". Vamos:
- Bumpar um novo `historyRefreshKey` após cada teste bem-sucedido
- O painel re-fetcha automaticamente (mostrando a nova linha no topo com fade-in)
- Polling leve a cada 60s quando aberto (para refletir testes do cron `connections-health-check`)

### 6. Botão "Ver tudo →"

Reaproveita o `ConnectionTimelineDrawer` existente — abre o drawer com paginação completa (últimos 100). Assim mantemos um lugar só para ver histórico longo, e o painel inline é um "preview rápido".

### 7. Estado vazio

Se nunca testou: mostra apenas o cabeçalho desabilitado `▸ Histórico de testes (0)` em cinza, sem botão de expandir.

Se testou mas nenhuma falha nos últimos 10: badge sutil verde no cabeçalho `100% sucesso`.

### 8. Backend — nova action `test_history` no `connection-tester`

A função `connection-tester` já tem `last_test`. Adicionar:

```ts
action: "test_history"
body: { type, env_key?, connection_id?, limit?: 10 }
→ { items: [{ tested_at, ok, status, latency_ms, message, error }] }
```

Faz `SELECT ... FROM connection_test_history WHERE type=? AND (env_key=? OR connection_id=?) ORDER BY tested_at DESC LIMIT ?`. Acesso restrito a admins (mesma checagem de `last_test`).

## O que o usuário verá

Em cada card de conexão (ex: Catálogo Promobrind):

```text
┌─ Catálogo Promobrind ─────────────────────── [✓ Ativo] ─┐
│ URL: ••••.co (configurado há 2d)                       │
│ Anon Key: ••••AB12 (configurado há 2d)                 │
│ Service Role: ••••YZ89 (rotacionado há 3d)             │
│                                                         │
│ [Testar conexão] [Histórico ↗] [Ver schema ↗]          │
│ ✓ Verificado há 3min — 142ms · HTTP 200                │
│                                                         │
│ ▸ Histórico de testes (12)              90% sucesso    │
└─────────────────────────────────────────────────────────┘
```

Ao clicar para expandir:

```text
│ ▾ Histórico de testes (12)              [Ver tudo →]   │
│ ✓ há 3min       142ms   HTTP 200                        │
│ ✓ há 12min      138ms   HTTP 200                        │
│ ✗ há 1h         —       DNS lookup failed (hover→full) │
│ ✓ há 3h         156ms   HTTP 200                        │
│ ✓ há 6h         149ms   HTTP 200                        │
│ ✓ há 12h        144ms   HTTP 200                        │
│ ✓ há 1d         151ms   HTTP 200                        │
│ ✓ há 2d         147ms   HTTP 200                        │
│ ✓ há 2d         140ms   HTTP 200                        │
│ ✓ há 3d         145ms   HTTP 200                        │
│ ─────────────────────────────────────────────────────  │
│ Taxa de sucesso: 90% · Latência média: 146ms           │
```

## Arquivos tocados

**Backend**
- `supabase/functions/connection-tester/index.ts`: adicionar `action: "test_history"` que retorna últimas N linhas de `connection_test_history` filtradas por `type + env_key|connection_id`.

**Frontend (novos)**
- `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` (~150 linhas): painel colapsável com lista, resumo e estado vazio.
- `src/hooks/useConnectionTestHistory.ts` (~50 linhas): wrapper para `action: "test_history"`, recebe `{ type, envKey?, connectionId?, refreshKey, enabled }`, faz fetch + polling 60s quando aberto.

**Frontend (editados)**
- `src/hooks/useConnectionTester.ts`: expor `fetchTestHistory(type, opts)` que chama a nova action.
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`: incluir `<ConnectionTestHistoryPanel type="supabase" envKey={env.envKey} refreshKey={...} />` nos cards configuráveis (não no Local).
- `src/components/admin/connections/Bitrix24Tab.tsx`: incluir painel com `type="bitrix24"`.
- `src/components/admin/connections/N8nTab.tsx`: incluir painel com `type="n8n"`.
- `src/components/admin/connections/McpTab.tsx`: incluir painel com `type="mcp"`.
- `src/components/admin/connections/WebhooksTab.tsx`: incluir painel por webhook com `type="webhook_outbound"` e `connectionId={webhook.id}`.

## Fora de escopo

- Não substitui o `ConnectionTimelineDrawer` existente (continua acessível via "Ver tudo →")
- Não adiciona gráfico de latência ao longo do tempo (sparkline pode vir em onda futura, dados já existem)
- Não adiciona filtros dentro do painel (só ok/falha) — o drawer existente cobre isso
- Não adiciona retry automático em falhas — usuário continua testando manualmente
- Não muda a tabela `connection_test_history` nem o cron de health check

