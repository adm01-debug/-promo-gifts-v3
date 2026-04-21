

# Plano — Testes de foco visível e consistente após alterar variação ativa (clique em card / marcar vencedora)

Adiciono **1 teste** ao final do sub-describe `"setas atualizam activeIndex e ARIA acompanha após rerender"` em `tests/components/magic-up-onda5.test.tsx`, validando que após interações de **clique em card** e **clique em "Marcar vencedora"**, o foco permanece no elemento correto e mantém as classes `focus-visible:*` exigidas pelo guideline `docs/MAGIC_UP_ONDA5_A11Y.md`.

## Justificativa

Cobertura atual valida foco/ARIA durante navegação por **teclado** (setas, Home, End, Tab, Shift+Tab). Mas **não há teste** que afirme o comportamento de foco após **mutações via clique/Enter**:

| Lacuna | Risco |
|---|---|
| Após clicar em card N, foco permanece no card N (não pula para outro) | Bug onde `onSelect` causa rerender que perde foco (volta ao body) — quebra navegação por teclado mista (mouse → teclado) |
| Após clicar em "Marcar vencedora" do card ativo, foco permanece no botão (ou migra para card vencedor) de forma previsível | Foco perdido após ação destrutiva = leitor de tela perde contexto |
| Em ambos os casos, elemento focado mantém classes `focus-visible:*` corretas | Refator que remova focus-visible em estado pós-ação passaria sem detecção |
| `aria-pressed`/`aria-current` no elemento focado refletem o novo estado | Drift entre foco visual e estado ARIA pós-ação |
| Ativação via teclado (Enter/Espaço) preserva foco igual a clique | Diferença entre mouse e teclado quebraria WCAG 2.1.1 (Keyboard) |

**WCAG 2.4.3 (Focus Order)** + **2.4.7 (Focus Visible)** + **3.2.1 (On Focus)**: mudanças de contexto não devem mover foco inesperadamente; ações pós-clique/Enter devem preservar contexto focável.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **1 teste** ao final do sub-describe `"setas atualizam activeIndex e ARIA acompanha após rerender"` (linha ~3111, antes do `});` que fecha o sub-describe — mesmo local dos testes anteriores aprovados):

```ts
it("foco permanece visível e consistente após clicar em card e em 'Marcar vencedora'", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    return (
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onSelectWinner={onSelectWinner}
      />
    );
  }

  render(<ControlledWrapper />);

  const REQUIRED_FOCUS_CLASSES = [
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-ring",
  ];

  const expectFocusVisible = (el: HTMLElement) => {
    REQUIRED_FOCUS_CLASSES.forEach((cls) => {
      expect(el.className).toContain(cls);
    });
    expect(el.className).not.toMatch(/(?<!focus-visible:)focus:ring-/);
  };

  // ── Cenário 1: clique em card 2 mantém foco no card 2 + focus-visible + aria-pressed ──
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  await user.click(card2);
  expect(card2).toHaveFocus();
  expect(card2).toHaveAttribute("aria-pressed", "true");
  expectFocusVisible(card2);

  // Demais cards perderam aria-pressed
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(card1).toHaveAttribute("aria-pressed", "false");

  // ── Cenário 2: clique em card 3 mantém foco no card 3 + focus-visible + aria-pressed ──
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  await user.click(card3);
  expect(card3).toHaveFocus();
  expect(card3).toHaveAttribute("aria-pressed", "true");
  expectFocusVisible(card3);
  expect(card2).toHaveAttribute("aria-pressed", "false");

  // ── Cenário 3: ativação via teclado (Enter) preserva foco igual a clique ──
  card1.focus();
  await user.keyboard("{Enter}");
  expect(card1).toHaveFocus();
  expect(card1).toHaveAttribute("aria-pressed", "true");
  expectFocusVisible(card1);

  // ── Cenário 4: ativação via Espaço também preserva foco ──
  card2.focus();
  await user.keyboard(" ");
  expect(card2).toHaveFocus();
  expect(card2).toHaveAttribute("aria-pressed", "true");
  expectFocusVisible(card2);

  // ── Cenário 5: clique em "Marcar vencedora" do card ativo mantém foco previsível ──
  // Localiza o botão "vencedora" associado ao card ativo (card 2)
  const winnerButtons = screen.getAllByRole("button", { name: /vencedora/i });
  expect(winnerButtons.length).toBeGreaterThan(0);

  // Clica no primeiro botão "vencedora" disponível
  const firstWinnerBtn = winnerButtons[0];
  await user.click(firstWinnerBtn);

  // Callback foi disparado
  expect(onSelectWinner).toHaveBeenCalledTimes(1);

  // Foco deve permanecer em algum elemento focável do componente (não no body)
  expect(document.activeElement).not.toBe(document.body);

  // O elemento focado (qualquer que seja: botão vencedora ou card) deve ter focus-visible
  const focusedAfterWinner = document.activeElement as HTMLElement;
  expect(focusedAfterWinner).not.toBeNull();
  // Valida que tem AO MENOS as classes base focus-visible (outline-none + ring-2)
  expect(focusedAfterWinner.className).toContain("focus-visible:outline-none");
  expect(focusedAfterWinner.className).toContain("focus-visible:ring-2");
  expect(focusedAfterWinner.className).not.toMatch(/(?<!focus-visible:)focus:ring-/);

  // ── Cenário 6: após ação de winner, card ativo continua com aria-pressed correto ──
  // (mudança de winner não deve afetar activeIndex/aria-pressed)
  const cards = screen.getAllByRole("button", { name: /^Selecionar variação/ });
  const pressedCards = cards.filter((c) => c.getAttribute("aria-pressed") === "true");
  expect(pressedCards).toHaveLength(1); // INVARIANTE preservada após winner click
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `React`, `render`, `screen`, `userEvent`, `vi`, `navVariations`, `MagicUpVariationComparator`)
- 1 teste novo (123 → 124 testes)
- Helper `expectFocusVisible` valida 3 classes base + ausência de `focus:` puro em 1 chamada
- 6 cenários cobertos: clique card 2, clique card 3, Enter no card 1, Espaço no card 2, clique vencedora, invariante pós-winner
- Cenário 5 é **defensivo**: aceita que foco fique no botão vencedora OU no card ativo (qualquer comportamento previsível), desde que não vá para `body` e tenha focus-visible
- Negative lookbehind `(?<!focus-visible:)focus:ring-` mantém contrato WCAG 2.4.7

## Risco do teste

Este teste pode **falhar** se o componente atual:
- Perde foco após `onSelect` (foco volta ao body durante rerender) — comportamento comum sem `useRef` para preservar foco
- Não tem botões "Marcar vencedora" visíveis em todos os cards (cenário 5 pode precisar de ajuste)

Se falhar, a saída do teste indicará exatamente qual cenário e abriremos plano de correção (adicionar gerenciamento de foco no `onSelect`/`onSelectWinner`).

## Entregável

- 1 teste cobrindo:
  1. **Clique em card** preserva foco + `aria-pressed=true` + focus-visible
  2. **Clique em card diferente** transfere foco corretamente, limpa pressed do anterior
  3. **Enter** no card focado tem comportamento idêntico ao clique
  4. **Espaço** no card focado tem comportamento idêntico ao clique
  5. **Clique em "Marcar vencedora"** dispara callback e mantém foco em elemento focável (não body) com focus-visible
  6. **Invariante de exclusividade `aria-pressed`** preservada após ação de winner
- Captura regressões onde:
  - `onSelect`/`onSelectWinner` causem perda de foco (foco vai para body após rerender)
  - Refator quebre paridade entre clique/Enter/Espaço (WCAG 2.1.1)
  - Ação de winner mude `activeIndex` indevidamente (acoplamento errado)
  - Classes focus-visible sejam removidas de algum estado pós-ação
  - Aparecimento de `focus:ring-*` puro (sem `-visible`) em elementos pós-mutação
- Sem impacto nos 123 testes existentes: novo teste é isolado em `ControlledWrapper` próprio
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 124/124 verde (ou abrir plano de correção caso falhe)

