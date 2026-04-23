

## Adicionar link "Ver detalhes" ao SecretErrorAlert

### Objetivo
Permitir que o admin abra um modal com o registro completo do erro (status HTTP, latência, headers, body, timing detalhado, stack) diretamente a partir da mensagem de falha exibida pelo `SecretErrorAlert`, sem precisar navegar até o histórico.

### O que será alterado

**1. `src/components/admin/connections/SecretErrorAlert.tsx`**
- Adicionar duas props opcionais:
  - `onViewDetails?: () => void` — handler que abre o modal
  - `detailsLabel?: string` (default: `"Ver detalhes"`)
- Renderizar um botão `link` (variant `link`, tamanho `sm`, ícone `Info`) ao lado direito do botão "Tentar novamente" quando `onViewDetails` estiver definido. Mantém alinhamento atual e responsividade (wrap no mobile).

**2. Novo componente `src/components/admin/connections/ErrorDetailsDialog.tsx`**
- Dialog reutilizável que recebe:
  - `open`, `onOpenChange`
  - `error: NormalizedSecretError` (headline, hint, categoria)
  - `details?: TestDetails | null` (do hook `useConnectionTestDetails`)
  - `loading?: boolean`
- Layout em 4 seções colapsáveis (usando `Collapsible` do shadcn):
  1. **Resumo** — categoria, título, descrição, hint
  2. **HTTP** — método, URL, status, latência total
  3. **Timing detalhado** — DNS / TCP / TLS / TTFB / Download (ms) em grid
  4. **Resposta crua** — headers (key/value table) + body (`<pre>` com `max-h-64 overflow-auto`)
  5. **Erro técnico** — `error.kind`, `error.message`, `timeout_ms` quando aplicável
- Botão "Copiar JSON" no header do dialog que serializa `details` + `error` via `navigator.clipboard.writeText` e dispara `toast.success`.
- Estado de loading com `Skeleton`. Estado vazio ("Sem registro de teste disponível") quando `details === null` e não está carregando.

**3. Integração nos consumidores do `SecretErrorAlert`**
- `SecretField.tsx`: quando `connectionId` estiver presente, instanciar `useConnectionTestDetails({ open: detailsOpen, type, connectionId })` e passar `onViewDetails={() => setDetailsOpen(true)}` para o `SecretErrorAlert`. Renderizar `<ErrorDetailsDialog />` no final do componente.
- `LastTestLine.tsx`: já tem `onClick` próprio para abrir detalhes — sem mudança aqui (evita duplicação).
- Demais usos do `SecretErrorAlert` (busca rápida confirma: `IntegrationsHealthCard`, `Bitrix24Tab`, `N8nTab`, etc.) recebem a prop opcional sem quebra — apenas os locais com contexto de teste passam `onViewDetails`.

### Detalhes técnicos

- **Sem fetch novo**: reutiliza `useConnectionTestDetails` existente, que já normaliza `TestDetails` e infere `error_kind` retroativamente.
- **A11y**: botão "Ver detalhes" tem `aria-label` explícito; dialog usa `DialogTitle`/`DialogDescription` para leitores de tela; collapsibles têm `aria-expanded`.
- **Performance**: hook só dispara quando o dialog abre (`open: detailsOpen`), evitando requisições desnecessárias.
- **TS estrito**: tipos inline (`type` import), sem `any`, props opcionais bem definidas.
- **Sem regressão visual**: o link aparece apenas quando handler é passado; alertas existentes sem contexto de teste continuam idênticos.

### Resultado
Cada falha de credencial/conexão exibida no painel `/admin/conexoes` ganha um atalho "Ver detalhes" que abre um modal completo com toda a telemetria do último teste — status HTTP, breakdown de timing (DNS/TCP/TLS/TTFB), headers, body cru e mensagem de erro técnica — com botão de copiar JSON para suporte. Zero impacto em consumidores que não passam `onViewDetails`.

