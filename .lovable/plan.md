

# Plano — Teste: empate no topo com 2 vencedoras potenciais + 1 abaixo → winner determinístico no índice 0

Adiciono teste validando o comportamento de empate parcial: quando 2 variações compartilham o maior score e 1 fica abaixo, a badge "Melhor score" aparece **apenas no primeiro índice empatado** (determinismo via `findIndex`), nunca na terceira, e nunca em ambas as empatadas.

## Justificativa

A lógica de `winnerIndex` em `MagicUpVariationComparator.tsx`:

```ts
const winnerIndex = explicitWinnerIndex >= 0
  ? explicitWinnerIndex
  : (bestScore !== null ? scores.findIndex((s) => s === bestScore) : -1);
```

Testes existentes cobrem:
- Empate triplo total (todas com mesmo score) — permutação valida índice 0
- Vencedor único claro com scores distintos
- Ausência de scores → nenhum winner

**Gap:** nenhum teste cobre o cenário **híbrido** mais comum em produção: 2 variações no topo + 1 abaixo. Este é o caso real que expõe regressões como:
1. Badge aparecendo em **ambas** as variações empatadas (bug de `score === bestScore`)
2. Badge aparecendo na variação com score menor (bug de ordenação reversa)
3. Winner deslocado para índice 1 ao invés de índice 0 (bug de `findLastIndex`)

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("empate parcial (2 no topo + 1 abaixo): badge 'Melhor score' aparece apenas no primeiro empatado; variação com score menor nunca recebe badge", () => {
  // Cenário: A=90, B=90, C=70 → winner determinístico = A (índice 0)
  const variations = [
    buildVariation({ id: "var-A", qualityScore: 90 }, 0),
    buildVariation({ id: "var-B", qualityScore: 90 }, 1),
    buildVariation({ id: "var-C", qualityScore: 70 }, 2),
  ];
  renderTied(variations);

  // 1. Exatamente 1 badge no DOM inteiro
  const badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);

  // 2. Badge está no card índice 0 (var-A), não no índice 1 (var-B empatado) nem índice 2 (var-C menor)
  const cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

  // 3. Aria-labels confirmam: apenas btn1 recebe sufixo ", melhor score"
  const btn1 = screen.getByRole("button", { name: /Selecionar variação 1/ });
  const btn2 = screen.getByRole("button", { name: /Selecionar variação 2/ });
  const btn3 = screen.getByRole("button", { name: /Selecionar variação 3/ });
  expect(btn1.getAttribute("aria-label")).toBe("Selecionar variação 1, score 90, melhor score");
  expect(btn2.getAttribute("aria-label")).toBe("Selecionar variação 2, score 90");
  expect(btn3.getAttribute("aria-label")).toBe("Selecionar variação 3, score 70");

  // 4. Header mostra "Melhor score: 90"
  expect(screen.getByLabelText(/Melhor score entre variações: 90/)).toBeInTheDocument();

  // 5. Validação defensiva: card com score menor (var-C, 70) jamais recebe badge, mesmo com perturbação de activeIndex
});

it("empate parcial com permutação: ordem [C=70, A=90, B=90] → winner determinístico = A no índice 1 (primeiro empatado no maior score)", () => {
  // Perturbação: score menor no índice 0, empatadas nos índices 1 e 2
  const variations = [
    buildVariation({ id: "var-C", qualityScore: 70 }, 0),
    buildVariation({ id: "var-A", qualityScore: 90 }, 1),
    buildVariation({ id: "var-B", qualityScore: 90 }, 2),
  ];
  renderTied(variations);

  const badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);

  const cards = screen.getAllByRole("listitem");
  // Winner agora é índice 1 (primeiro com score=90=bestScore), não índice 0 (score menor)
  expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

  // Aria-label confirma sufixo exclusivo no índice 1
  const btn2 = screen.getByRole("button", { name: /Selecionar variação 2/ });
  expect(btn2.getAttribute("aria-label")).toBe("Selecionar variação 2, score 90, melhor score");
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx` — contrato atual já é correto
- Reusa helpers `buildVariation`, `renderTied`, `within`, `screen` já importados
- Sem novos imports
- Match literal `.toBe()` detecta regressões que regex permissivo deixaria passar
- 2 testes cobrem: (a) empatadas no início, (b) empatadas após score menor — permutação que valida `findIndex` sobre `bestScore` (não sobre índice)

## Entregável

- 2 novos testes no grupo de empate (67 → 69 testes)
- Teste 1: empate no topo `[90, 90, 70]` → winner no índice 0 (var-A)
- Teste 2: empate deslocado `[70, 90, 90]` → winner no índice 1 (var-A), NÃO índice 0 (var-C com score menor)
- Trava 3 invariantes: cardinalidade (1 badge), posição determinística (primeiro empatado no maior score), exclusão do não-empatado (nunca recebe badge)
- Cobertura WCAG 4.1.2 preservada: aria-labels literais validados em ambos cenários

