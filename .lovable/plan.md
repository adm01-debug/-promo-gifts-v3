

# Plano — Teste de invariância da badge com múltiplos `isWinner: true` + cliques no empatado de maior índice

Adiciono novo teste ao `tests/components/magic-up-onda5.test.tsx` que cobre o cenário onde **duas variações têm `isWinner: true` explicitamente** (não derivado de score) e o usuário clica repetidamente no empatado de **maior índice**. A badge "Melhor score" deve permanecer fixa no **menor índice** conforme a regra `findIndex` em `MagicUpVariationComparator.tsx`:

```ts
const explicitWinnerIndex = variations.findIndex((variation) => variation.isWinner);
```

`findIndex` retorna o primeiro match — logo, mesmo com 2 winners, o de menor índice ganha. Cliques no outro empatado mudam `aria-pressed` mas não migram a badge.

## Justificativa

Cobertura existente:
- Teste paramétrico (`múltiplos isWinner: true — vencedor é sempre o de menor índice...`) — valida regra estática
- Invariância sob `activeIndex` (scores distintos)
- Invariância sob empate de **score** entre perdedores

Lacuna: **dinâmica de `activeIndex` com múltiplos `isWinner: true` explícitos**. Risco de regressão onde:
1. `findIndex` fosse trocado por `findLastIndex` ou lógica que reagisse ao `activeIndex`
2. Empate de `isWinner` fosse resolvido pelo card focado/ativo em vez do menor índice
3. Badge migrasse para o segundo winner ao receber `aria-pressed="true"`

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar teste após o último (`badge 'Melhor score' não migra ao clicar em sequência em cards empatados não vencedores`):

```ts
it("badge fica no menor índice quando 2 cards têm isWinner: true e usuário clica no empatado de maior índice", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  // Setup: var-A (idx 0) E var-C (idx 2) com isWinner: true; var-B (idx 1) sem
  // Score var-B é maior (99) para provar que isWinner explícito tem precedência
  const variations: VariationItem[] = [
    { id: "var-A", imageUrl: "https://example.com/a.png", qualityScore: 70, isWinner: true },
    { id: "var-B", imageUrl: "https://example.com/b.png", qualityScore: 99, isWinner: false },
    { id: "var-C", imageUrl: "https://example.com/c.png", qualityScore: 70, isWinner: true },
  ];
  const expectedWinnerIndex = 0; // findIndex retorna primeiro match

  const renderWithActive = (activeIndex: number) => (
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={activeIndex}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );

  const { rerender } = render(renderWithActive(0));

  const assertBadgeOnFirstWinner = (currentActive: number) => {
    const cards = screen.getAllByRole("listitem");

    // 1. Cardinalidade global = 1 (não duplica entre os 2 isWinner)
    expect(screen.getAllByLabelText("Melhor score", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("Melhor score", { exact: true })).toHaveLength(1);

    // 2. Badge SOMENTE em var-A (menor índice com isWinner)
    expect(within(cards[expectedWinnerIndex]).getByLabelText("Melhor score")).toBeInTheDocument();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    // 3. Aria-labels: só var-A tem sufixo, mesmo var-C tendo isWinner: true
    const aLabel = within(cards[0]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
    const bLabel = within(cards[1]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
    const cLabel = within(cards[2]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
    expect(aLabel).toBe("Selecionar variação 1, score 70, melhor score");
    expect(bLabel).toBe("Selecionar variação 2, score 99");
    expect(cLabel).toBe("Selecionar variação 3, score 70");

    // 4. aria-pressed reflete activeIndex; badge é independente
    expect(within(cards[currentActive]).getByRole("button", { name: /^Selecionar variação/ }))
      .toHaveAttribute("aria-pressed", "true");
  };

  // Estado inicial
  assertBadgeOnFirstWinner(0);

  // CLIQUE 1: var-C (winner empatado de MAIOR índice)
  await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
  expect(onSelect).toHaveBeenLastCalledWith(2);
  rerender(renderWithActive(2));
  assertBadgeOnFirstWinner(2); // badge AINDA em var-A

  // CLIQUE 2: var-C novamente (re-confirma estabilidade)
  await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
  expect(onSelect).toHaveBeenLastCalledWith(2);
  rerender(renderWithActive(2));
  assertBadgeOnFirstWinner(2);

  // CLIQUE 3: var-B (não-winner, mas score 99) — não promove a winner
  await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: /^Selecionar variação 2/ }));
  expect(onSelect).toHaveBeenLastCalledWith(1);
  rerender(renderWithActive(1));
  assertBadgeOnFirstWinner(1);

  // CLIQUE 4: volta para var-C
  await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
  expect(onSelect).toHaveBeenLastCalledWith(2);
  rerender(renderWithActive(2));
  assertBadgeOnFirstWinner(2);

  // Auditoria final
  expect(onSelect).toHaveBeenCalledTimes(4);
  expect(onSelect.mock.calls.map((c) => c[0])).toEqual([2, 2, 1, 2]);
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports
- Cenário ortogonal: combina **`isWinner` duplicado** + **`activeIndex` dinâmico** + **score divergente do `isWinner`**
- 5 estados (inicial + 4 cliques) × 4 invariantes = **20 verificações**

## Entregável

- 1 novo teste (79 → 80 testes)
- Trava 4 invariantes específicas:
  1. `findIndex` (menor índice) é a regra única para resolver múltiplos `isWinner: true`
  2. `isWinner` explícito tem precedência sobre `qualityScore` (var-B com score 99 não vence)
  3. Cliques no winner empatado de maior índice (var-C) **nunca** migram a badge
  4. Cliques em não-winner (var-B) **nunca** promovem a badge a outro card
- Captura regressões onde:
  - `findLastIndex` fosse usado em vez de `findIndex`
  - Lógica de desempate considerasse `activeIndex`
  - Badge fosse duplicada quando há múltiplos `isWinner: true`
  - Score sobrescrevesse `isWinner` explícito
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 80/80 verde

