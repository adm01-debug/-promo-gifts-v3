

# Plano — Teste: estabilidade do `winnerIndex` em empate sob permutação

Adiciono teste validando que `findIndex` mantém o contrato "primeiro índice do array vence em empate" mesmo quando a ordem das variações é permutada — o vencedor sempre é o **primeiro do array atual**, não da ordem semântica anterior.

## Justificativa

A lógica atual em `MagicUpVariationComparator.tsx`:

```ts
const winnerIndex = explicitWinnerIndex >= 0
  ? explicitWinnerIndex
  : (bestScore !== null ? scores.findIndex((s) => s === bestScore) : -1);
```

`findIndex` percorre o array na ordem fornecida e retorna o **primeiro** match. Em empate de score, isso significa:
- Array `[A=80, B=80, C=80]` → vencedor = A (índice 0)
- Array permutado `[B=80, A=80, C=80]` → vencedor = B (índice 0)
- Array permutado `[C=80, B=80, A=80]` → vencedor = C (índice 0)

O contrato é: **a ordem do array recebido em `props.variations` define quem vence em empate** — sempre o índice 0 dentre os empatados no maior score.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("estabilidade sob permutação: empate triplo (80) — vencedor é sempre o índice 0 do array, independente de qual variação ocupe essa posição", () => {
  const variantA = { id: "var-A", qualityScore: 80 };
  const variantB = { id: "var-B", qualityScore: 80 };
  const variantC = { id: "var-C", qualityScore: 80 };

  // Permutação 1: [A, B, C] → vencedor = A (índice 0)
  const { unmount: unmount1 } = renderTied([
    buildVariation(variantA, 0),
    buildVariation(variantB, 1),
    buildVariation(variantC, 2),
  ]);
  let badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);
  let cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
  unmount1();

  // Permutação 2: [B, A, C] → vencedor = B (índice 0)
  const { unmount: unmount2 } = renderTied([
    buildVariation(variantB, 0),
    buildVariation(variantA, 1),
    buildVariation(variantC, 2),
  ]);
  badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);
  cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
  unmount2();

  // Permutação 3: [C, B, A] → vencedor = C (índice 0)
  renderTied([
    buildVariation(variantC, 0),
    buildVariation(variantB, 1),
    buildVariation(variantA, 2),
  ]);
  badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);
  cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
});
```

**Verificação prévia:** se `renderTied` não retorna `unmount`, ajustar para usar `cleanup()` do `@testing-library/react` entre permutações, ou separar em 3 `it()` independentes (Vitest já isola DOM por teste). Caso `renderTied` retorne o objeto `RenderResult` completo, `unmount` está disponível nativamente.

**Plano B (se `renderTied` ofuscar `unmount`):** dividir em 3 testes consecutivos:
```ts
it("permutação [A,B,C]: vencedor = A no índice 0", () => { /* ... */ });
it("permutação [B,A,C]: vencedor = B no índice 0", () => { /* ... */ });
it("permutação [C,B,A]: vencedor = C no índice 0", () => { /* ... */ });
```

Cobertura: 65 → 66 testes (1 teste com 3 permutações) ou 65 → 68 (3 testes separados).

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx` — comportamento atual já é o contrato correto
- Reusa helpers `buildVariation`, `renderTied`, `within` já importados
- Sem novos imports
- Validação adicional: `id` distinto por variação garante que o teste rastreia a identidade real, não apenas a posição

## Entregável

- 1 novo teste (ou 3, conforme assinatura de `renderTied`) validando estabilidade do `winnerIndex` sob permutação
- Trava contrato: empate em score → vencedor é sempre `array[0]` dentre os empatados, **determinístico pela ordem de entrada**
- Cobertura WCAG 4.1.2 (Name/Role/Value) preservada: badge sempre no índice 0 com `aria-label="Melhor score"`

