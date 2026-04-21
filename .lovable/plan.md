

# Plano — Testes de comportamento nas extremidades (boundaries) de teclado nos dots/thumbnails/prev-next do `MagicUpResultPanel`

Adiciono nova sub-suíte ao `tests/components/magic-up-result-panel-keyboard.test.tsx` validando o comportamento consistente nas extremidades (primeiro/último elemento) ao navegar via Tab/Enter/Space — confirmando que o componente **não faz wrap** (não cicla) e **para corretamente** nos limites, conforme APG Tabs Pattern (não-wrapping linear).

## Justificativa

Sub-suítes anteriores cobrem roving tabindex, focus-visible, accessible names e ativação por teclado, mas não validam explicitamente o **comportamento nas bordas**:

- **Prev no primeiro dot**: deve estar `disabled` e `setActiveVariation` NÃO deve ser chamado ao clicar/Enter/Space
- **Next no último dot**: mesmo contrato (disabled + no-op)
- **Enter/Space em dot/thumb já ativo**: comportamento idempotente — chama `setActiveVariation(activeIndex)` sem efeito colateral, ou no-op silencioso (precisamos travar qual)
- **Tab order não cicla**: após o último elemento focável (next), Tab sai do painel (não volta ao prev) — comportamento natural do browser que precisa ser confirmado
- **Roving tabindex nas extremidades**: com `activeVariation=0`, dot[0] é o único com `tabindex=0`; com `activeVariation=last`, dot[last] é o único — sem "wrap" do roving para dot[1] quando estamos em dot[0]

Esses contratos previnem regressões onde alguém adicionaria lógica de wrap (`onClick={() => setActive((i + 1) % total)}`) ou removeria o `disabled` dos prev/next nos extremos.

## Arquivo alterado

`tests/components/magic-up-result-panel-keyboard.test.tsx` apenas — sem alterar componentes nem outros testes.

## Sub-suíte nova: `MagicUpResultPanel — comportamento de extremidades (no-wrap) em Tab/Enter/Space`

### Helpers locais (no topo do describe)

```ts
function pressKey(el: HTMLElement, key: "Enter" | " ") {
  fireEvent.keyDown(el, { key });
  // Browsers disparam click sintético em Enter/Space em <button>; replicamos
  if (!(el as HTMLButtonElement).disabled) {
    fireEvent.click(el);
  }
}
```

### Testes a adicionar (~8 testes)

**Teste 1 — Prev disabled no primeiro índice; clique não dispara setActiveVariation**
- Renderiza `activeVariation=0`, 3 variações
- `prev` está `disabled`
- `fireEvent.click(prev)` → `setActiveVariation` NÃO foi chamado
- `pressKey(prev, "Enter")` → mesmo
- `pressKey(prev, " ")` → mesmo

**Teste 2 — Next disabled no último índice; clique não dispara setActiveVariation**
- Renderiza `activeVariation=2`, 3 variações
- `next` está `disabled`
- Mesmas 3 asserções (click, Enter, Space) → `setActiveVariation` nunca chamado

**Teste 3 — Prev funciona normalmente em índices intermediários**
- Renderiza `activeVariation=1`
- `prev` NÃO está disabled
- `fireEvent.click(prev)` → `setActiveVariation` chamado com `0`

**Teste 4 — Next funciona normalmente em índices intermediários**
- Renderiza `activeVariation=1`
- `next` NÃO está disabled
- `fireEvent.click(next)` → `setActiveVariation` chamado com `2`

**Teste 5 — Roving tabindex no primeiro índice: apenas dot[0] e thumb[0] com tabindex=0**
- Renderiza `activeVariation=0`, 3 variações
- `dots[0].tabindex === "0"`, `dots[1].tabindex === "-1"`, `dots[2].tabindex === "-1"`
- Mesma asserção para thumbs
- Confirma que roving NÃO faz wrap (dot[2] não vira focável só porque é "anterior" ao 0)

**Teste 6 — Roving tabindex no último índice: apenas dot[last] e thumb[last] com tabindex=0**
- Renderiza `activeVariation=2`, 3 variações
- `dots[2].tabindex === "0"`, `dots[0].tabindex === "-1"`, `dots[1].tabindex === "-1"`
- Mesma asserção para thumbs

**Teste 7 — Enter/Space em dot já ativo é idempotente (chama com mesmo índice ou no-op)**
- Renderiza `activeVariation=1`
- Foca `dots[1]` e dispara `pressKey(dots[1], "Enter")`
- `setActiveVariation` foi chamado com `1` (idempotente — handler não filtra; UI permanece estável porque React reconcilia mesmo state)
- Mesmo para thumbs[1]
- Foco permanece em `dots[1]` após ativação

**Teste 8 — Tab a partir do último dot enabled (next) não retorna ao prev (sem wrap de Tab)**
- Renderiza `activeVariation=1` (prev e next enabled, dot[1] tabindex=0)
- Foca `next` via `next.focus()`
- `await user.tab()` → foco sai para próximo elemento focável fora do trio prev/dots/next (ex: thumbnail ativa) ou sai do painel — confirma que `document.activeElement !== prev` (Tab não cicla de volta)
- Trava: navegação linear, sem wrap forçado por trap de foco

## Estratégia técnica

- **`fireEvent.click` em botão `disabled`**: React/JSDOM respeita `disabled` e NÃO dispara o handler `onClick` mesmo via fireEvent — perfeito para testar "no-op" nas extremidades sem mock especial
- **`pressKey` helper**: encapsula o ciclo Enter/Space → click sintético, com guarda `!disabled` para refletir comportamento do browser
- **`setActiveVariation` é `vi.fn()` em `buildStubState`** — basta `expect(m.setActiveVariation).not.toHaveBeenCalled()` para travar contrato de no-op
- **Idempotência**: o componente atual chama `setActiveVariation(i)` independente de já estar ativo; o teste 7 trava esse contrato (não é bug — React reconcilia state igual sem re-render desnecessário, e mantém handler simples)
- **Tab sem wrap**: `userEvent.tab()` avança 1 elemento focável; comparamos `document.activeElement` antes/depois para garantir que não retorna ao prev

## Restrições

- Sem alterar `MagicUpResultPanel.tsx` (comportamento de extremidades já correto via `disabled` nos prev/next)
- Sem alterar snapshots, outros testes, componentes ou helpers existentes
- Mantém os 33 testes existentes intactos
- Reusa `buildStubState`, `getDots`, `getThumbs` já presentes no arquivo
- Cobertura WCAG: 2.1.1 (Keyboard), 2.1.2 (No Keyboard Trap), 2.4.3 (Focus Order)

## Entregável

- Nova sub-suíte com ~8 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- 1 helper local (`pressKey`) reutilizável dentro da sub-suíte
- Trava contrato: prev/next são no-op nas extremidades (disabled + handler nunca chamado)
- Trava contrato: roving tabindex não faz wrap (dot[0] não torna dot[last] focável e vice-versa)
- Trava contrato: Enter/Space em elemento já ativo é idempotente (chama com mesmo índice, foco permanece)
- Trava contrato: Tab navega linearmente sem cycle/trap de foco
- Cobertura final: 33 → 41 testes no arquivo

