

# Plano — Testes de accessible names + aria-label/role para screen readers no `MagicUpResultPanel`

Adiciono nova sub-suíte ao `tests/components/magic-up-result-panel-keyboard.test.tsx` validando que prev/next, dots e thumbnails expõem **accessible names** e atributos ARIA corretos para anúncio por screen readers (NVDA/JAWS/VoiceOver), conforme WCAG 4.1.2 (Name, Role, Value) e 2.4.6 (Headings and Labels).

## Justificativa

Sub-suítes anteriores travam roving tabindex, focus-visible e tab order, mas não validam explicitamente:
- **Accessible name único e descritivo** em cada controle (prev/next/dots/thumbnails) — screen readers anunciam o accessible name + role; nomes vazios/duplicados/genéricos quebram a navegação por landmarks
- **Role correto** em cada elemento: `tab` para dots/thumbnails (dentro de `tablist`), `button` para prev/next
- **`aria-label` em ícones-only** (ChevronLeft/ChevronRight): sem texto visível, o `aria-label` é a única fonte do accessible name
- **Tablists com `aria-label` distinto** ("Variações geradas" vs "Miniaturas das variações") — dois tablists no mesmo painel exigem rótulos diferentes para screen reader distinguir contextos
- **Numeração 1-based** nos labels ("variação 1", não "variação 0") — conformidade com leitura humana

## Arquivo alterado

`tests/components/magic-up-result-panel-keyboard.test.tsx` apenas — sem alterar componentes nem outros testes.

## Sub-suíte nova: `MagicUpResultPanel — accessible names e atributos ARIA para screen readers`

### Helpers locais (no topo do describe)

```ts
function expectAccessibleName(el: HTMLElement, expected: string | RegExp) {
  // Resolve accessible name via aria-label > aria-labelledby > textContent
  const name = el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "";
  if (expected instanceof RegExp) {
    expect(name).toMatch(expected);
  } else {
    expect(name).toBe(expected);
  }
}

function expectUniqueNames(elements: HTMLElement[]) {
  const names = elements.map((el) => el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "");
  expect(new Set(names).size).toBe(names.length);
}
```

### Testes a adicionar (~7 testes)

**Teste 1 — Prev e Next têm accessible names "Voltar" e "Avançar" via aria-label**
- Renderiza com `activeVariation=1` (ambos enabled)
- Valida `screen.getByRole("button", { name: "Voltar" })` e `{ name: "Avançar" }` resolvem
- Confirma `aria-label` literal no DOM (ícones-only precisam de aria-label, não basta texto)

**Teste 2 — Dots têm accessible names únicos no formato "Selecionar variação N"**
- Renderiza com 3 variações, `activeVariation=0`
- Para cada dot[i]: `expectAccessibleName(dot, \`Selecionar variação ${i + 1}\`)` (1-based)
- `expectUniqueNames(getDots())` — garante 3 nomes distintos

**Teste 3 — Thumbnails têm accessible names únicos no formato "Abrir miniatura da variação N"**
- Mesma estrutura do teste 2 mas para thumbnails
- Confirma label distinto de dots (evita screen reader anunciar "Selecionar variação 1" duas vezes)

**Teste 4 — Tablists têm aria-label distintos para diferenciar contexto**
- `screen.getByRole("tablist", { name: "Variações geradas" })` resolve (dots)
- `screen.getByRole("tablist", { name: "Miniaturas das variações" })` resolve (thumbnails)
- Confirma que ambos coexistem com nomes diferentes no mesmo painel

**Teste 5 — Roles corretos em cada controle**
- prev/next: `role="button"` (implícito em `<button>`)
- Cada dot: `role="tab"` explícito
- Cada thumbnail: `role="tab"` explícito
- Containers de dots e thumbnails: `role="tablist"`

**Teste 6 — Dot ativo expõe aria-current="true" para screen reader anunciar "atual"**
- Renderiza com `activeVariation=1`
- `expect(dots[1]).toHaveAttribute("aria-current", "true")`
- Demais dots: sem `aria-current` (ou ausente)

**Teste 7 — Prev/Next mantêm accessible name quando disabled**
- `activeVariation=0`: prev disabled mas ainda resolve via `getByRole("button", { name: "Voltar" })` (screen reader anuncia "Voltar, indisponível")
- `activeVariation=2`: next disabled idem para "Avançar"

## Estratégia técnica

- **Asserts via `getByRole({ name })`**: Testing Library usa accessible name resolution igual ao screen reader — passa se o navegador realmente anunciaria aquele nome
- **`expectAccessibleName` helper**: combina `aria-label` (prioridade) com `textContent` para casos sem aria-label; trava contrato canônico
- **`expectUniqueNames`**: previne regressão onde dois dots/thumbnails ficam com mesmo label (UX quebrada para screen reader)
- **Sem mock adicional**: reusa `buildStubState`, `getDots`, `getThumbs` existentes
- **Numeração 1-based**: alinhada ao MagicUpResultPanel.tsx atual (`Selecionar variação ${i + 1}`)

## Restrições

- Sem alterar `MagicUpResultPanel.tsx` (atributos já existem corretamente)
- Sem alterar snapshots, outros testes ou componentes
- Mantém os 26 testes existentes intactos
- Cobertura WCAG: 4.1.2 (Name, Role, Value), 2.4.6 (Headings and Labels), 1.3.1 (Info and Relationships)

## Entregável

- Nova sub-suíte com ~7 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- 2 helpers locais (`expectAccessibleName`, `expectUniqueNames`) reutilizáveis
- Trava contrato: prev/next/dots/thumbnails têm accessible names corretos e únicos
- Trava contrato: dois tablists coexistem com labels distintos
- Trava contrato: roles ARIA corretos em todos os controles de navegação
- Cobertura final: 26 → 33 testes no arquivo

