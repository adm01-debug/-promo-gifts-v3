

## Filtros na listagem de conexões (`ConnectionsOverviewTable`)

Adicionar três filtros combináveis no topo da tabela de visão geral em `/admin/conexoes`, mantendo o padrão visual do hub (chips/selects compactos, `font-display`, `h-9`).

### Filtros

1. **Tipo** — multi-select com as opções já existentes em `OverviewRow.type`: Supabase, Bitrix24, n8n, MCP, Webhook Outbound. Usa um `Popover` + `Checkbox` (mesmo padrão dos filtros do catálogo).
2. **Status do último teste** — segmented control com 3 opções: `Todos` · `OK` · `Falha`. Mapeia para `last_test_ok === true | false | null`.
3. **Janela da última verificação** — `Select` com presets: `Qualquer momento` · `Últimos 5 min` · `Última hora` · `Últimas 24h` · `Últimos 7 dias` · `Nunca testado`. Compara `last_test_at` contra `Date.now()`.

### Comportamento

- Filtros aplicados client-side sobre `rows` (já vindo de `useConnectionsOverview`) — sem nova chamada de rede, mantém polling de 30s intacto.
- Contador "X de Y conexões" ao lado dos filtros + botão `Limpar filtros` quando houver algum ativo.
- Estado vazio dedicado quando filtros zeram resultados ("Nenhuma conexão corresponde aos filtros · Limpar").
- Persistência leve em `sessionStorage` (`connections-overview-filters`) para sobreviver a refresh durante uma sessão de QA.
- Acessibilidade: cada controle com `aria-label`, chips de filtro ativo focáveis com `Backspace` para remover.

### Arquivos

- **Novo**: `src/components/admin/connections/ConnectionsOverviewFilters.tsx` — UI dos 3 filtros + chips de filtros ativos + reset.
- **Novo**: `src/hooks/useConnectionsOverviewFilters.ts` — estado dos filtros, persistência em `sessionStorage`, função `applyFilters(rows)` pura e testável.
- **Modificado**: `src/components/admin/connections/ConnectionsOverviewTable.tsx` — instanciar o hook, renderizar `ConnectionsOverviewFilters` acima da tabela, mapear `rows → filteredRows`, ajustar empty state.

### Detalhes técnicos

- Tipo dos filtros:
  ```ts
  interface OverviewFilters {
    types: OverviewRow["type"][];
    status: "all" | "ok" | "fail";
    window: "any" | "5m" | "1h" | "24h" | "7d" | "never";
  }
  ```
- `applyFilters` é pura (entrada `rows + filters`, saída `rows`) para facilitar testes futuros.
- Janela `never` = `last_test_at === null`; demais janelas exigem `last_test_at` dentro do intervalo a partir de `Date.now()`.
- Sem alterações em backend, edge functions, schema ou RLS.

