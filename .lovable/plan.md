

# Plano — Asserts dedicados de `aria-pressed` antes/depois do clique no teste de invariância

Reforço o teste `badge 'Melhor score' permanece no winnerIndex...` com um **bloco focal de asserts de `aria-pressed`** capturados **antes e depois** de cada clique, comparando lado a lado o estado do card clicado vs. o card do winner. Isso isola explicitamente as duas dimensões ortogonais (seleção vs. vencedor) em snapshots diretos.

## Justificativa

O teste atual valida `aria-pressed` dentro do helper `assertWinnerInvariant` (em todos os 3 cards), mas:

1. As asserções de `aria-pressed` ficam **misturadas** com 6 outras invariantes — fica difícil ler "o que mudou no clique" isoladamente
2. Não há **comparação direta** entre o estado **antes** e **depois** do mesmo clique no mesmo card
3. Falta um snapshot focal que prove "este clique mudou `aria-pressed` deste card de false→true, e o card do winner manteve sua badge"

O novo bloco captura, para cada um dos 3 cliques, um **par de tuplas** `[clickedAriaPressed, winnerAriaPressed, winnerBadgePresent]` antes e depois, provando:
- Card clicado: `aria-pressed` muda de `"false"` → `"true"` (exceto quando já era ativo)
- Card do winner: `aria-pressed` muda **apenas** se for o card clicado; badge nunca desaparece
- Caso especial coberto: clique no próprio winner (var-B) — `aria-pressed` vira `"true"` E badge permanece

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar dentro do teste `badge 'Melhor score' permanece no winnerIndex...`, **substituindo** os 3 blocos de clique existentes por uma versão refatorada que captura snapshots antes/depois:

```ts
// Helper: captura snapshot focal de aria-pressed + presença da badge do winner
const captureSnapshot = (clickedIndex: number) => {
  const cards = screen.getAllByRole("listitem");
  const clickedButton = within(cards[clickedIndex]).getByRole("button", {
    name: /^Selecionar variação/,
  });
  const winnerButton = within(cards[winnerIndex]).getByRole("button", {
    name: /^Selecionar variação/,
  });
  return {
    clickedAriaPressed: clickedButton.getAttribute("aria-pressed"),
    winnerAriaPressed: winnerButton.getAttribute("aria-pressed"),
    winnerBadgePresent: within(cards[winnerIndex]).queryByLabelText("Melhor score") !== null,
    winnerBadgeText: within(cards[winnerIndex]).queryByText("Melhor score") !== null,
  };
};

// Helper: executa ciclo clique → rerender com snapshots antes/depois
const clickAndAssertSnapshot = async (
  clickIndex: number,
  newActiveIndex: number,
  expectedBefore: ReturnType<typeof captureSnapshot>,
  expectedAfter: ReturnType<typeof captureSnapshot>
) => {
  const beforeSnapshot = captureSnapshot(clickIndex);
  expect(beforeSnapshot).toEqual(expectedBefore);

  const cardsForClick = screen.getAllByRole("listitem");
  await user.click(
    within(cardsForClick[clickIndex]).getByRole("button", { name: /^Selecionar variação/ })
  );
  expect(onSelect).toHaveBeenLastCalledWith(clickIndex);
  rerender(renderWithActive(newActiveIndex));

  const afterSnapshot = captureSnapshot(clickIndex);
  expect(afterSnapshot).toEqual(expectedAfter);
};

// Estado inicial: activeIndex=0
assertWinnerInvariant(0);

// CLIQUE 1: var-B (winnerIndex=1) — caso especial: clicado === winner
// Antes: var-B não está pressed (active=0), badge presente
// Depois: var-B pressed=true, badge AINDA presente (mesmo card)
await clickAndAssertSnapshot(
  1,
  1,
  {
    clickedAriaPressed: "false",
    winnerAriaPressed: "false", // mesmo card, mesmo valor
    winnerBadgePresent: true,
    winnerBadgeText: true,
  },
  {
    clickedAriaPressed: "true",
    winnerAriaPressed: "true", // mesmo card, mesmo valor
    winnerBadgePresent: true, // INVARIANTE: badge não some
    winnerBadgeText: true,
  }
);
assertWinnerInvariant(1);

// CLIQUE 2: var-C (clickIndex=2) — clicado ≠ winner
// Antes: var-C pressed=false, var-B pressed=true (era active)
// Depois: var-C pressed=true, var-B pressed=false, badge AINDA em var-B
await clickAndAssertSnapshot(
  2,
  2,
  {
    clickedAriaPressed: "false",
    winnerAriaPressed: "true", // var-B era active
    winnerBadgePresent: true,
    winnerBadgeText: true,
  },
  {
    clickedAriaPressed: "true",
    winnerAriaPressed: "false", // seleção saiu de var-B
    winnerBadgePresent: true, // INVARIANTE: badge não migra para var-C
    winnerBadgeText: true,
  }
);
assertWinnerInvariant(2);

// CLIQUE 3: var-A (clickIndex=0) — clicado ≠ winner, vinha de var-C
// Antes: var-A pressed=false, var-B pressed=false (active=2)
// Depois: var-A pressed=true, var-B pressed=false (badge intacta em var-B)
await clickAndAssertSnapshot(
  0,
  0,
  {
    clickedAriaPressed: "false",
    winnerAriaPressed: "false",
    winnerBadgePresent: true,
    winnerBadgeText: true,
  },
  {
    clickedAriaPressed: "true",
    winnerAriaPressed: "false",
    winnerBadgePresent: true, // INVARIANTE: badge persiste em var-B
    winnerBadgeText: true,
  }
);
assertWinnerInvariant(0);

// Auditoria final preservada
expect(onSelect).toHaveBeenCalledTimes(3);
expect(onSelect.mock.calls.map((c) => c[0])).toEqual([1, 2, 0]);
expect(onSelectWinner).not.toHaveBeenCalled();
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem alteração nos demais testes (77 outros casos preservados)
- Sem novos imports (reusa `within`, `screen`, `user`, `rerender`)
- Mantém o helper `assertWinnerInvariant` existente — os novos snapshots **complementam**, não substituem
- Estrutura de helper local (`captureSnapshot` + `clickAndAssertSnapshot`) torna cada clique auto-documentado

## Entregável

- 1 teste reforçado (78 → 78 testes; volume de asserts dentro do teste cresce)
- 3 ciclos antes/depois × 4 campos por snapshot = **24 asserts focais adicionais** sobre `aria-pressed` e badge
- Trava 4 invariantes lado a lado:
  1. Clique muda `aria-pressed` do card clicado de `"false"` → `"true"`
  2. Card do winner perde `aria-pressed="true"` apenas se a seleção sair dele
  3. Badge do winner (`aria-label` + texto visível) **nunca** desaparece em nenhum dos 3 cliques
  4. Caso especial `clickedIndex === winnerIndex`: `aria-pressed` do winner vira `"true"` E badge permanece
- Captura regressões onde:
  - Badge fosse vinculada acidentalmente a `aria-pressed` (sumiria no clique fora do winner)
  - `aria-pressed` ficasse "preso" em `"true"` no card que perdeu seleção
  - Re-render acidentalmente desmontasse a badge
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 78/78 verde

