

## Coluna "Falhas consecutivas" na tabela de visão geral

Adicionar uma coluna na `ConnectionsOverviewTable` que mostra quantas falhas seguidas a conexão acumulou desde o último teste OK, com destaque visual quando ultrapassa um limite configurável.

### Comportamento

- A contagem é derivada do histórico (`connection_test_history`): contagem regressiva a partir do mais recente, parando no primeiro `ok = true`. Se nunca houve OK, conta todas as falhas existentes.
- Coluna nova entre **Última verificação** e **Latência**, título "Falhas seguidas".
- Valores:
  - `0` → traço discreto (`—`) em `text-muted-foreground`.
  - `1–N` → badge âmbar (`bg-warning/10 text-warning`) com o número.
  - `> N` → badge vermelho (`bg-destructive/10 text-destructive`) com ícone `AlertTriangle` + número, e a **linha inteira ganha um fundo `bg-destructive/5` + borda esquerda `border-l-2 border-destructive`** para destacar.
- Tooltip no badge: "X falhas consecutivas desde o último sucesso em {data relativa}" (ou "nunca houve sucesso registrado").

### Limite N (threshold)

- Constante exportada `CONSECUTIVE_FAILURE_THRESHOLD = 3` em `src/lib/connections-config.ts` (novo arquivo pequeno, para reuso futuro em alertas/cron).
- Filtro adicional no `ConnectionsOverviewFilters`: novo chip toggle **"Apenas com falhas seguidas"** (não-multi, é um boolean) que mostra somente linhas com `consecutive_failures >= threshold`.

### Backend

- Nova action `consecutive_failures_overview` em `supabase/functions/connection-tester/index.ts`:
  - Sem parâmetros (ou aceita lista opcional de `connection_id`).
  - Retorna `{ items: Array<{ key: string; type: string; env_key?: string; connection_id?: string; consecutive_failures: number; since: string | null }> }`.
  - Implementação: para cada conexão, busca os últimos ~50 registros de `connection_test_history` ordenados desc por `tested_at`, conta enquanto `ok = false`, para no primeiro `ok = true`. `since` = `tested_at` do primeiro registro da streak.
  - Mascaramento não se aplica (sem payloads).
- Sem alteração de schema. Sem nova tabela. Sem migração.

### Frontend

- **Novo hook** `src/hooks/useConsecutiveFailures.ts`:
  - Recebe `rows: OverviewRow[]` (para saber quais chaves existem).
  - Chama a action a cada poll do overview (mesmo intervalo de 30s do `useConnectionsOverview` — disparado por um `useEffect` que observa o `length` + chaves de `rows`).
  - Retorna `Map<string, { count: number; since: string | null }>` indexado por `OverviewRow.key`.
- **Modificado** `src/components/admin/connections/ConnectionsOverviewTable.tsx`:
  - Instancia o novo hook.
  - Adiciona coluna no `<thead>` e célula no `<tbody>`.
  - Aplica classes condicionais na `<tr>` quando `count > threshold`.
  - Passa `consecutiveFailuresMap` para o filtro / aplica filtro no client.
- **Modificado** `src/hooks/useConnectionsOverviewFilters.ts`:
  - Adiciona campo `onlyConsecutiveFailures: boolean` ao `OverviewFilters`.
  - Atualiza `applyFilters` para aceitar segundo parâmetro opcional `consecutiveFailuresMap` e filtrar quando o toggle está ativo.
  - Persistência sessionStorage atualizada.
- **Modificado** `src/components/admin/connections/ConnectionsOverviewFilters.tsx`:
  - Adiciona o toggle "Apenas com falhas seguidas" ao lado dos filtros existentes (chip ativável estilo `Toggle`).
  - Inclui no contador de filtros ativos e no botão "Limpar".

### Detalhes técnicos

- A contagem é calculada server-side para evitar trazer todo o histórico ao cliente.
- Se a action falhar (rede), a coluna mostra `—` em vez de quebrar a tabela; nenhum highlight é aplicado.
- O destaque na linha é puramente visual (não altera ordenação) — admin continua vendo na ordem natural por tipo+nome.
- A11y: badge com `aria-label="3 falhas consecutivas"`; tooltip por `Tooltip` do shadcn (já no padrão do hub).
- Sem alteração de RLS (action chamada via JWT admin como as demais).

