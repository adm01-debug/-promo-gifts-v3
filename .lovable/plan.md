

# Plano — Testes de consistência de aria-pressed/aria-current durante navegação por setas

Adiciono **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` em `tests/components/magic-up-onda5.test.tsx`, validando que a cada movimento de seta, **exatamente um** card mantém `aria-pressed="true"` (o ativo) e que `aria-current` (se presente em botões relacionados como "marcar vencedora") permanece consistente — sem múltiplos cards "pressed" simultâneos nem ARIA stale.

## Justificativa

Testes existentes validam `aria-pressed` em saltos isolados (Home/End) e em sequências curtas (2 setas). Mas **não há teste contínuo** que afirme:

| Lacuna | Risco |
|---|---|
| Após N navegações sequenciais (5+ setas), apenas 1 card tem `aria-pressed="true"` | Bug de "ARIA pressed acumula" passaria — múltiplos cards "pressed" confundem leitor de tela |
| `aria-current` em botão "marcar vencedora" do card ativo reflete estado correto | Se botão de ação herdar ARIA do card pai erroneamente, dá conflito |
| Wrap-around (último → primeiro via ArrowRight) limpa `aria-pressed` do último | Caso clássico de stale state em ciclo |
| Contagem total de `aria-pressed="true"` em todo o DOM = 1 a cada step | Invariante de a11y trava regressão silenciosa |
| Botão "Marcar vencedora" do card ativo não ganha `aria-pressed` indevidamente | Confusão semântica entre seleção visual e marcação de winner |

**WAI-ARIA 1.2 (Toggle Button pattern)**: `aria-pressed` é mutuamente exclusivo dentro de um grupo de seleção única. Teste de invariante trava o contrato.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` (após o último teste de wrap-around N=2 que será adicionado, ou após o teste atual final), antes do `});` que fecha o sub-describe:

```ts
it("aria-pressed permanece exclusivo (1 ativo) em sequência de setas, Home, End e wrap-around", async () => {
  const user = userEvent.setup();

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    return (
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onSelectWinner={vi.fn()}
      />
    );
  }

  render(<ControlledWrapper />);
  const total = navVariations.length;

  // Helper: conta cards com aria-pressed="true" e retorna o índice (1-based) do ativo
  const getActiveCardIndex = (): number => {
    const cards = screen.getAllByRole("button", { name: /^Selecionar variação/ });
    const activeCards = cards.filter((c) => c.getAttribute("aria-pressed") === "true");
    expect(activeCards).toHaveLength(1); // INVARIANTE: exatamente 1 ativo
    const match = activeCards[0].getAttribute("aria-label")?.match(/variação (\d+)/);
    return Number(match?.[1] ?? 0);
  };

  // Estado inicial: card 1 ativo, foco nele
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card1.focus();
  expect(getActiveCardIndex()).toBe(1);

  // ── Sequência longa de ArrowRight cobrindo wrap-around completo ──
  for (let step = 1; step <= total + 1; step++) {
    await user.keyboard("{ArrowRight}");
    const expectedActive = ((step) % total) + 1; // 1-based, com wrap
    expect(getActiveCardIndex()).toBe(expectedActive);
    // Confirma que o card ativo é o que tem foco
    const activeByLabel = screen.getByRole("button", {
      name: new RegExp(`^Selecionar variação ${expectedActive}`),
    });
    expect(activeByLabel).toHaveFocus();
  }

  // ── Sequência longa de ArrowLeft cobrindo wrap reverso ──
  for (let step = 1; step <= total + 1; step++) {
    await user.keyboard("{ArrowLeft}");
    expect(getActiveCardIndex()).toBeGreaterThanOrEqual(1);
    expect(getActiveCardIndex()).toBeLessThanOrEqual(total);
  }

  // ── Home → invariante mantida, ativo é card 1 ──
  await user.keyboard("{Home}");
  expect(getActiveCardIndex()).toBe(1);

  // ── End → invariante mantida, ativo é último ──
  await user.keyboard("{End}");
  expect(getActiveCardIndex()).toBe(total);

  // ── Verificação extra: nenhum botão "Marcar vencedora" tem aria-pressed indevido ──
  const winnerButtons = screen.queryAllByRole("button", { name: /vencedora/i });
  winnerButtons.forEach((btn) => {
    // aria-pressed só deve existir nos cards de seleção, não nos botões de ação
    const labelStartsWithSelecionar = btn.getAttribute("aria-label")?.startsWith("Selecionar");
    if (!labelStartsWithSelecionar) {
      expect(btn.hasAttribute("aria-pressed")).toBe(false);
    }
  });

  // ── Mistura final: ArrowRight + Home + End + ArrowLeft → invariante em cada step ──
  const sequence = ["{ArrowRight}", "{Home}", "{End}", "{ArrowLeft}", "{ArrowLeft}", "{End}"];
  for (const key of sequence) {
    await user.keyboard(key);
    getActiveCardIndex(); // helper já valida invariante (toHaveLength(1))
  }
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `React`, `render`, `screen`, `userEvent`, `vi`, `navVariations`, `MagicUpVariationComparator`)
- 1 teste novo (atual contagem + 1)
- Helper `getActiveCardIndex` faz dupla função: retorna índice ativo E valida invariante (`expect(...).toHaveLength(1)`) — qualquer step com 0 ou 2+ cards pressed falha imediatamente
- Loop cobre wrap-around completo (`total + 1` iterações garantem pelo menos 1 wrap)
- Verificação separada de botões "vencedora" garante que `aria-pressed` não vaze para botões de ação
- Sequência mista no final exercita transições não-monotônicas (Home depois de End, etc.)

## Entregável

- 1 teste cobrindo:
  1. **Invariante de exclusividade**: a cada movimento, exatamente 1 card com `aria-pressed="true"`
  2. **Wrap-around ArrowRight**: `total + 1` setas para a direita validam ciclo completo
  3. **Wrap-around ArrowLeft**: `total + 1` setas para a esquerda sem violar invariante
  4. **Home/End preservam invariante** após sequências longas
  5. **Foco sincronizado com `aria-pressed`**: card pressed = card focado
  6. **Botões "vencedora" não vazam `aria-pressed`**: separação semântica preservada
  7. **Sequência mista** (Right→Home→End→Left→Left→End) mantém invariante em cada step
- Captura regressões onde:
  - `aria-pressed` antigo permaneça `"true"` após navegação (múltiplos pressed)
  - Wrap-around deixe estado órfão no card de origem
  - Refator faça `aria-pressed` do card ativo virar `aria-pressed={true}` (boolean) em vez de string
  - Botão de ação interno ao card herde ou ganhe `aria-pressed` indevidamente
  - `onSelect` deixe de ser chamado em algum movimento, congelando ARIA
- Sem impacto nos testes existentes: novo teste é isolado em `ControlledWrapper` próprio
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar verde

