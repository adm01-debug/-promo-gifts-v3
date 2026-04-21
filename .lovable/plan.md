

# Plano — Testes de Tab/Shift+Tab e sincronia ARIA com activeIndex

Adiciono **2 testes** ao final do sub-describe `"navegação por setas/Home/End"` (ou em novo sub-describe `"navegação por Tab/Shift+Tab"`) em `tests/components/magic-up-onda5.test.tsx`, validando que:

1. **Tab e Shift+Tab percorrem os cards na ordem correta** (DOM order: card1 → card2 → card3 → botões "Marcar vencedora" → e reverso com Shift+Tab)
2. **`activeIndex` (controlado externamente) sincroniza atributos ARIA** (`aria-pressed`, `aria-current`) em todos os cards conforme o estado muda, sem depender de Tab para mudar seleção (Tab apenas move foco, não muda seleção — comportamento WAI-ARIA correto para grids tipo "select on activate")

## Justificativa

Cobertura atual valida ativação por Enter/Space, navegação por setas/Home/End e estabilidade do DOM, mas **não valida explicitamente**:

| Lacuna | Risco |
|---|---|
| Ordem de Tab entre os cards | Se um card ganhar `tabindex=-1` acidentalmente (roving mal implementado), Tab pula card e quebra navegação sequencial |
| Tab atravessa também os botões "Marcar vencedora" na ordem certa | Reordenação de DOM no JSX quebra fluxo de teclado silenciosamente |
| Tab **não muda** `activeIndex`/`aria-pressed` (apenas Enter/Space mudam) | Implementação futura pode adicionar `onFocus={() => onSelect(i)}` (anti-padrão) — quebra UX de "explorar antes de selecionar" |
| Mudança externa de `activeIndex` propaga ARIA para **todos** os cards simultaneamente | Re-render parcial pode deixar card antigo com `aria-pressed="true"` e novo também — estado inconsistente |

**Princípios WAI-ARIA**:
- `aria-pressed` deve refletir o **modelo de dados** (`activeIndex`), não o foco do DOM
- Tab navega; Enter/Space ativa — separação estrita

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 2 testes ao final do sub-describe relevante (preferência: `"navegação por setas/Home/End"`):

#### Teste 1 — Tab/Shift+Tab percorre cards na ordem correta

```ts
it("Tab percorre os 3 cards e botões 'Marcar vencedora' em ordem DOM, Shift+Tab faz o reverso", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    return (
      <>
        <button data-testid="before-sentinel">antes</button>
        <MagicUpVariationComparator
          variations={navVariations}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onSelectWinner={onSelectWinner}
        />
        <button data-testid="after-sentinel">depois</button>
      </>
    );
  }

  render(<ControlledWrapper />);

  const beforeSentinel = screen.getByTestId("before-sentinel");
  const afterSentinel = screen.getByTestId("after-sentinel");
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  const winner1 = screen.getByRole("button", { name: /Marcar variação 1 como vencedora/ });
  const winner2 = screen.getByRole("button", { name: /Marcar variação 2 como vencedora/ });
  const winner3 = screen.getByRole("button", { name: /Marcar variação 3 como vencedora/ });

  // ── Tab: ordem direta ──
  beforeSentinel.focus();
  expect(beforeSentinel).toHaveFocus();

  // Sequência esperada (DOM order): card1, winner1, card2, winner2, card3, winner3, afterSentinel
  // (cada card é seguido pelo seu botão "Marcar vencedora" no JSX)
  const expectedForwardSequence = [card1, winner1, card2, winner2, card3, winner3, afterSentinel];

  for (const expected of expectedForwardSequence) {
    await user.tab();
    expect(expected).toHaveFocus();
  }

  // ── Shift+Tab: ordem reversa ──
  // Foco está em afterSentinel; volta percorrendo: winner3, card3, winner2, card2, winner1, card1, beforeSentinel
  const expectedReverseSequence = [winner3, card3, winner2, card2, winner1, card1, beforeSentinel];

  for (const expected of expectedReverseSequence) {
    await user.tab({ shift: true });
    expect(expected).toHaveFocus();
  }

  // Nenhum side effect — Tab não dispara onSelect nem onSelectWinner
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

#### Teste 2 — Tab não muda `activeIndex`; mudança externa de `activeIndex` sincroniza ARIA em todos os cards

```ts
it("Tab move foco sem alterar aria-pressed; mudança externa de activeIndex sincroniza ARIA em todos os cards", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();
  let setActiveIndexExternal: ((i: number) => void) | null = null;

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    setActiveIndexExternal = setActiveIndex;
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

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });

  // Estado inicial: card1 ativo
  expect(card1).toHaveAttribute("aria-pressed", "true");
  expect(card1).toHaveAttribute("aria-current", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");
  expect(card3).toHaveAttribute("aria-pressed", "false");
  expect(card3).not.toHaveAttribute("aria-current");

  // ── Tab até card2: foco muda, ARIA NÃO muda ──
  card1.focus();
  expect(card1).toHaveFocus();
  await user.tab(); // → winner1
  await user.tab(); // → card2
  expect(card2).toHaveFocus();

  // card1 ainda é o ativo (Tab não selecionou card2)
  expect(card1).toHaveAttribute("aria-pressed", "true");
  expect(card1).toHaveAttribute("aria-current", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");

  // ── Tab até card3: ARIA continua imutável ──
  await user.tab(); // → winner2
  await user.tab(); // → card3
  expect(card3).toHaveFocus();
  expect(card1).toHaveAttribute("aria-pressed", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card3).toHaveAttribute("aria-pressed", "false");

  // ── Mudança externa de activeIndex (simula seleção via lógica de pai) ──
  await act(async () => {
    setActiveIndexExternal!(2);
  });

  // ARIA propaga sincronamente para TODOS os cards
  expect(card1).toHaveAttribute("aria-pressed", "false");
  expect(card1).not.toHaveAttribute("aria-current");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");
  expect(card3).toHaveAttribute("aria-pressed", "true");
  expect(card3).toHaveAttribute("aria-current", "true");

  // Exclusividade: exatamente 1 card pressed
  const pressedCount = [card1, card2, card3].filter(
    (c) => c.getAttribute("aria-pressed") === "true"
  ).length;
  expect(pressedCount).toBe(1);

  // ── Mudança externa para card2 ──
  await act(async () => {
    setActiveIndexExternal!(1);
  });

  expect(card1).toHaveAttribute("aria-pressed", "false");
  expect(card2).toHaveAttribute("aria-pressed", "true");
  expect(card2).toHaveAttribute("aria-current", "true");
  expect(card3).toHaveAttribute("aria-pressed", "false");
  expect(card3).not.toHaveAttribute("aria-current");

  // Foco não foi roubado pela mudança de activeIndex (continua onde estava)
  expect(card3).toHaveFocus();

  // Side effect zero
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `userEvent`, `vi`, `React`, `act`, `MagicUpVariationComparator`, `navVariations`)
- Se `act` ainda não estiver importado no arquivo, adicionar ao import existente de `@testing-library/react`
- 2 testes novos (110 → 112 testes)
- Sem `user.click()` — toda navegação via teclado puro
- Sentinelas `before-sentinel`/`after-sentinel` confirmam que Tab entra/sai do comparador sem trap

## Entregável

- 2 testes cobrindo:
  1. **Ordem de Tab**: percorre exatamente `card1 → winner1 → card2 → winner2 → card3 → winner3` (entrelaçado conforme JSX) e sai para sentinela posterior
  2. **Ordem de Shift+Tab**: percurso reverso idêntico, retornando à sentinela anterior
  3. **Tab não dispara `onSelect`/`onSelectWinner`**: navegação é estritamente passiva
  4. **Tab não altera `aria-pressed`/`aria-current`**: foco é desacoplado de seleção (modelo WAI-ARIA correto)
  5. **Mudança externa de `activeIndex` sincroniza todos os cards**: card antigo perde `aria-pressed`/`aria-current`, novo ganha, simultaneamente
  6. **Exclusividade**: sempre exatamente 1 card com `aria-pressed="true"`
  7. **Foco preservado durante mudança externa**: re-render por mudança de `activeIndex` não rouba foco do elemento focado
- Captura regressões onde:
  - Card ganhe `tabindex=-1` indevido (roving mal implementado)
  - Reordenação JSX quebre sequência de Tab (ex: botão "Marcar vencedora" movido para fora do card)
  - Implementação futura adicione `onFocus={() => onSelect(i)}` (anti-padrão "select on focus")
  - Re-render por mudança de `activeIndex` cause remount e perda de foco
  - Card antigo mantenha `aria-pressed="true"` após nova seleção (estado inconsistente)
  - Keyboard trap: Tab não consiga sair do comparador para `after-sentinel`
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 112/112 verde

