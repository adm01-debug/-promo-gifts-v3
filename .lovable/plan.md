

# Plano — Verificação de estabilidade do DOM após Enter/Space

Adiciono **1 teste** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` em `tests/components/magic-up-onda5.test.tsx`, validando que após Enter/Space:
1. Nenhum elemento é adicionado/removido do DOM (estrutura estável)
2. Apenas atributos relacionados ao estado controlado mudam (`aria-pressed`, `aria-current`, `class` do wrapper ativo)
3. Identidade dos nós é preservada (mesmas referências de `HTMLElement`, sem remount)

## Justificativa

Cobertura existente (109 testes) valida atributos ARIA, classes visuais e ausência de side effects (`onSelectWinner`). Lacuna identificada:

| Risco não coberto | Como pode passar despercebido |
|---|---|
| Re-render adiciona/remove DOM nodes (ex: tooltip transitório, portal acidental) | Atributos do card permanecem corretos, mas árvore total mudou — degrada performance e quebra refs externas |
| Card sofre remount (novo `HTMLButtonElement` para o mesmo índice) | `getByRole` continua encontrando, mas refs cacheadas viram stale — quebra `cardRefs.current[i]?.focus()` |
| Outros atributos não-controlados mudam silenciosamente (ex: `tabindex`, `role`, `data-*`) | Nenhum teste atual compara snapshot de atributos — regressão passa |
| Wrapper `<div role="listitem">` ganha/perde classes não relacionadas a `isActive` | Visual permanece, mas semântica/estilo escapa do controle determinístico |

**Princípio**: ativação por teclado é uma operação **idempotente sobre atributos controlados**. Qualquer mutação fora desse conjunto restrito é regressão.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final do sub-describe `"ativação por Enter/Espaço nos botões"`:

```ts
it("DOM permanece estruturalmente estável após Enter/Space — só mudam atributos do estado controlado", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    return (
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onSelectWinner={onSelectWinner}
      />
    );
  }

  const { container } = render(<ControlledWrapper />);

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });

  // ── Snapshot 1: estrutura inicial ──
  // Conta total de elementos na seção do comparador
  const section = container.querySelector('[aria-label="Comparador de variações"]')!;
  const initialNodeCount = section.querySelectorAll("*").length;

  // Snapshot de identidade dos nós críticos (refs estáveis)
  const initialCard1Ref = card1;
  const initialCard2Ref = card2;
  const initialCard3Ref = card3;

  // Snapshot de atributos não-controlados de card2 (que vai ser ativado)
  const collectStableAttrs = (el: HTMLElement) => ({
    role: el.getAttribute("role"),
    type: el.getAttribute("type"),
    tabindex: el.getAttribute("tabindex"),
    ariaKeyshortcuts: el.getAttribute("aria-keyshortcuts"),
    ariaLabel: el.getAttribute("aria-label"),
  });
  const card2StableBefore = collectStableAttrs(card2);
  const card1StableBefore = collectStableAttrs(card1);
  const card3StableBefore = collectStableAttrs(card3);

  // Snapshot de tag names em ordem (estrutura da árvore)
  const initialTagSequence = Array.from(section.querySelectorAll("*"))
    .map((el) => el.tagName)
    .join(",");

  // ── Ação: Enter no card2 ──
  card2.focus();
  expect(card2).toHaveFocus();
  await user.keyboard("{Enter}");

  // ── Snapshot 2: estrutura pós-Enter ──
  const postEnterNodeCount = section.querySelectorAll("*").length;
  const postEnterTagSequence = Array.from(section.querySelectorAll("*"))
    .map((el) => el.tagName)
    .join(",");

  // 1) Contagem de nós idêntica — nada foi adicionado/removido
  expect(postEnterNodeCount).toBe(initialNodeCount);

  // 2) Sequência de tags idêntica — ordem e tipos preservados
  expect(postEnterTagSequence).toBe(initialTagSequence);

  // 3) Identidade dos nós preservada — sem remount (refs ainda válidas)
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toBe(initialCard1Ref);
  expect(screen.getByRole("button", { name: /^Selecionar variação 2/ })).toBe(initialCard2Ref);
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toBe(initialCard3Ref);

  // 4) Atributos não-controlados inalterados em todos os cards
  expect(collectStableAttrs(card1)).toEqual(card1StableBefore);
  expect(collectStableAttrs(card2)).toEqual(card2StableBefore);
  expect(collectStableAttrs(card3)).toEqual(card3StableBefore);

  // 5) Apenas atributos controlados mudaram no card ativado
  expect(card2).toHaveAttribute("aria-pressed", "true");
  expect(card2).toHaveAttribute("aria-current", "true");
  expect(card1).toHaveAttribute("aria-pressed", "false");
  expect(card1).not.toHaveAttribute("aria-current");

  // ── Ação: Space no card3 ──
  card3.focus();
  expect(card3).toHaveFocus();
  await user.keyboard(" ");

  // ── Snapshot 3: estrutura pós-Space ──
  const postSpaceNodeCount = section.querySelectorAll("*").length;
  const postSpaceTagSequence = Array.from(section.querySelectorAll("*"))
    .map((el) => el.tagName)
    .join(",");

  expect(postSpaceNodeCount).toBe(initialNodeCount);
  expect(postSpaceTagSequence).toBe(initialTagSequence);

  // Identidade preservada após segunda ativação
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toBe(initialCard1Ref);
  expect(screen.getByRole("button", { name: /^Selecionar variação 2/ })).toBe(initialCard2Ref);
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toBe(initialCard3Ref);

  // Atributos não-controlados ainda inalterados
  expect(collectStableAttrs(card1)).toEqual(card1StableBefore);
  expect(collectStableAttrs(card2)).toEqual(card2StableBefore);
  expect(collectStableAttrs(card3)).toEqual(card3StableBefore);

  // Estado controlado migrou para card3
  expect(card3).toHaveAttribute("aria-pressed", "true");
  expect(card3).toHaveAttribute("aria-current", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");

  // ── Side effect zero ──
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

### Helper `collectStableAttrs`

Captura apenas atributos que **nunca** devem mudar com `activeIndex`:
- `role`, `type` — definição estrutural
- `tabindex` — gestão de foco (deve ser 0 fixo, não roving)
- `aria-keyshortcuts` — declaração de atalhos (estática)
- `aria-label` — descrição acessível (depende de variação, não de seleção)

Atributos **excluídos** do snapshot (mudam por design): `aria-pressed`, `aria-current`, `class`.

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `userEvent`, `vi`, `React`, `MagicUpVariationComparator`, `navVariations`)
- 1 teste novo (109 → 110 testes)
- Sem `user.click()` — toda ativação via teclado puro
- Snapshot por contagem + sequência de tags (não usa `toMatchSnapshot` — evita arquivo `.snap` separado)

## Entregável

- 1 teste cobrindo:
  1. **Contagem de nós estável**: `querySelectorAll("*").length` idêntica antes/depois de Enter e Space
  2. **Sequência de tags estável**: ordem e tipos de elementos preservados
  3. **Identidade de refs preservada**: mesmos `HTMLElement` retornados por `getByRole` (sem remount)
  4. **Atributos não-controlados imutáveis**: `role`, `type`, `tabindex`, `aria-keyshortcuts`, `aria-label` inalterados
  5. **Apenas atributos controlados mudam**: `aria-pressed` e `aria-current` migram corretamente
  6. **Zero side effects**: `onSelectWinner` não disparado
- Captura regressões onde:
  - Refatoração introduza tooltip/portal/wrapper transitório no re-render
  - Componente sofra remount inesperado (key incorreta, `useMemo` perdido)
  - Atributo `tabindex` mude para esquema roving sem aviso
  - `aria-label` ganhe sufixo dinâmico baseado em estado ativo (vazamento de estado em descrição)
  - Nó adicional (badge/loader/portal) apareça temporariamente no card ativo
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 110/110 verde

