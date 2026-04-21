

# Plano — Teste: cardinalidade de sufixo "melhor score" em aria-labels sob empate

Adiciono teste que valida, em cenário de empate, que **exatamente uma** variação recebe o sufixo `, melhor score` no `aria-label` e que **todas as demais** (incluindo a empatada não-vencedora) **não** contêm esse texto em lugar algum do `aria-label`.

## Justificativa

Testes existentes cobrem aria-labels literais em cenários específicos (vencedor único, empate parcial 2+1, permutação). **Gap:** falta um teste **focado exclusivamente na cardinalidade do sufixo** que opere por contagem agregada sobre todos os botões da lista, independente de cenário fixo. Isso protege contra:

1. Regressão onde o sufixo vaza para a 2ª empatada (bug `score === bestScore` ao invés de `index === winnerIndex`)
2. Regressão onde nenhum aria-label recebe o sufixo (bug de short-circuit em `isWinner`)
3. Regressão onde o sufixo aparece em variação não-empatada (bug de fallback)

A diferença em relação aos testes existentes é a **estratégia de asserção**: agregação `.filter()` sobre todos os botões + `expect(count).toBe(1)`, em vez de match literal por índice. Detecta regressões que afetem múltiplos cards simultaneamente.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("cardinalidade do sufixo 'melhor score' em empate: exatamente 1 aria-label contém o sufixo; demais não contêm em nenhuma posição", () => {
  // Empate triplo: todas com score 85 → winner determinístico = índice 0
  const variations = [
    buildVariation({ id: "var-A", qualityScore: 85 }, 0),
    buildVariation({ id: "var-B", qualityScore: 85 }, 1),
    buildVariation({ id: "var-C", qualityScore: 85 }, 2),
  ];
  renderTied(variations);

  // Coleta todos os botões "Selecionar variação N" do comparador
  const allSelectButtons = screen.getAllByRole("button", { name: /^Selecionar variação \d+/ });
  expect(allSelectButtons).toHaveLength(3);

  // 1. Cardinalidade: exatamente 1 botão tem ", melhor score" no aria-label
  const withWinnerSuffix = allSelectButtons.filter((btn) =>
    (btn.getAttribute("aria-label") ?? "").includes(", melhor score")
  );
  expect(withWinnerSuffix).toHaveLength(1);

  // 2. O único botão com sufixo é o do índice 0 (primeiro empatado, determinístico via findIndex)
  expect(withWinnerSuffix[0].getAttribute("aria-label")).toBe(
    "Selecionar variação 1, score 85, melhor score"
  );

  // 3. Todos os outros botões NÃO contêm "melhor score" em nenhum lugar do aria-label
  const withoutWinnerSuffix = allSelectButtons.filter((btn) =>
    !(btn.getAttribute("aria-label") ?? "").includes(", melhor score")
  );
  expect(withoutWinnerSuffix).toHaveLength(2);
  withoutWinnerSuffix.forEach((btn) => {
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).not.toContain("melhor score");
    expect(label).not.toMatch(/melhor/i);
  });

  // 4. Validação cruzada de cardinalidade visual: badge também aparece exatamente 1 vez
  const badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa helpers `buildVariation`, `renderTied`, `screen` já presentes
- Sem novos imports
- Estratégia agregada (`.filter().toHaveLength(1)`) detecta regressões que asserções literais por índice não pegariam (ex: sufixo vazando em ordem aleatória)

## Entregável

- 1 novo teste no grupo de empate (69 → 70 testes)
- Trava 4 invariantes: cardinalidade do sufixo (=1), identidade do vencedor (índice 0), exclusão completa do texto "melhor score" nos não-vencedores, paridade visual (badge=1)
- Cobertura WCAG 4.1.2 (Name/Role/Value) reforçada com asserção agregada
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 70/70 verde

