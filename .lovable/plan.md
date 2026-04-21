

# Plano — Teste: aria-labels completos validam atribuição exclusiva da badge "Melhor score"

Adiciono teste que valida o `aria-label` **completo e literal** dos botões de cada variação em um cenário com vencedor claro, garantindo que apenas o card vencedor recebe o sufixo `, melhor score` — nenhum outro card recebe a marcação indevidamente.

## Justificativa

A lógica de `aria-label` em `MagicUpVariationComparator.tsx`:

```ts
aria-label={`Selecionar variação ${index + 1}${score !== null ? `, score ${score}` : ""}${isWinner ? ", melhor score" : ""}`}
```

Testes existentes validam:
- Presença da badge visual `<Badge aria-label="Melhor score">` por card
- Aria-label do botão vencedor isoladamente

**Gap:** nenhum teste valida o `aria-label` **literal e completo** de **todas** as variações simultaneamente, garantindo via string-match exato que:
1. O vencedor tem o sufixo `, melhor score` no final
2. **Cada não-vencedor** tem aria-label que termina **exatamente** após `, score N` (sem qualquer menção a "melhor score")
3. Os scores numéricos no aria-label refletem o `qualityScore` real de cada variação

Isso protege contra regressões sutis como: vazamento do sufixo para múltiplos cards, ordem incorreta de concatenação, ou aplicação do sufixo via lógica errada (`bestScore === score` em vez de `index === winnerIndex`).

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("aria-labels completos: cenário com vencedor claro — apenas o card vencedor recebe sufixo ', melhor score'; demais terminam exatamente em ', score N'", () => {
  const variations = [
    buildVariation({ id: "var-A", qualityScore: 60 }, 0),
    buildVariation({ id: "var-B", qualityScore: 95 }, 1), // vencedor
    buildVariation({ id: "var-C", qualityScore: 78 }, 2),
  ];
  renderTied(variations);

  const btn1 = screen.getByRole("button", { name: /Selecionar variação 1/ });
  const btn2 = screen.getByRole("button", { name: /Selecionar variação 2/ });
  const btn3 = screen.getByRole("button", { name: /Selecionar variação 3/ });

  // Match literal completo (string igual, sem regex)
  expect(btn1.getAttribute("aria-label")).toBe("Selecionar variação 1, score 60");
  expect(btn2.getAttribute("aria-label")).toBe("Selecionar variação 2, score 95, melhor score");
  expect(btn3.getAttribute("aria-label")).toBe("Selecionar variação 3, score 78");

  // Validação cruzada: apenas 1 ocorrência de ", melhor score" em todo o DOM de aria-labels
  const allButtons = [btn1, btn2, btn3];
  const labelsWithWinner = allButtons.filter((b) =>
    (b.getAttribute("aria-label") ?? "").includes(", melhor score")
  );
  expect(labelsWithWinner).toHaveLength(1);
  expect(labelsWithWinner[0]).toBe(btn2);

  // Validação defensiva: não-vencedores não terminam com sufixo de winner
  expect(btn1.getAttribute("aria-label")).not.toMatch(/, melhor score$/);
  expect(btn3.getAttribute("aria-label")).not.toMatch(/, melhor score$/);
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx` — comportamento atual já é o contrato correto
- Reusa helpers `buildVariation`, `renderTied`, `screen` já importados
- Sem novos imports
- Match literal de string (`.toBe(...)`) detecta regressões sutis que regex permissivo deixaria passar

## Entregável

- 1 novo teste validando aria-label literal de 3 variações com vencedor único (índice 1)
- 3 assertivas literais (`.toBe`) + 1 validação cruzada de cardinalidade + 2 defensivas de sufixo
- Cobertura: 66 → 67 testes
- Trava contrato a11y (WCAG 4.1.2 Name/Role/Value): sufixo `, melhor score` só aparece no card vencedor — nunca vaza para outros

