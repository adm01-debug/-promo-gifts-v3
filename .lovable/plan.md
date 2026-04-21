

# Plano — Testes de Home/End movem foco e atualizam activeIndex

Adiciono **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` em `tests/components/magic-up-onda5.test.tsx`, validando explicitamente que **Home** e **End** movem o foco para o card correto E atualizam `activeIndex` via `onSelect`, com asserções declarativas sobre `toHaveFocus()` e `aria-pressed`.

## Justificativa

A cobertura atual valida setas (`ArrowRight`/`ArrowLeft`) movendo foco, e os testes recentes de Enter/Espaço usam Home/End **como precondição** — mas não há teste **dedicado** que afirme:

| Lacuna | Risco |
|---|---|
| Home a partir de card no meio move foco para card 1 | Refator que faça Home navegar 1 posição (em vez de saltar) passaria silenciosamente |
| End a partir de card no meio move foco para último card | Mesmo risco simétrico |
| `onSelect` é chamado com `0` (Home) e `N-1` (End) — não com índice intermediário | Off-by-one em `total - 1` quebraria End |
| `aria-pressed` reflete o novo `activeIndex` após rerender controlado | ARIA stale após Home/End é regressão grave de a11y |
| Home/End funcionam **independentemente da posição inicial** (não só do card 1) | Bug de "Home só funciona se vier de ArrowRight" passaria |

**WAI-ARIA Listbox/Grid pattern**: Home/End são saltos absolutos (não relativos). Teste declarativo trava o contrato.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` (após o teste `"Espaço após Home/End ativa card focado..."`, antes do `});` que fecha o sub-describe):

```ts
it("Home e End movem foco e atualizam activeIndex independentemente da posição inicial", async () => {
  const user = userEvent.setup();

  function ControlledWrapper({ initial }: { initial: number }) {
    const [activeIndex, setActiveIndex] = React.useState(initial);
    return (
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onSelectWinner={vi.fn()}
      />
    );
  }

  // ── Cenário A: partindo do meio (card 3 de 5), End vai para último ──
  const { unmount } = render(<ControlledWrapper initial={2} />);
  const total = navVariations.length;
  const lastIndex = total - 1;

  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  card3.focus();
  expect(card3).toHaveFocus();
  expect(card3).toHaveAttribute("aria-pressed", "true");

  await user.keyboard("{End}");
  const lastCard = screen.getByRole("button", {
    name: new RegExp(`^Selecionar variação ${lastIndex + 1}`),
  });
  expect(lastCard).toHaveFocus();
  expect(lastCard).toHaveAttribute("aria-pressed", "true");
  // card 3 perdeu o pressed
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toHaveAttribute("aria-pressed", "false");

  // ── Home a partir do último vai direto para card 1 (não decrementa) ──
  await user.keyboard("{Home}");
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(card1).toHaveFocus();
  expect(card1).toHaveAttribute("aria-pressed", "true");
  expect(lastCard).toHaveAttribute("aria-pressed", "false");

  unmount();

  // ── Cenário B: partindo do último, Home vai para card 1 (sem passos intermediários) ──
  render(<ControlledWrapper initial={lastIndex} />);
  const lastCardB = screen.getByRole("button", {
    name: new RegExp(`^Selecionar variação ${lastIndex + 1}`),
  });
  lastCardB.focus();
  expect(lastCardB).toHaveFocus();

  await user.keyboard("{Home}");
  const card1B = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(card1B).toHaveFocus();
  expect(card1B).toHaveAttribute("aria-pressed", "true");

  // End a partir do card 1 → último
  await user.keyboard("{End}");
  const lastCardB2 = screen.getByRole("button", {
    name: new RegExp(`^Selecionar variação ${lastIndex + 1}`),
  });
  expect(lastCardB2).toHaveFocus();
  expect(lastCardB2).toHaveAttribute("aria-pressed", "true");
  expect(card1B).toHaveAttribute("aria-pressed", "false");
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `React`, `render`, `screen`, `userEvent`, `vi`, `navVariations`, `MagicUpVariationComparator`)
- 1 teste novo (118 → 119 testes)
- Usa `ControlledWrapper` interno (padrão já presente no arquivo) para garantir rerender quando `setActiveIndex` é chamado — sem isso, `aria-pressed` não atualizaria
- Testa **2 cenários** (partindo do meio e do último) para blindar contra bug "Home/End só funcionam a partir do card 1"
- Asserção dupla por etapa: `toHaveFocus()` + `aria-pressed` para travar foco visual E estado ARIA juntos
- Cobertura simétrica Home↔End evita regressão unilateral

## Entregável

- 1 teste cobrindo:
  1. **End a partir do meio** (card 3) → foco e `aria-pressed=true` no último card
  2. **Home após End** → foco volta direto ao card 1 (salto absoluto, não decremento)
  3. **Home a partir do último** → foco no card 1 sem passos intermediários
  4. **End a partir do card 1** → foco no último card
  5. **`aria-pressed` do card anterior vira `"false"`** após cada salto (estado limpo)
- Captura regressões onde:
  - `Home` faça `currentIndex - 1` em vez de saltar para `0`
  - `End` use `total` (off-by-one) em vez de `total - 1`
  - Foco seja movido mas `onSelect` não seja chamado (ARIA stale)
  - `aria-pressed` antigo permaneça `"true"` após salto (múltiplos cards "pressed")
  - Refator condicione Home/End a partir apenas do card 1 (lógica errada de origem)
- Sem impacto nos 118 testes existentes: novo teste é isolado em `ControlledWrapper` próprio com `unmount()` entre cenários
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 119/119 verde

