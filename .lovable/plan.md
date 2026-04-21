

# Plano — Teste de invariância da badge "Melhor score" sob mudança de `activeIndex`

Adiciono um novo teste ao `tests/components/magic-up-onda5.test.tsx` que prova que a badge "Melhor score" permanece **fixa no `winnerIndex`** mesmo quando o usuário clica em outro card e ele se torna o `activeIndex`. Usa `rerender` do React Testing Library para simular o ciclo controlado: `onSelect` → pai atualiza `activeIndex` → re-render → badge não migra.

## Justificativa

O componente `MagicUpVariationComparator` recebe `activeIndex` como prop controlada pelo pai. Há risco de regressão onde:
1. Alguém vincule a badge "Melhor score" ao `activeIndex` em vez do `winnerIndex` (confusão semântica entre "selecionado" e "vencedor")
2. Refatoração que use `useState` interno para "selected" e mova a badge para o item selecionado
3. CSS condicional que troque a badge pelo ring de seleção

O teste prova invariância da badge sob **3 mudanças sucessivas** de `activeIndex` (0 → 1 → 2 → 0), garantindo que:
- Badge nunca migra do `winnerIndex` (índice 1, com score mais alto)
- `aria-pressed` e `aria-current` migram corretamente para o `activeIndex`
- `onSelect` é chamado com o índice correto a cada clique
- Cardinalidade global de "Melhor score" permanece 1 em todos os estados

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar novo teste no `describe` existente do `MagicUpVariationComparator`, após o `it.each` paramétrico, antes do fechamento do bloco:

```ts
it("badge 'Melhor score' permanece no winnerIndex mesmo quando outro card é selecionado (activeIndex controlado)", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  // Setup: 3 variações, var-B (índice 1) é vencedora por score (90 > 60 > 40)
  const variations: VariationItem[] = [
    { id: "var-A", imageUrl: "https://example.com/a.png", qualityScore: 60 },
    { id: "var-B", imageUrl: "https://example.com/b.png", qualityScore: 90 },
    { id: "var-C", imageUrl: "https://example.com/c.png", qualityScore: 40 },
  ];
  const winnerIndex = 1;

  // Helper: re-renderiza com novo activeIndex e valida invariantes
  const renderWithActive = (activeIndex: number) => (
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={activeIndex}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );

  const { rerender } = render(renderWithActive(0));

  // Helper: valida invariância da badge + estado de seleção
  const assertWinnerInvariant = (currentActive: number) => {
    const cards = screen.getAllByRole("listitem");

    // 1. Badge "Melhor score" sempre no winnerIndex (índice 1)
    expect(within(cards[winnerIndex]).getByLabelText("Melhor score")).toBeInTheDocument();
    expect(within(cards[winnerIndex]).getByText("Melhor score")).toBeInTheDocument();

    // 2. Cardinalidade global: exatamente 1 badge em todo o DOM
    expect(screen.getAllByLabelText("Melhor score", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("Melhor score", { exact: true })).toHaveLength(1);

    // 3. Outros cards NÃO têm badge (incluindo o activeIndex se for diferente)
    [0, 1, 2].filter((i) => i !== winnerIndex).forEach((i) => {
      expect(within(cards[i]).queryByLabelText("Melhor score")).toBeNull();
    });

    // 4. aria-pressed/aria-current refletem o activeIndex (não o winnerIndex)
    cards.forEach((card, i) => {
      const button = within(card).getByRole("button", { name: /^Selecionar variação/ });
      const isActive = i === currentActive;
      expect(button).toHaveAttribute("aria-pressed", String(isActive));
      if (isActive) {
        expect(button).toHaveAttribute("aria-current", "true");
      } else {
        expect(button).not.toHaveAttribute("aria-current");
      }
    });

    // 5. Aria-label do winner mantém sufixo independente do activeIndex
    const winnerButton = within(cards[winnerIndex]).getByRole("button", {
      name: /^Selecionar variação 2/,
    });
    expect(winnerButton.getAttribute("aria-label")).toBe(
      "Selecionar variação 2, score 90, melhor score"
    );
  };

  // Estado inicial: activeIndex=0 (var-A selecionada, var-B vencedora)
  assertWinnerInvariant(0);

  // Clique 1: usuário clica em var-B (winner) → activeIndex=1
  const cardsInitial = screen.getAllByRole("listitem");
  await user.click(within(cardsInitial[1]).getByRole("button", { name: /^Selecionar variação 2/ }));
  expect(onSelect).toHaveBeenLastCalledWith(1);
  rerender(renderWithActive(1));
  // Caso especial: activeIndex === winnerIndex (badge + ring no mesmo card)
  assertWinnerInvariant(1);

  // Clique 2: usuário clica em var-C → activeIndex=2 (badge NÃO migra para var-C)
  const cardsAfter1 = screen.getAllByRole("listitem");
  await user.click(within(cardsAfter1[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
  expect(onSelect).toHaveBeenLastCalledWith(2);
  rerender(renderWithActive(2));
  assertWinnerInvariant(2);

  // Clique 3: volta para var-A → activeIndex=0 (badge ainda em var-B)
  const cardsAfter2 = screen.getAllByRole("listitem");
  await user.click(within(cardsAfter2[0]).getByRole("button", { name: /^Selecionar variação 1/ }));
  expect(onSelect).toHaveBeenLastCalledWith(0);
  rerender(renderWithActive(0));
  assertWinnerInvariant(0);

  // 6. Auditoria final: onSelect chamado exatamente 3 vezes com sequência correta
  expect(onSelect).toHaveBeenCalledTimes(3);
  expect(onSelect.mock.calls.map((c) => c[0])).toEqual([1, 2, 0]);

  // 7. onSelectWinner NUNCA foi chamado (clique no card ≠ clique em "Marcar vencedora")
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa imports existentes (`render`, `rerender`, `screen`, `within`, `userEvent`, `vi`, `VariationItem`)
- Sem novos imports
- Padrão controlado: pai (teste) é fonte da verdade do `activeIndex`, componente apenas notifica via `onSelect`
- 4 estados validados (inicial + 3 cliques) × 7 invariantes por estado = 28 verificações totais

## Entregável

- 1 novo teste (77 → 78 testes)
- Trava 5 invariantes críticas:
  1. Badge "Melhor score" é função pura de `winnerIndex`, **independente** de `activeIndex`
  2. Cardinalidade global da badge permanece 1 em qualquer estado de seleção
  3. `aria-pressed`/`aria-current` migram corretamente com `activeIndex`
  4. Aria-label do vencedor mantém sufixo `, melhor score` em todos os estados
  5. `onSelect` é chamado com índice correto; `onSelectWinner` não é chamado por clique no card
- Caso especial coberto: `activeIndex === winnerIndex` (badge + ring coexistem no mesmo card)
- Captura regressões de:
  - Migração indevida da badge para o card selecionado
  - Confusão entre `aria-current` (seleção) e badge (vencedor)
  - Vazamento de chamadas de `onSelectWinner` em cliques de seleção
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 78/78 verde

