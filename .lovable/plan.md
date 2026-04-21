

# Plano — Asserts de focus-visible em Tab + persistência após Enter/Space no `MagicUpResultPanel`

Adiciono uma nova sub-suíte ao `tests/components/magic-up-result-panel-keyboard.test.tsx` validando que (1) as classes `focus-visible:*` estão presentes em cada parada de Tab nos 4 grupos de controles (prev, dots, thumbnails, next) e (2) o foco permanece no elemento e suas classes de focus-visible continuam aplicadas após ativação por Enter/Space (não há "perda de foco" pós-clique de teclado).

## Justificativa

Cobertura atual valida classes estáticas e tab order separadamente, mas não valida:
- Que os 4 grupos de controles (prev, dots, thumbnails, next) **todos** carregam o conjunto canônico `focus-visible:outline-none + focus-visible:ring-2 + focus-visible:ring-ring + focus-visible:ring-offset-2 + focus-visible:ring-offset-background` definido no `MAGIC_UP_ONDA5_A11Y.md`
- Que após pressionar Enter/Space no controle focado (ativação via teclado), o `document.activeElement` continua sendo o mesmo elemento — comportamento crítico WCAG 2.4.7 + 2.4.3 (Focus Order): se o componente roubasse foco no clique, usuários de teclado perderiam contexto
- Que classes de focus-visible permanecem no `className` após ativação (não são removidas por re-render que troque `activeVariation`)

## Arquivo alterado

`tests/components/magic-up-result-panel-keyboard.test.tsx` apenas — sem alterar componentes nem outros testes.

## Sub-suíte nova: `MagicUpResultPanel — focus-visible em Tab + persistência após Enter/Space`

### Helpers locais (no topo do describe)

```ts
const FOCUS_VISIBLE_CLASSES = [
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
  "focus-visible:ring-offset-background",
];

function expectFocusVisibleClasses(el: HTMLElement) {
  for (const cls of FOCUS_VISIBLE_CLASSES) {
    expect(el.className).toContain(cls);
  }
}

function expectFocusVisibleOutlineNone(el: HTMLElement) {
  expect(el.className).toContain("focus-visible:outline-none");
}
```

### Testes a adicionar (~6 testes)

**Teste 1 — Tab atinge prev/next e cada parada tem classes focus-visible completas + outline-none**
- Renderiza com `activeVariation=1` (prev e next ambos enabled)
- Foca prev → assert `toHaveFocus()` + classes focus-visible + outline-none
- Foca next → mesmas asserções

**Teste 2 — Cada dot do tablist carrega classes focus-visible canônicas**
- Renderiza com 3 variações
- Loop sobre `getDots()`: para cada dot, assert classes focus-visible + outline-none (independente de tabindex/active)

**Teste 3 — Cada thumbnail carrega classes focus-visible canônicas**
- Mesma estrutura do teste 2 mas para `getThumbs()`

**Teste 4 — Após Enter no dot, o foco permanece no dot ativado**
- Foca dot[2] → confirma `toHaveFocus()`
- `fireEvent.keyDown(dot[2], { key: "Enter" })` + `fireEvent.click(dot[2])`
- Assert `document.activeElement === dot[2]` (foco não migrou)
- Assert classes focus-visible ainda presentes no `dot[2].className`

**Teste 5 — Após Space no botão "Avançar", foco permanece no botão**
- Renderiza com `activeVariation=0` (next enabled)
- Foca next → `fireEvent.keyDown(next, { key: " " })` + `fireEvent.click(next)`
- Assert `document.activeElement === next`
- Assert classes focus-visible ainda presentes

**Teste 6 — Após Enter na thumbnail, foco permanece e classes focus-visible mantidas**
- Renderiza com `activeVariation=0`
- Foca `thumbs[2]` → `fireEvent.keyDown` Enter + `fireEvent.click`
- Assert `document.activeElement === thumbs[2]`
- Assert classes focus-visible ainda presentes em `thumbs[2].className`

## Estratégia técnica

- **Asserts via `className.toContain`**: JSDOM não computa pseudo-classes `:focus-visible`, mas a presença das classes Tailwind no DOM garante que o browser as aplicará quando o estado de foco-via-teclado for ativado. Mesmo padrão usado nos testes existentes do `magic-up-onda5.test.tsx`.
- **`document.activeElement` antes e depois da ativação**: trava contrato de "não roubar foco" — handler de click pode disparar re-render via `setActiveVariation`, mas o elemento clicado deve continuar focado (React preserva foco em re-renders quando o elemento permanece no DOM).
- **`fireEvent.keyDown + fireEvent.click` em vez de `userEvent.keyboard("{Enter}")`**: simula o ciclo completo Enter/Space → click sintético do browser, sem depender da implementação interna do userEvent que pode mudar foco implicitamente.
- **Helpers `FOCUS_VISIBLE_CLASSES` + funções de assert**: reduz duplicação nos 6 testes; alinhado ao padrão de `MAGIC_UP_ONDA5_A11Y.md`.
- **Reuso dos helpers existentes** `buildStubState`, `getDots`, `getThumbs`, `getDotsTablist` — sem novos mocks.

## Restrições

- Sem alterar `MagicUpResultPanel.tsx` (classes já existem e foram validadas em sub-suítes anteriores)
- Sem alterar `MagicUpVariationComparator`, `AdImageResult`, snapshots, ou outros arquivos
- Mantém os 20 testes existentes intactos
- Cobertura WCAG: 2.4.7 (Focus Visible), 2.4.3 (Focus Order), 2.1.1 (Keyboard)

## Entregável

- Nova sub-suíte com ~6 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- 2 helpers locais (`FOCUS_VISIBLE_CLASSES`, `expectFocusVisibleClasses`) reutilizando padrão canônico
- Trava contrato: prev, next, dots e thumbnails sempre carregam o bloco completo de classes focus-visible
- Trava contrato: ativação por Enter/Space não rouba foco do elemento ativado
- Cobertura final: 20 → 26 testes no arquivo

