

# Plano — Teste: empate triplo sem `isWinner` → badge única no primeiro índice

Adiciono teste que valida o cenário canônico de empate triplo: **3 variações com mesmo score, nenhuma com `isWinner`**, garantindo que (1) renderiza exatamente 1 badge "Melhor score" e (2) o winner é o primeiro índice do array.

## Justificativa

Embora testes existentes cubram empate triplo com permutações (validando ordem) e cardinalidade do sufixo aria-label, **falta um teste canônico isolado** que sirva como "smoke test" do contrato mais básico: empate puro + ausência de `isWinner` + badge única + winner no índice 0. Este é o cenário base que protege contra:

1. Regressão onde múltiplas badges renderizem em empate (bug de loop que não respeita `isWinner` flag)
2. Regressão onde o winner deslize para outro índice em empate puro
3. Regressão onde o componente exija `isWinner` explícito para renderizar qualquer badge

Difere dos testes existentes pelo **foco**: asserção mínima e direta sobre o caso base, sem permutações ou variações de score, servindo como documentação executável do contrato canônico.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("empate triplo sem isWinner: renderiza exatamente 1 badge 'Melhor score' no primeiro índice", () => {
  const variations = [
    buildVariation({ id: "var-1", qualityScore: 75 }, 0),
    buildVariation({ id: "var-2", qualityScore: 75 }, 1),
    buildVariation({ id: "var-3", qualityScore: 75 }, 2),
  ];

  // Pré-condição: nenhuma variação tem isWinner explícito
  variations.forEach((v) => {
    expect(v.isWinner).toBeFalsy();
  });

  renderTied(variations);

  // 1. Cardinalidade: exatamente 1 badge no DOM
  const badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);

  // 2. Winner está no primeiro índice (var-1)
  const cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

  // 3. Aria-label do vencedor confirma índice 1 (UI 1-based) com sufixo
  const winnerBtn = screen.getByRole("button", {
    name: "Selecionar variação 1, score 75, melhor score",
  });
  expect(winnerBtn).toBeInTheDocument();

  // 4. Header confirma bestScore = 75
  expect(screen.getByLabelText(/Melhor score entre variações: 75/)).toBeInTheDocument();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa helpers `buildVariation`, `renderTied`, `within`, `screen` já presentes
- Sem novos imports
- Match literal `.toBe()` no aria-label completo detecta regressões sutis

## Entregável

- 1 novo teste no grupo de empate (71 → 72 testes)
- Trava 4 invariantes do contrato canônico:
  1. Pré-condição explícita: `isWinner` falsy em todas
  2. Cardinalidade: exatamente 1 badge
  3. Posição: winner no índice 0
  4. Aria-label literal completo do vencedor
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 72/72 verde

