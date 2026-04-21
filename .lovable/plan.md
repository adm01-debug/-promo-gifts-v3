

# Plano — Testes de hierarquia acessível via `getByRole` com nomes dinâmicos

Adiciono **1 teste** ao final do sub-describe `"setas atualizam activeIndex e ARIA acompanha após rerender"` em `tests/components/magic-up-onda5.test.tsx`, validando que **toda** a hierarquia interativa do `MagicUpVariationComparator` é anunciada corretamente para tecnologias assistivas via `role="button"` + `accessible name` dinâmico, sem confiar em `data-testid` ou seletores frágeis.

## Justificativa

Cobertura atual usa `getByRole("button", { name: /…/ })` pontualmente, mas **não há teste dedicado** que:

| Lacuna | Risco |
|---|---|
| Verificar que **exatamente** N cards + N botões "Marcar vencedora" são expostos como `button` | Refatoração para `<div onClick>` (anti-padrão) passaria silenciosamente |
| Verificar que cada card tem **accessible name único** com índice + score + estado vencedor | Screen reader anunciaria "botão" sem contexto se `aria-label` quebrar |
| Verificar que botão "Marcar vencedora" tem rótulo **distinto** do card irmão | NVDA/JAWS poderiam ler ambos como "Variação 1" — confusão crítica |
| Verificar que rótulo do card **muda dinamicamente** quando vira vencedor | Estado "isWinner" precisa entrar no `aria-label`, não só na badge visual |
| Verificar que **nenhum elemento não-interativo** (img, badge, wrapper) ganhou role indevido | `<img>` sem alt vira "image" no AT — poluição de árvore |
| Confirmar que `getByRole("list")` + `getAllByRole("listitem")` expõem a estrutura semântica | Se `role="list"` quebrar, AT perde contagem de itens |

**Princípio WAI-ARIA**: hierarquia semântica deve ser navegável por **role + accessible name** sozinhos, sem precisar de classe CSS, `data-*` ou inspeção de DOM.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final do sub-describe `"setas atualizam activeIndex e ARIA acompanha após rerender"`:

```ts
it("hierarquia acessível: cards e botões 'Marcar vencedora' expõem role=button com nomes únicos e dinâmicos", async () => {
  const onSelectWinner = vi.fn();
  let setActiveIndexExternal: ((i: number) => void) | null = null;

  // Variação 2 começa como vencedora (isWinner: true) — testa rótulo dinâmico
  const variationsWithWinner = navVariations.map((v, i) =>
    i === 1 ? { ...v, isWinner: true } : v
  );

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    setActiveIndexExternal = setActiveIndex;
    return (
      <MagicUpVariationComparator
        variations={variationsWithWinner}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onSelectWinner={onSelectWinner}
      />
    );
  }

  render(<ControlledWrapper />);

  // ── 1) Estrutura semântica: list + listitems ──
  // O comparador expõe role="list" com N listitems (um por variação)
  const list = screen.getByRole("list");
  expect(list).toBeInTheDocument();
  const listitems = within(list).getAllByRole("listitem");
  expect(listitems).toHaveLength(variationsWithWinner.length);

  // ── 2) Contagem exata de botões dentro do comparador ──
  // Cada variação contribui com EXATAMENTE 2 botões: card de seleção + "Marcar vencedora"
  const allButtonsInList = within(list).getAllByRole("button");
  expect(allButtonsInList).toHaveLength(variationsWithWinner.length * 2);

  // ── 3) Cards expostos como role=button com accessible name único contendo o índice ──
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });

  expect(card1.tagName).toBe("BUTTON");
  expect(card2.tagName).toBe("BUTTON");
  expect(card3.tagName).toBe("BUTTON");

  // Nomes acessíveis são únicos (sem ambiguidade para screen reader)
  const cardNames = [card1, card2, card3].map((c) => c.getAttribute("aria-label"));
  expect(new Set(cardNames).size).toBe(3);

  // ── 4) Card vencedor tem rótulo enriquecido com "melhor score" ──
  // (variação 2 começa com isWinner: true)
  expect(card2.getAttribute("aria-label")).toMatch(/melhor score/i);
  expect(card1.getAttribute("aria-label")).not.toMatch(/melhor score/i);
  expect(card3.getAttribute("aria-label")).not.toMatch(/melhor score/i);

  // ── 5) Card inclui score numérico no accessible name (contexto para AT) ──
  // navVariations tem qualityScore definido; o rótulo deve mencionar "score"
  expect(card1.getAttribute("aria-label")).toMatch(/score/i);
  expect(card2.getAttribute("aria-label")).toMatch(/score/i);
  expect(card3.getAttribute("aria-label")).toMatch(/score/i);

  // ── 6) Botões "Marcar vencedora" têm nomes ÚNICOS e DISTINTOS dos cards ──
  const winner1 = screen.getByRole("button", { name: /Marcar variação 1 como vencedora/ });
  const winner2 = screen.getByRole("button", { name: /Marcar variação 2 como vencedora/ });
  const winner3 = screen.getByRole("button", { name: /Marcar variação 3 como vencedora/ });

  expect(winner1.tagName).toBe("BUTTON");
  expect(winner2.tagName).toBe("BUTTON");
  expect(winner3.tagName).toBe("BUTTON");

  // Rótulos de winner ≠ rótulos de card (sem colisão para AT)
  const winnerNames = [winner1, winner2, winner3].map(
    (w) => w.getAttribute("aria-label") ?? w.textContent
  );
  const allNames = [...cardNames, ...winnerNames];
  expect(new Set(allNames).size).toBe(6);

  // Cada winner é um nó DOM diferente do card correspondente
  expect(winner1).not.toBe(card1);
  expect(winner2).not.toBe(card2);
  expect(winner3).not.toBe(card3);

  // ── 7) Pareamento card↔winner por listitem (hierarquia preservada) ──
  // Cada listitem contém exatamente 1 card de seleção + 1 botão "Marcar vencedora"
  listitems.forEach((item, idx) => {
    const buttonsInItem = within(item).getAllByRole("button");
    expect(buttonsInItem).toHaveLength(2);

    const selectBtn = within(item).getByRole("button", {
      name: new RegExp(`^Selecionar variação ${idx + 1}`),
    });
    const winnerBtn = within(item).getByRole("button", {
      name: new RegExp(`Marcar variação ${idx + 1} como vencedora`),
    });
    expect(selectBtn).toBeInTheDocument();
    expect(winnerBtn).toBeInTheDocument();
  });

  // ── 8) Card ativo é descobrível via role + aria-pressed ──
  // (queryability completa por AT sem precisar de classe CSS)
  const pressedButtons = within(list)
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-pressed") === "true");
  expect(pressedButtons).toHaveLength(1);
  expect(pressedButtons[0]).toBe(card1);

  // ── 9) Mudança de activeIndex re-anuncia o card correto via aria-pressed ──
  await act(async () => {
    setActiveIndexExternal!(2);
  });

  const pressedAfter = within(list)
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-pressed") === "true");
  expect(pressedAfter).toHaveLength(1);
  expect(pressedAfter[0]).toBe(card3);

  // Os accessible names dos cards permanecem estáveis durante mudança de activeIndex
  // (estado de seleção é exposto via aria-pressed, não via aria-label)
  expect(card1.getAttribute("aria-label")).toBe(cardNames[0]);
  expect(card2.getAttribute("aria-label")).toBe(cardNames[1]);
  expect(card3.getAttribute("aria-label")).toBe(cardNames[2]);

  // ── 10) Nenhum role indevido foi adicionado à árvore do listitem ──
  // (img dentro do card não deve aparecer como elemento interativo)
  listitems.forEach((item) => {
    const interactiveRoles = ["link", "checkbox", "radio", "tab", "menuitem"];
    interactiveRoles.forEach((role) => {
      expect(within(item).queryAllByRole(role)).toHaveLength(0);
    });
  });

  // ── Side effect zero ──
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `within`, `act`, `userEvent`, `vi`, `React`, `MagicUpVariationComparator`, `navVariations`)
- 1 teste novo (112 → 113 testes)
- Sem `user.click()` e sem `user.keyboard()` — teste é puramente declarativo sobre hierarquia ARIA
- Variação 2 marcada como `isWinner: true` no fixture local (sem mutar `navVariations` global)

## Entregável

- 1 teste cobrindo:
  1. **Estrutura semântica**: `role="list"` com `N` `listitem`s
  2. **Contagem exata de botões**: `N × 2` botões dentro do `list` (card + winner por variação)
  3. **Cards são `<button>` com `aria-label` único**: 3 nomes distintos via `Set.size === 3`
  4. **Rótulo dinâmico de vencedor**: card vencedor inclui `/melhor score/i`, outros não
  5. **Score no accessible name**: cards mencionam "score" para contexto AT
  6. **Botões winner têm nomes distintos dos cards**: união de 6 nomes únicos via `Set.size === 6`
  7. **Pareamento por listitem**: cada `listitem` contém exatamente 1 card + 1 winner com índices coerentes
  8. **Estado ativo descobrível por AT**: filtro por `aria-pressed="true"` retorna exatamente 1 botão
  9. **Re-render preserva descoberta**: após mudar `activeIndex`, o novo card ativo é descobrível pelo mesmo seletor
  10. **`aria-label` estável**: mudança de seleção não polui o accessible name (estado vai em `aria-pressed`, não em `aria-label`)
  11. **Sem roles indevidos**: nenhum `link`/`checkbox`/`radio`/`tab`/`menuitem` aparece dentro dos listitems
- Captura regressões onde:
  - Card vire `<div onClick>` (perde `role=button` implícito)
  - `aria-label` ganhe estado de seleção (vazamento de estado em descrição → leitura redundante)
  - Botão "Marcar vencedora" perca `aria-label` único e fique ambíguo com card
  - `<img>` interno ganhe `role` interativo acidentalmente
  - Vencedor não seja anunciado no accessible name (apenas badge visual → invisível para AT)
  - `role="list"`/`role="listitem"` sejam removidos (perda de contagem semântica)
  - Botão extra apareça/desapareça por variação (quebra contagem `N × 2`)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 113/113 verde

