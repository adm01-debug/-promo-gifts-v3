

## Mini-histórico inline no card de cada conexão

Hoje o `ConnectionTestHistoryPanel` já existe em Supabase / Bitrix24 / n8n / MCP, porém **colapsado por padrão** — o usuário precisa clicar para ver. O pedido é mostrar as **5 últimas verificações já visíveis no card**, com opção de expandir.

### Mudanças

1. **`ConnectionTestHistoryPanel.tsx` ganha modo "preview inline"**
   - Nova prop `defaultPreview?: boolean` (default `true`).
   - Quando `defaultPreview` e ainda não expandido: renderiza uma lista compacta com as **5 últimas verificações** (ícone ok/falha + relativo + latência), sem os filtros nem o footer de stats.
   - Cabeçalho clicável muda de "Histórico de testes (N)" para "Últimas verificações" + botão `Expandir` (chevron) à direita.
   - Ao expandir: comportamento atual (filtros all/ok/fail, até 10 itens, taxa de sucesso, link "Ver tudo →" para o `ConnectionTimelineDrawer`).
   - Ao colapsar: volta ao preview com 5 itens (não some completamente).
   - O hook `useConnectionTestHistory` passa a ser chamado com `enabled: true` sempre (preview precisa de dados); polling 60s permanece quando expandido para preservar custo.

2. **Tooltip nas linhas do preview** mostra timestamp absoluto (`dd/MM/yyyy HH:mm:ss`) + origem (`manual` / `cron`), reaproveitando o padrão já existente.

3. **Clique em qualquer linha do preview** abre o `ConnectionTestDetailsDialog` daquela verificação específica (passando o `id` do registro de histórico). Hoje o modal só carrega o "último teste" — adicionar prop opcional `historyId?: string` em `useConnectionTestDetails` que, quando presente, busca aquele registro específico via nova action `test_full_by_id` no edge `connection-tester` (ou reusa `last_test_full` recebendo `id`).

4. **Estado vazio** mantém o tratamento atual (botão desabilitado, mensagem "Histórico de testes (0)").

5. **Adicionar o painel ao `WebhooksTab.tsx`** que ainda não tem mini-histórico, para paridade com as outras 4 abas.

### Arquivos

- **Modificado**: `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` — modo preview com 5 itens visíveis, expand/collapse mantém preview, clique em linha abre modal de detalhes.
- **Modificado**: `src/hooks/useConnectionTestDetails.ts` — aceitar `historyId` opcional; quando presente, requisita registro específico.
- **Modificado**: `supabase/functions/connection-tester/index.ts` — `last_test_full` aceita `id` opcional e retorna aquele registro em vez do mais recente (mascaramento idêntico).
- **Modificado**: `src/components/admin/connections/WebhooksTab.tsx` — adicionar `<ConnectionTestHistoryPanel type="webhook_outbound" connectionId={...} ... />` no card de cada webhook.

### Detalhes técnicos

- O preview é um `<ul>` com 5 itens, mesma grid da lista expandida (`grid-cols-[14px_minmax(80px,auto)_minmax(54px,auto)_1fr]`), sem filtros e sem footer.
- Não muda RLS, schema, nem o polling (60s só quando expandido; preview usa o fetch inicial + `refreshKey` como hoje).
- `defaultPreview={false}` (opt-out) preserva o comportamento antigo caso algum consumidor queira o painel totalmente colapsado.

