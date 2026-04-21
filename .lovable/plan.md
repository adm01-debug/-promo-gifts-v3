

# Plano — Testes de retenção de foco no dot clicado (sem saltar para outro elemento)

Adiciono nova sub-suíte ao `tests/components/magic-up-result-panel-keyboard.test.tsx` validando especificamente que **clicar** num dot de variação mantém o foco no próprio dot clicado, sem saltar para outros elementos (outros dots, thumbs, prev/next, ou perder foco para `<body>`).

## Justificativa

Sub-suítes anteriores cobrem retenção de foco após **ativação por teclado** (Enter/Space/setas) e re-render via `rerenderWithActive`. Falta um conjunto focado especificamente no caso **mouse click** num dot, confirmando que:

- O click não desloca foco para outro dot (ex: dot[ativo anterior])
- O click não desloca foco para thumb correspondente
- O click não desloca foco para prev/next
- O foco não vai para `document.body` (foco perdido)
- Comportamento consistente em todas as posições (primeiro, meio, último)

Esses contratos previnem regressões onde alguém adicionaria `useEffect` que move foco para o painel principal, ou mudaria a estrutura DOM de forma que o React perderia a referência do botão clicado.

## Arquivo alterado

`tests/components/magic-up-result-panel-keyboard.test.tsx` apenas — sem alterar componentes nem outros testes.

## Sub-suíte nova: `MagicUpResultPanel — retenção de foco em click no dot`

### Helper local

```ts
function clickAndCheckFocus(el: HTMLButtonElement) {
  el.focus();
  expect(document.activeElement).toBe(el); // baseline pré-click
  fireEvent.click(el);
  return document.activeElement;
}
```

### Testes a adicionar (~6 testes)

**Teste 1 — Click em dot[0] mantém foco em dot[0]**
- Renderiza `activeVariation=1`, 3 variações
- `clickAndCheckFocus(dots[0])` → `document.activeElement === dots[0]`
- Confirma `setActiveVariation(0)` foi chamado (efeito esperado do click)

**Teste 2 — Click em dot[meio] mantém foco em dot[meio]**
- Renderiza `activeVariation=0`, 3 variações
- `clickAndCheckFocus(dots[1])` → foco permanece em dots[1]

**Teste 3 — Click em dot[last] mantém foco em dot[last]**
- Renderiza `activeVariation=0`, 3 variações
- `clickAndCheckFocus(dots[2])` → foco permanece em dots[2]

**Teste 4 — Click em dot NÃO move foco para o thumbnail correspondente**
- Renderiza `activeVariation=0`
- Click em dot[2]
- `expect(document.activeElement).not.toBe(getThumbs()[2])`
- `expect(document.activeElement).toBe(getDots()[2])`

**Teste 5 — Click em dot NÃO move foco para prev/next**
- Renderiza `activeVariation=1`
- Click em dot[2]
- `expect(document.activeElement).not.toBe(screen.getByLabelText("Voltar"))`
- `expect(document.activeElement).not.toBe(screen.getByLabelText("Avançar"))`
- `expect(document.activeElement).toBe(getDots()[2])`

**Teste 6 — Click em dot NÃO perde foco para document.body**
- Renderiza `activeVariation=0`, 3 variações
- Click em cada dot sequencialmente (`[0, 1, 2]`)
- Após cada click: `expect(document.activeElement).not.toBe(document.body)`
- E: `expect(document.activeElement).toBe(getDots()[i])`

## Estratégia técnica

- **`fireEvent.click`** é síncrono e não dispara re-render real (mock `setActiveVariation` é `vi.fn()`); validamos retenção de foco no DOM imediato após click — exatamente o comportamento que precisamos travar (React não desfoca o elemento clicado durante `onClick`)
- **`el.focus()` antes de `fireEvent.click`**: padroniza estado inicial — em browsers reais, click em `<button>` foca o elemento; replicamos isso explicitamente
- **`document.activeElement` pós-click**: trava o invariante "foco permanece no botão clicado"
- **Sem `rerender`**: este caso testa apenas o comportamento síncrono do click — re-render pós-state-change já é coberto pela sub-suíte "retorno de foco após troca de variação ativa"
- **Reusa** `buildStubState`, `getDots`, `getThumbs` existentes; adiciona apenas helper local `clickAndCheckFocus`

## Restrições

- Sem alterar `MagicUpResultPanel.tsx` (comportamento já correto)
- Sem alterar `useMagicUpState`, snapshots, outros testes ou helpers existentes
- Mantém os 58 testes existentes intactos
- Cobertura WCAG: 2.4.3 (Focus Order), 2.4.7 (Focus Visible), 3.2.1 (On Focus — sem mudança inesperada de contexto)

## Entregável

- Nova sub-suíte com ~6 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- 1 helper local (`clickAndCheckFocus`) reutilizável
- Trava contrato: click em dot mantém foco no próprio dot (não salta para thumb, prev/next ou body)
- Trava contrato: comportamento idêntico em todas as posições (primeiro, meio, último)
- Cobertura final: 58 → 64 testes no arquivo

