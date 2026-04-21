

# Plano — Testes de navegação por teclado no MagicUpResultPanel (dots, thumbnails, prev/next)

Adiciono uma suíte cobrindo navegação por teclado dos controles de variação no painel de resultado: botões prev/next, dots de paginação e thumbnails. Sem alterações em produção.

## Arquivo novo

`tests/components/magic-up-result-panel-keyboard.test.tsx`

## Setup mínimo

`MagicUpResultPanel` recebe `m: ReturnType<typeof useMagicUpState>`. Para isolar o teste do hook real, monto um stub tipado com apenas os campos lidos pelo painel (variations, activeVariation, setActiveVariation, currentVariation, generating, history, handlers como `vi.fn()`, copyPack vazio, creativeControls.aspectRatio).

Helper local `buildStubState({ variations, activeVariation })` retorna o objeto. 3 variações por padrão.

## Casos cobertos (6 testes)

1. **Tab atinge prev → dots → next na ordem do DOM**
   - Renderiza com 3 variações, `activeVariation=1`
   - `userEvent.tab()` em loop começando do `body`
   - Ordem esperada: botão "Voltar" → dot 1 → dot 2 → dot 3 → botão "Avançar" → AdImageResult internals → comparator buttons → thumbnails
   - Asserta apenas o segmento dots/prev/next (primeiros 5 stops) para evitar acoplamento com children

2. **Enter no dot ativa `setActiveVariation` com índice correto**
   - Foca o dot do índice 2 via `getByRole("tab", { name: /Selecionar variação 3/ }).focus()`
   - `fireEvent.keyDown` + `click` (botões nativos disparam click no Enter; usamos `fireEvent.click` após focus para simular ativação por teclado de forma determinística no jsdom)
   - Assert: `setActiveVariation` chamado com `2`

3. **Space no dot ativa `setActiveVariation`**
   - Mesmo cenário, `fireEvent.click` após focus (Space em `<button>` nativo dispara click)
   - Assert: handler chamado com índice correto

4. **Enter no botão "Avançar" incrementa activeVariation**
   - `activeVariation=0`, foca botão "Avançar", dispara click via teclado
   - Assert: `setActiveVariation(1)`

5. **Enter no botão "Voltar" decrementa activeVariation**
   - `activeVariation=2`, foca "Voltar", dispara click
   - Assert: `setActiveVariation(1)`

6. **Thumbnail abre variação correta via teclado + ordem de tab dentro do strip**
   - Foca o `<button aria-label="Abrir miniatura da variação 3">`
   - Dispara click (Enter equivalente)
   - Assert: `setActiveVariation(2)`
   - Adicional: tab de thumbnail 1 → 2 → 3 mantém ordem do DOM

## Estratégia anti-flaky

- `fireEvent.click` após `.focus()` para simular ativação por teclado de `<button>` nativo (jsdom não dispara click sintético via `keyDown Enter` em todos os casos)
- Sem `userEvent.setup()` (não disponível conforme histórico) — usa `fireEvent` + `document.activeElement` para tab order
- Stub do `useMagicUpState` com apenas campos lidos pelo painel — sem mockar Supabase, sem renderizar `AdImageResult` real (mockado via `vi.mock("@/components/magic-up/AdImageResult", () => ({ AdImageResult: () => <div data-testid="ad-image-result-stub" /> }))`) para isolar foco apenas em prev/next/dots/thumbs
- `MagicUpVariationComparator` permanece real (já testado em outras suítes; mantém DOM consistente). Alternativamente pode ser stubbed também — escolho stubá-lo para reduzir nodes focáveis e tornar a ordem de tab determinística

## Stubs aplicados

- `vi.mock("@/components/magic-up/AdImageResult", ...)` → `<div data-testid="ad-image-result-stub" />`
- `vi.mock("@/components/magic-up/MagicUpVariationComparator", ...)` → `<div data-testid="comparator-stub" />`

Justificativa: o objetivo é validar prev/next/dots/thumbs do painel; subcomponentes têm suítes próprias.

## Restrições

- Sem alterar `MagicUpResultPanel.tsx` nem subcomponentes
- Sem novas dependências
- Reutiliza `vitest`, `@testing-library/react`, `fireEvent` (já no setup)

## Entregável

- 1 arquivo novo, 6 testes verdes
- Cobertura: tab order completo dos controles de variação + Enter/Space em dot, prev, next, thumbnail
- Documentação inline em cada `it()` indicando WCAG 2.1.1 (Keyboard) coberta

