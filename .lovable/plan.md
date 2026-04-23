

# Drawer de detalhes do erro ao clicar em "Falhou"

## Diagnóstico

Hoje em `LastTestLine.tsx`, quando um teste falha, a linha mostra:
```
✗ Falhou há 3min — Connection timeout
```
O texto é truncado (`truncate`) e não há forma de ver o erro completo, código HTTP, stack ou contexto da conexão. O admin precisa abrir o `ConnectionTimelineDrawer` (botão separado no card) e procurar manualmente.

A `LastTestInfo` já carrega `ok`, `tested_at`, `latency_ms`, `message`, `status` — temos quase tudo. Falta só uma forma de exibir esses dados em destaque + buscar o registro completo de `connection_test_history` para mostrar `response_body`/`stack` quando disponível.

## Solução

### 1. Tornar a linha "Falhou" clicável

Em `LastTestLine.tsx`, quando `info.ok === false`, envolver o conteúdo num `<button>` semântico (mantendo a aparência atual + cursor pointer + hover sutil + foco visível). Adicionar prop `onClick?: () => void` opcional. Quando ausente ou `info.ok !== false`, renderiza como `<p>` (comportamento atual).

Affordance visual:
- Sublinhado pontilhado discreto sob o texto de erro
- Hover: `bg-destructive/5` no container
- Tooltip: "Clique para ver detalhes do erro"

### 2. Novo componente `ConnectionErrorDetailsDialog`

`src/components/admin/connections/ConnectionErrorDetailsDialog.tsx` (~150 linhas):

Dialog (não Drawer — é conteúdo focado de leitura, não navegação) com:

- **Header**: ícone `XCircle` vermelho + "Detalhes da falha" + badge com tipo da conexão (ex: `Bitrix24`, `n8n`, `Supabase Promobrind`)
- **Resumo (grid 2 colunas)**:
  - Quando: `tested_at` formatado (relativo + absoluto no tooltip)
  - Latência: `latency_ms` ou "—" se timeout
  - HTTP Status: badge colorido (`destructive` para 4xx/5xx, `outline` para network errors)
  - Tipo: badge com nome amigável do tipo
- **Mensagem**: bloco em destaque com `info.message` em fonte mono, `whitespace-pre-wrap`, scrollável até 200px
- **Detalhes técnicos** (collapsible, fechado por default): se houver `response_body` ou `stack` no registro completo de `connection_test_history`, mostrar em `<pre>` com syntax básica (texto cinza claro), limite 400px scroll
- **Sugestões contextuais** (footer): regras simples baseadas no erro:
  - HTTP 401/403 → "Verifique se as credenciais estão corretas e não expiraram"
  - HTTP 404 → "Verifique se a URL base está correta"
  - HTTP 5xx → "Serviço externo retornou erro — tente novamente em alguns minutos"
  - "ETIMEDOUT"/"ECONNREFUSED" → "O serviço pode estar offline ou bloqueando o IP"
  - JWT inválido → "Token JWT malformado — re-salve o secret"
  - default → nenhuma sugestão (sem placeholder vazio)
- **Footer actions**:
  - "Copiar detalhes" → copia JSON estruturado para clipboard (toast de confirmação)
  - "Ver histórico completo" → fecha o dialog + abre o `ConnectionTimelineDrawer` da aba (via callback)
  - "Fechar"

### 3. Hook leve para buscar o registro completo

A `LastTestInfo` no card só tem campos resumidos. O registro completo está em `connection_test_history` (com `response_body`, `stack`, `request_url`). 

Novo hook `useLastTestDetail(connectionType: string)`:
- Lazy: só dispara o fetch quando `enabled = true` (dialog aberto)
- Busca `connection_test_history` ordenado por `created_at DESC LIMIT 1` filtrado por `type = connectionType` e `success = false`
- Retorna `{ data, loading, error }`
- Cache em memória de 30s para evitar refetch ao reabrir o dialog rapidamente

Alternativa simples se já existe método similar em `useConnectionTester` ou `useConnectionTestHistory`: reusar adicionando `fetchLastFailureDetail(type)` em vez de criar hook novo. Vou checar e usar o que já existe — provavelmente `fetchLastTest` no `useConnectionTester` pode ser estendido ou já retorna campos extras.

### 4. Integração nas 4 abas

Em cada `*Tab.tsx` (`Bitrix24Tab`, `N8nTab`, `SupabaseConnectionsTab`, `McpTab`):

```tsx
const [errorDialogOpen, setErrorDialogOpen] = useState(false);

<LastTestLine
  info={last}
  onClick={last?.ok === false ? () => setErrorDialogOpen(true) : undefined}
  action={<RetestButton ... />}
/>

<ConnectionErrorDetailsDialog
  open={errorDialogOpen}
  onOpenChange={setErrorDialogOpen}
  connectionType="bitrix24"
  connectionLabel="Bitrix24"
  summary={last}
  onOpenTimeline={() => { setErrorDialogOpen(false); /* trigger drawer */ }}
/>
```

Para `SupabaseConnectionsTab` (que tem 1 linha por env: promobrind, crm) — uma instância de dialog por env, com `connectionType={env.id}`.

### 5. Atalho de teclado

Quando o dialog estiver aberto:
- `Esc`: fecha (Radix nativo)
- `C`: copia detalhes
- `H`: abre histórico completo

Registrados via `useEffect` com cleanup. Sem conflito com atalhos globais (dialog tem foco trap).

### 6. Estados visuais

```text
Idle (sem clique):
✗ Falhou há 3min — Connection timeout                  [↻ Testar novamente]
  ‾‾‾‾‾‾ ‾‾‾ ‾‾‾‾‾ ‾‾‾‾‾‾‾ ‾‾‾‾‾‾‾‾‾‾  (sublinhado pontilhado discreto)

Hover:
✗ Falhou há 3min — Connection timeout                  [↻ Testar novamente]
(fundo destructive/5, cursor pointer)

Dialog aberto:
┌─ ✗ Detalhes da falha    [Bitrix24]    × ┐
│                                          │
│ Quando      | há 3 min                   │
│ Latência    | 8000ms (timeout)           │
│ HTTP Status | — (network error)          │
│ Tipo        | Bitrix24 Webhook           │
│                                          │
│ Mensagem:                                │
│ ┌────────────────────────────────────┐   │
│ │ Connection timeout after 8000ms    │   │
│ │ at fetch (...)                     │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ▸ Detalhes técnicos                      │
│                                          │
│ 💡 O serviço pode estar offline ou       │
│    bloqueando o IP da função.            │
│                                          │
│ [Copiar] [Ver histórico] [Fechar]        │
└──────────────────────────────────────────┘
```

## Arquivos tocados

**Frontend (novos)**
- `src/components/admin/connections/ConnectionErrorDetailsDialog.tsx` (~150 linhas): dialog com resumo, mensagem, detalhes colapsáveis, sugestões e ações.
- `src/hooks/useLastTestDetail.ts` (~50 linhas) — **só se** não conseguir reusar hook existente. Vou tentar estender `useConnectionTester` primeiro.

**Frontend (editados)**
- `src/components/admin/connections/LastTestLine.tsx`: prop opcional `onClick` que torna a linha clicável quando há falha; mantém compatibilidade com uso atual.
- `src/components/admin/connections/Bitrix24Tab.tsx`: estado `errorDialogOpen` + `<ConnectionErrorDetailsDialog>` + `onClick` no `LastTestLine`.
- `src/components/admin/connections/N8nTab.tsx`: idem.
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`: idem (1 dialog por env).
- `src/components/admin/connections/McpTab.tsx`: idem.

**Backend**: nenhuma mudança. `connection_test_history` já tem os campos necessários.

## Fora de escopo

- Não muda o `ConnectionTimelineDrawer` existente (continua acessível pelo botão atual).
- Não adiciona retry automático a partir do dialog (já tem `RetestButton` na linha).
- Não adiciona deep-link (`?error=open`) — dialog é efêmero.
- Não adiciona AI-powered diagnosis das falhas — sugestões são regras estáticas.
- Não adiciona export do erro como issue/ticket.

