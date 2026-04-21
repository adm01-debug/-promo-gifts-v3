

# Plano — Teste: duas variações com `isWinner: true` simultâneo → primeira vence, badge única

Adiciono teste validando o comportamento quando o contrato `isWinner` é violado por upstream (duas variações marcadas como vencedoras). O componente deve ser **resiliente**: usar `findIndex` (não `findLastIndex` nem `filter`), garantindo que apenas a **primeira** ocorrência receba a badge.

## Justificativa

A linha-chave em `MagicUpVariationComparator.tsx`:
```ts
const explicitWinnerIndex = variations.findIndex((variation) => variation.isWinner);
```

`findIndex` retorna o **primeiro** match. Se 2+ variações vierem com `isWinner: true` (bug de upstream, race condition de seleção, payload inconsistente), o componente deve degradar graciosamente exibindo **apenas 1 badge no primeiro índice marcado**, sem quebrar a UI nem renderizar múltiplas badges.

**Gap nos 73 testes atuais:** todos os cenários com `isWinner` usam exatamente 1 variação marcada. Nenhum cobre a violação de contrato (2 marcadas), que é exatamente o tipo de regressão que aparece quando alguém troca `findIndex` por `filter().map()` ou `findLastIndex` numa refatoração.

Regressões que este teste captura:
1. Troca de `findIndex` por `findLastIndex` → badge no segundo marcado em vez do primeiro
2. Troca por `filter()` → múltiplas badges renderizadas
3. Remoção do early-return de `explicitWinnerIndex` → fallback para score escolhe outro índice
4. Bug onde score maior "rouba" o título mesmo com `isWinner` explícito

## Cenário do teste

3 variações com scores **diferentes** (para isolar o caminho `isWinner` do caminho score-fallback):
- `var-A`: score 60, `isWinner: true` ← deve vencer (primeiro marcado)
- `var-B`: score 95, `isWinner: false` ← maior score, mas perde
- `var-C`: score 80, `isWinner: true` ← segundo marcado, perde

Confirma simultaneamente que:
- `isWinner` tem prioridade sobre score (var-B com 95 não vence)
- `findIndex` retorna o primeiro (var-A vence, não var-C)
- Apenas 1 badge no DOM

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("dois isWinner: true simultâneos: apenas o primeiro marcado recebe badge (findIndex determinístico)", () => {
  const variations = [
    buildVariation({ id: "var-A", qualityScore: 60, isWinner: true }, 0),
    buildVariation({ id: "var-B", qualityScore: 95, isWinner: false }, 1),
    buildVariation({ id: "var-C", qualityScore: 80, isWinner: true }, 2),
  ];

  // Pré-condições: confirma cenário (2 com isWinner=true, scores distintos)
  expect(variations.filter((v) => v.isWinner === true)).toHaveLength(2);
  expect(variations[0].isWinner).toBe(true);
  expect(variations[2].isWinner).toBe(true);

  renderTied(variations);

  // 1. Cardinalidade: exatamente 1 badge no DOM (não 2)
  const badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);

  // 2. Badge está no primeiro índice (var-A), NÃO no segundo marcado (var-C)
  //    e NÃO no de maior score (var-B)
  const cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

  // 3. Aria-label completo do vencedor: var-A com score 60 + sufixo "melhor score"
  const winnerBtn = screen.getByRole("button", {
    name: "Selecionar variação 1, score 60, melhor score",
  });
  expect(winnerBtn).toBeInTheDocument();

  // 4. var-B (maior score) NÃO recebe sufixo, mesmo sendo o melhor numérico
  const varBBtn = screen.getByRole("button", {
    name: "Selecionar variação 2, score 95",
  });
  expect(varBBtn).toBeInTheDocument();

  // 5. var-C (segundo marcado como winner) NÃO recebe sufixo
  const varCBtn = screen.getByRole("button", {
    name: "Selecionar variação 3, score 80",
  });
  expect(varCBtn).toBeInTheDocument();

  // 6. Asserção agregada: nenhum outro botão de seleção contém "melhor score"
  const allSelectButtons = screen.getAllByRole("button", { name: /^Selecionar variação/ });
  const withSuffix = allSelectButtons.filter((btn) =>
    (btn.getAttribute("aria-label") ?? "").includes("melhor score")
  );
  expect(withSuffix).toHaveLength(1);

  // 7. Header confirma bestScore = 95 (var-B), provando que score e winner são lógicas independentes
  expect(screen.getByLabelText(/Melhor score entre variações: 95/)).toBeInTheDocument();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa helpers `buildVariation`, `renderTied`, `within`, `screen` já presentes
- Sem novos imports
- Pré-condição explícita do cenário documenta a violação de contrato testada
- Asserção 7 valida que o header bestScore (numérico) **diverge** da badge winner (`isWinner`), confirmando que são caminhos independentes

## Pré-requisito

Confirmar que `buildVariation` aceita `isWinner` no override. Pelos testes anteriores aprovados (que usam `qualityScore` em overrides), o helper já faz spread do override sobre defaults, então `isWinner: true` deve funcionar sem ajuste.

## Entregável

- 1 novo teste no grupo de empate (73 → 74 testes)
- Trava 6 invariantes:
  1. Cardinalidade: exatamente 1 badge mesmo com 2 marcados
  2. Determinismo: primeiro `isWinner` vence (var-A no índice 0), não o segundo (var-C)
  3. Prioridade: `isWinner` vence sobre score (var-B com 95 não recebe badge)
  4. Aria-label literal completo do vencedor
  5. Asserção agregada: sufixo "melhor score" aparece em exatamente 1 aria-label
  6. Independência: header bestScore (95) ≠ winner score (60)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 74/74 verde

