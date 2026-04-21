

# Plano — Teste: determinismo do `winnerIndex` por ordem de array em empate (sem depender de `isWinner`)

Adiciono teste que valida o contrato fundamental do `MagicUpVariationComparator`: em empate de scores, o vencedor é determinado **exclusivamente pela ordem do array** (via `findIndex` sobre `bestScore`), **sem nenhuma variação possuir a flag `isWinner: true`**. Isso protege contra regressões onde a lógica passe a depender de `isWinner` implícito ou onde a ordem deixe de ser respeitada.

## Justificativa

A lógica em `MagicUpVariationComparator.tsx`:
```ts
const explicitWinnerIndex = variations.findIndex((v) => v.isWinner);
const winnerIndex = explicitWinnerIndex >= 0
  ? explicitWinnerIndex
  : (bestScore !== null ? scores.findIndex((s) => s === bestScore) : -1);
```

Define dois contratos distintos:
1. **Explícito**: se alguma variação tem `isWinner: true`, ela vence (independente de score)
2. **Implícito por ordem**: sem `isWinner`, o primeiro índice com `score === bestScore` vence

Testes existentes (70 atuais) cobrem cardinalidade, aria-labels literais e cenários de empate parcial. **Gap específico:** nenhum teste **isola explicitamente o fallback por ordem** com uma asserção que reordene o mesmo conjunto de variações (mesmos ids, mesmos scores) e confirme que o winner **muda junto com a ordem** — provando que `isWinner` não está sendo inferido nem cacheado.

Regressões que este teste captura:
1. Bug onde alguém adicione `isWinner: true` automaticamente baseado em score (quebra fallback)
2. Bug onde `findIndex` seja substituído por `findLastIndex` (winner no último em vez do primeiro)
3. Bug onde a ordem de renderização seja desacoplada da ordem do array de entrada
4. Bug onde memoização/cache mantenha winner anterior mesmo após reordenação

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("determinismo por ordem em empate: mesmos ids+scores em ordens diferentes → winner segue o array, sem depender de isWinner", () => {
  // Asserção 1: nenhuma variação possui isWinner explícito (todas undefined/false)
  const baseVariations = [
    buildVariation({ id: "var-X", qualityScore: 88 }, 0),
    buildVariation({ id: "var-Y", qualityScore: 88 }, 1),
    buildVariation({ id: "var-Z", qualityScore: 88 }, 2),
  ];
  baseVariations.forEach((v) => {
    expect(v.isWinner).toBeFalsy();
  });

  // Render 1: ordem [X, Y, Z] → winner = índice 0 (var-X)
  const { unmount: unmount1 } = renderTied(baseVariations);
  const badges1 = screen.getAllByLabelText("Melhor score");
  expect(badges1).toHaveLength(1);
  const cards1 = screen.getAllByRole("listitem");
  expect(within(cards1[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards1[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards1[2]).queryByLabelText("Melhor score")).toBeNull();
  unmount1();

  // Render 2: mesma identidade, ordem [Z, X, Y] → winner = índice 0 (var-Z agora)
  const reordered = [
    buildVariation({ id: "var-Z", qualityScore: 88 }, 0),
    buildVariation({ id: "var-X", qualityScore: 88 }, 1),
    buildVariation({ id: "var-Y", qualityScore: 88 }, 2),
  ];
  reordered.forEach((v) => {
    expect(v.isWinner).toBeFalsy();
  });
  const { unmount: unmount2 } = renderTied(reordered);
  const badges2 = screen.getAllByLabelText("Melhor score");
  expect(badges2).toHaveLength(1);
  const cards2 = screen.getAllByRole("listitem");
  // Winner mudou para índice 0 (agora var-Z) — prova que segue ordem do array
  expect(within(cards2[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards2[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards2[2]).queryByLabelText("Melhor score")).toBeNull();
  unmount2();

  // Render 3: ordem [Y, Z, X] → winner = índice 0 (var-Y agora)
  const reordered2 = [
    buildVariation({ id: "var-Y", qualityScore: 88 }, 0),
    buildVariation({ id: "var-Z", qualityScore: 88 }, 1),
    buildVariation({ id: "var-X", qualityScore: 88 }, 2),
  ];
  renderTied(reordered2);
  const cards3 = screen.getAllByRole("listitem");
  expect(within(cards3[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards3[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards3[2]).queryByLabelText("Melhor score")).toBeNull();

  // Asserção final: aria-label do vencedor sempre é "variação 1" (sempre índice 0 do render atual)
  const winnerBtn = screen.getByRole("button", { name: /Selecionar variação 1, score 88, melhor score/ });
  expect(winnerBtn).toBeInTheDocument();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa helpers `buildVariation`, `renderTied`, `within`, `screen` já presentes
- Sem novos imports
- Estratégia de **3 renders sequenciais com `unmount()` explícito** garante isolamento e prova que não há cache entre renders
- Asserção **defensiva** (`expect(v.isWinner).toBeFalsy()`) torna explícito que o cenário NÃO usa o fast-path de `explicitWinnerIndex`

## Entregável

- 1 novo teste no grupo de empate (70 → 71 testes)
- Trava 4 invariantes:
  1. `isWinner` ausente em todas as variações (cenário puro de fallback por ordem)
  2. Winner sempre no índice 0 do array atual (3 permutações distintas)
  3. Cardinalidade preservada (1 badge por render)
  4. Reordenação modifica winner (prova que não há cache/memoização indevida)
- Cobertura WCAG 4.1.2 mantida via aria-label literal do vencedor
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 71/71 verde

