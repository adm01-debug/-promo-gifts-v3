

# Plano — Reforçar teste de múltiplos `isWinner: true` com asserts paramétricos por permutação de scores

Estendo o teste existente (`dois isWinner: true simultâneos...`) com um **bloco paramétrico** que prova que o vencedor é sempre o de **menor índice** entre os marcados, **independentemente do score** de cada variação. Isso fecha o contrato `findIndex` contra regressões onde score possa influenciar a desambiguação entre múltiplos `isWinner`.

## Justificativa

O teste atual (74) prova UM cenário: var-A (score 60, winner) vence var-C (score 80, winner). Mas não prova a invariante **independente de score**. Um bug onde alguém adicione tie-break por score (`variations.filter(v => v.isWinner).sort((a,b) => b.score - a.score)[0]`) passaria se o menor índice por acaso tiver maior score.

Cobrir 3 permutações elimina esse falso-negativo:
1. Menor índice tem **menor** score (var-A=10, var-C=99) — atual ampliado
2. Menor índice tem **maior** score (var-A=99, var-C=10) — novo
3. Menor índice tem score **igual** (var-A=50, var-C=50) — novo

Em todos: vencedor = índice 0 (var-A).

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 novo teste (`it.each`) após o teste `dois isWinner: true simultâneos...`:

```ts
it.each([
  { label: "menor índice tem menor score", scoreA: 10, scoreC: 99 },
  { label: "menor índice tem maior score", scoreA: 99, scoreC: 10 },
  { label: "ambos têm o mesmo score", scoreA: 50, scoreC: 50 },
])(
  "múltiplos isWinner: true — vencedor é sempre o de menor índice ($label)",
  ({ scoreA, scoreC }) => {
    const variations = [
      buildVariation({ id: "var-A", qualityScore: scoreA, isWinner: true }, 0),
      buildVariation({ id: "var-B", qualityScore: 50, isWinner: false }, 1),
      buildVariation({ id: "var-C", qualityScore: scoreC, isWinner: true }, 2),
    ];

    // Pré-condições: 2 winners, var-A no menor índice
    expect(variations.filter((v) => v.isWinner === true)).toHaveLength(2);
    expect(variations[0].isWinner).toBe(true);
    expect(variations[2].isWinner).toBe(true);

    renderTied(variations);

    // 1. Cardinalidade: 1 badge
    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);

    // 2. Badge sempre no índice 0 (var-A), independente do score
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    // 3. Aria-label do vencedor confirma score de var-A (não de var-C)
    const winnerBtn = screen.getByRole("button", {
      name: `Selecionar variação 1, score ${scoreA}, melhor score`,
    });
    expect(winnerBtn).toBeInTheDocument();

    // 4. var-C (segundo winner) não recebe sufixo, mesmo se score for maior
    const varCBtn = screen.getByRole("button", {
      name: `Selecionar variação 3, score ${scoreC}`,
    });
    expect(varCBtn).toBeInTheDocument();

    // 5. Asserção agregada: sufixo aparece em exatamente 1 botão
    const allSelectButtons = screen.getAllByRole("button", { name: /^Selecionar variação/ });
    const withSuffix = allSelectButtons.filter((btn) =>
      (btn.getAttribute("aria-label") ?? "").includes("melhor score")
    );
    expect(withSuffix).toHaveLength(1);
  }
);
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa `buildVariation`, `renderTied`, `within`, `screen` já presentes
- Sem novos imports (`it.each` é nativo do Vitest)
- 3 permutações em uma única definição paramétrica = 3 casos de teste

## Entregável

- 3 novos casos de teste (74 → 77 testes)
- Trava a invariante: **`findIndex` é o único critério de desambiguação entre múltiplos `isWinner`**, score não interfere
- Captura regressões onde alguém introduza tie-break por score sobre `isWinner`
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 77/77 verde

