

## Mensagens coerentes por `error_kind` no UI de Conexões

### Objetivo
Hoje a UI mostra apenas o texto cru do erro (`info.message`) e o status HTTP. Vamos enriquecer isso com **título humano + dica acionável** baseados em `error_kind` (`timeout | network | dns | auth | http | config | unknown`), mantendo o texto técnico como detalhe secundário.

### O que será criado

**`src/lib/connection-error-copy.ts`** (novo, ~60 linhas)
Mapa SSOT que transforma `error_kind` em copy estruturada:

```ts
export interface ErrorCopy {
  title: string;       // Curto, humano: "Tempo esgotado"
  hint: string;        // Acionável: "O serviço demorou mais de 10s..."
  icon: LucideIcon;    // Ícone semântico
  tone: "timeout" | "network" | "auth" | "http" | "config" | "unknown";
}
export function getErrorCopy(kind?: ErrorKind | null, status?: number | null): ErrorCopy
```

Coberturas:
| kind | title | hint |
|---|---|---|
| `timeout` | "Tempo esgotado" | "Endpoint não respondeu em tempo. Verifique se o serviço está ativo." |
| `network` | "Sem conexão" | "Falha de rede ao alcançar o serviço. Verifique firewall/VPN." |
| `dns` | "URL não encontrada" | "DNS não resolveu o domínio. Confira a URL configurada." |
| `auth` | "Credenciais rejeitadas" | "Token/chave inválido ou expirado. Reabra o secret e cole novamente." |
| `http` | "Erro HTTP `<status>`" | Específico por faixa: 4xx → "verifique payload/permissões"; 5xx → "instabilidade no serviço destino" |
| `config` | "Configuração incompleta" | "Faltam campos obrigatórios. Edite a conexão e preencha." |
| `unknown` (ou null) | "Falha na conexão" | usa `info.message` como fallback |

### O que será alterado

**`src/components/admin/connections/LastTestLine.tsx`**
- Em vez de renderizar `info.message` cru no segundo bloco, renderiza:
  - **Linha 1 (header)**: ícone semântico + `copy.title` + tempo relativo
  - **Linha 2 (hint)**: `copy.hint` em `text-destructive/80`
  - **Linha 3 (técnico)**: `HTTP <status> · <message>` em `text-[10px] text-muted-foreground` (quando houver — só aparece se diferente do hint)
- Tooltip no header mostra a mensagem técnica completa

**`src/components/admin/connections/ConnectionTestDetailsDialog.tsx`**
- No bloco "Resumo", substitui o destaque vermelho atual por um card estruturado:
  - Ícone + `copy.title` (h3)
  - `copy.hint` (parágrafo)
  - Badge "kind: timeout" + Badge "HTTP 504" lado a lado
  - `<details>` colapsável "Mensagem técnica" com `error.message`

**`src/hooks/useConnectionTester.ts`**
- O `TOAST_TITLE_BY_KIND` já existe. Vamos passar a usar `getErrorCopy()` para o **título** e **descrição** do toast de falha, mantendo consistência com a UI.
  - Antes: `toast.error("Tempo esgotado", { description: "fetch failed" })`
  - Depois: `toast.error("Tempo esgotado", { description: "Endpoint não respondeu em tempo..." })`
  - Mensagem técnica vai para `data-attr` ou é omitida do toast (já está no modal/linha)

### Detalhes técnicos
- **Sem mudança de schema/edge**: `error_kind` já é retornado pelo `connection-tester` e persistido em `connection_tests`.
- **Backwards compat**: Se `error_kind` vier null/undefined (registros antigos), cai no caso `unknown` que usa `info.message` (comportamento atual).
- **Acessibilidade**: ícones com `aria-hidden`; `role="alert"` no card do modal; `title` no header da linha para revelar texto técnico.
- **i18n-ready**: copy centralizada num único arquivo facilita tradução futura.

### Resultado visual (linha de falha no card)

Antes:
```
✗ Falhou há 2min — HTTP 504
HTTP 504 — Gateway Timeout
```

Depois:
```
✗ Tempo esgotado · há 2min
Endpoint não respondeu em tempo. Verifique se o serviço está ativo.
HTTP 504 · Gateway Timeout                              [Testar novamente]
```

