# Anúncio aria-live ao acionar o botão "Voltar ao topo"

Adicionar uma confirmação acessível para leitores de tela quando o usuário aciona o `ScrollToTopButton`, usando o provider `AriaLiveProvider` já existente em `src/components/a11y/AriaLive.tsx` (montado em `App.tsx` ao redor de toda a árvore).

## O que fazer

### 1. `src/components/common/ScrollProgress.tsx`

- Importar `useAriaLive` de `@/components/a11y`.
- Dentro de `ScrollToTopButton`, obter `announceStatus` (region `polite` + `role="status"`).
- Em `handleScrollToTop`, após chamar `window.scrollTo(...)` e antes do `setTimeout` que move o foco para `#main-content`, disparar:
  - `announceStatus("Voltando ao topo da página")` — feedback imediato da ação.
- Após o foco migrar para `#main-content` (dentro do callback `moveFocusToTop`, ao final), disparar uma segunda mensagem confirmando a chegada:
  - `announceStatus("Topo da página. Foco no conteúdo principal.")`
- Manter `prefers-reduced-motion` honrado: nesse caso ambos os anúncios saem em sequência imediata.

Sem mudança visual, sem novo testid (a região `aria-live` já está montada globalmente pelo provider).

### 2. Teste E2E em `e2e/flows/23-scroll-to-top-button.spec.ts`

Adicionar um caso novo (não substitui os existentes):

- Após clicar no botão (no fluxo do dashboard), aguardar via `pollUntil` que algum elemento com `[aria-live="polite"]` ou `[role="status"]` contenha o texto `/voltando ao topo|topo da página/i`.
- Asserção pelo conteúdo textual da region (a `AriaLiveProvider` renderiza dois `<div>` com `aria-live` no `<body>`), sem depender de testid — esse é o contrato real consumido por leitores de tela.

## Detalhes técnicos

### Por que duas mensagens

`announceStatus` usa `aria-live="polite"`/`role="status"`, que NÃO interrompe a fala atual. Anunciar apenas no início pode ser perdido se o leitor estiver falando outra coisa; anunciar apenas no fim demora demais (após smooth + 350ms). Duas mensagens curtas dão feedback de início + confirmação de contexto.

### Por que `announceStatus` (não `announceAlert`)

`assertive` (`announceAlert`) é reservado para erros/urgências. Mudança de scroll/foco é informativa → `polite` é o correto pelas WCAG SC 4.1.3.

### Provider já disponível

`App.tsx` envolve toda a árvore em `<AriaLiveProvider>`, então `useAriaLive()` funciona em qualquer descendente. Sem mudanças em `App.tsx`.

### Limites e idempotência

`announceStatus` no provider já faz `setTimeout` curto para limpar a região (re-anúncios da mesma string são detectados pelo leitor). Se o usuário spammar o botão, cada clique gera no máximo 2 anúncios — comportamento aceitável.

## Arquivos editados

- `src/components/common/ScrollProgress.tsx`
- `e2e/flows/23-scroll-to-top-button.spec.ts`
