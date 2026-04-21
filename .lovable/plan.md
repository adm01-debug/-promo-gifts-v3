

# Plano — Testes de atualização de atributos ARIA dinâmicos nos dots ao trocar variação ativa

Adiciono nova sub-suíte ao `tests/components/magic-up-result-panel-keyboard.test.tsx` validando que `aria-selected`, `aria-current` e `tabIndex` dos dots refletem corretamente a variação ativa após re-render — garantindo que screen readers anunciem o novo dot ativo e que o roving tabindex acompanhe.

## Justificativa

Sub-suítes anteriores cobrem retorno de foco e roving tabindex pós-ativação, mas não validam explicitamente que **cada atributo ARIA dinâmico transita corretamente**:

- `aria-selected="true"` migra do dot anterior para o novo ativo (e os outros voltam para `"false"`)
- `aria-current` (se presente) reflete o índice ativo
- `tabIndex` permanece sincronizado (`0` no ativo, `-1` nos demais)
- Mesmo contrato vale para thumbnails
- Transição correta em **múltiplas mudanças sequenciais** (0→2→1→0), não só primeira ativação

Esses contratos garantem WCAG 4.1.2 (Name/Role/Value) — screen readers dependem desses atributos para anunciar "selecionado" / "atual" corretamente.

## Arquivo alterado

`tests/components/magic-up-result-panel-keyboard.test.tsx` apenas — sem alterar componentes nem outros testes.

## Sub-suíte nova: `MagicUpResultPanel — atributos ARIA dinâmicos refletem variação ativa`

### Helper local

```ts
function expectAriaSelectedState(elements: HTMLElement[], activeIndex: number) {
  elements.forEach((el, i) => {
    const expected = i === activeIndex ? "true" : "false";
    expect(el.getAttribute("aria-selected")).toBe(expected);
  });
}

function expectTabIndexState(elements: HTMLElement[], activeIndex: number) {
  elements.forEach((el, i) => {
    expect(el.tabIndex).toBe(i === activeIndex ? 0 : -1);
  });
}
```

### Testes a adicionar (~7 testes)

**Teste 1 — `aria-selected` inicial reflete `activeVariation=0`**
- Renderiza com `activeVariation=0`, 3 variações
- `expectAriaSelectedState(getDots(), 0)`

**Teste 2 — `aria-selected` migra após re-render com novo active**
- Renderiza `activeVariation=0`, `rerenderWithActive(rerender, m, 2)`
- `expectAriaSelectedState(getDots(), 2)` — dot[0] e dot[1] viram `"false"`, dot[2] vira `"true"`

**Teste 3 — `aria-selected` em thumbnails segue mesmo contrato**
- Renderiza `activeVariation=1`, valida initial; re-render para 0
- `expectAriaSelectedState(getThumbs(), 0)`

**Teste 4 — `tabIndex` sincronizado com `aria-selected` em dots**
- Renderiza `activeVariation=1`
- `expectTabIndexState(getDots(), 1)` + `expectAriaSelectedState(getDots(), 1)`
- Re-render para 2 → ambos atributos transitam juntos

**Teste 5 — `aria-current` (se presente) reflete o ativo**
- Renderiza `activeVariation=2`
- Verifica que apenas dot[2] tem `aria-current="true"` ou `"page"` (depende da implementação) — usa `el.hasAttribute("aria-current")` + valor
- Se atributo não estiver presente em nenhum dot, marca teste como `it.skip` com comentário (não é obrigatório por APG; `aria-selected` cobre o caso)

**Teste 6 — Múltiplas trocas sequenciais (0 → 2 → 1 → 0) atualizam ARIA corretamente**
- Renderiza `activeVariation=0`, valida
- `rerenderWithActive(rerender, m, 2)` → valida
- `rerenderWithActive(rerender, m, 1)` → valida
- `rerenderWithActive(rerender, m, 0)` → valida estado final igual ao inicial
- Confirma que nenhum dot fica com `aria-selected="true"` "fantasma" de estado anterior

**Teste 7 — Após mudança via setas (`fireEvent.keyDown` ArrowRight) + re-render, ARIA reflete novo ativo**
- Renderiza `activeVariation=0`
- `fireEvent.keyDown(getDots()[0], { key: "ArrowRight" })` → confirma `setActiveVariation(1)` chamado
- `rerenderWithActive(rerender, m, 1)`
- `expectAriaSelectedState(getDots(), 1)` + `expectTabIndexState(getDots(), 1)`

## Estratégia técnica

- **Reusa `rerenderWithActive`** já existente da sub-suíte de retorno de foco
- **Helpers `expectAriaSelectedState` / `expectTabIndexState`** reduzem boilerplate em 7 testes
- **Teste 5 (aria-current)**: verifica primeiro se o componente usa esse atributo; se não, documenta com `it.skip` para não falhar (atributo opcional por APG quando `aria-selected` está presente em `role="tab"`)
- **Sem novo mock**: reusa `buildStubState`, `getDots`, `getThumbs` existentes
- **Re-busca pós-rerender**: `getDots()` re-busca elementos para garantir que assertions usam o DOM atual

## Restrições

- Sem alterar `MagicUpResultPanel.tsx` (comportamento já correto)
- Sem alterar `useMagicUpState`, snapshots, outros testes ou helpers existentes
- Mantém os 64 testes existentes intactos
- Cobertura WCAG: 4.1.2 (Name/Role/Value), 1.3.1 (Info/Relationships)

## Entregável

- Nova sub-suíte com ~7 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- 2 helpers locais (`expectAriaSelectedState`, `expectTabIndexState`) reutilizáveis
- Trava contrato: `aria-selected`/`tabIndex` dos dots e thumbnails refletem variação ativa em qualquer transição
- Trava contrato: nenhum atributo ARIA "fantasma" persiste após múltiplas trocas sequenciais
- Cobertura final: 64 → 71 testes no arquivo

