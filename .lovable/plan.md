

# Plano — Testes de scroll preservando foco e Shift+Tab em ordem reversa

Adiciono **2 testes** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` em `tests/components/magic-up-onda5.test.tsx`, validando que (1) após simular scroll do container/window o botão focado permanece o mesmo (foco não é roubado), e (2) `Shift+Tab` percorre os botões do `MagicUpVariationComparator` em ordem reversa consistente.

## Justificativa

Cobertura existente (testes 95-103): loading do "Marcar vencedora", teclado avançado (Ctrl/Cmd/Shift/Alt+Enter, Space auto-repeat), Home/End nos cards.

Lacunas:
1. **Scroll + foco**: nenhum teste valida que `scroll` no container ou `window` preserva `document.activeElement`. Risco real: efeitos colaterais de re-render por intersection observer ou virtualização futura podem roubar foco silenciosamente.
2. **Shift+Tab (ordem reversa)**: testes existentes cobrem Tab forward e atalhos, mas não a navegação reversa Shift+Tab através da matriz `[card, marcar-vencedora] × N variações`.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 2 testes ao final do sub-describe `"ativação por Enter/Espaço nos botões"`, reusando `navVariations` (3 variações):

---

**Teste 1 — Scroll do container e do window preserva foco no botão atual**

```ts
it("scroll do container e do window não rouba foco do botão atualmente focado", async () => {
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  const { container } = render(
    <div style={{ height: "200px", overflow: "auto" }} data-testid="scroll-container">
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={1}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    </div>
  );

  // Foca o card 2 (índice 1)
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  card2.focus();
  expect(card2).toHaveFocus();
  expect(document.activeElement).toBe(card2);

  // Scroll no container parent (10 eventos sequenciais simulando wheel)
  const scrollContainer = screen.getByTestId("scroll-container");
  for (let i = 0; i < 10; i++) {
    fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 50 } });
  }
  expect(card2).toHaveFocus();
  expect(document.activeElement).toBe(card2);

  // Scroll do window
  fireEvent.scroll(window, { target: { scrollY: 300 } });
  fireEvent.scroll(window, { target: { scrollY: 600 } });
  expect(card2).toHaveFocus();

  // Scroll diretamente no <section> do comparador
  const section = container.querySelector('[aria-label="Comparador de variações"]');
  if (section) {
    fireEvent.scroll(section, { target: { scrollTop: 100 } });
  }
  expect(card2).toHaveFocus();

  // Foca o botão "Marcar vencedora" da var-3 e repete sequência de scroll
  const winnerBtn3 = screen.getByRole("button", { name: "Marcar variação 3 como vencedora" });
  winnerBtn3.focus();
  expect(winnerBtn3).toHaveFocus();

  for (let i = 0; i < 5; i++) {
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 200 + i * 30 } });
  }
  fireEvent.scroll(window, { target: { scrollY: 0 } });
  expect(winnerBtn3).toHaveFocus();

  // Sanity: nenhum handler de seleção foi disparado por scroll
  expect(onSelect).not.toHaveBeenCalled();
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

---

**Teste 2 — Shift+Tab percorre botões do comparador em ordem reversa consistente**

```ts
it("Shift+Tab percorre os botões do comparador em ordem reversa (last → first), mantendo Enter/Space funcionais em cada parada", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  render(
    <div>
      <button type="button" data-testid="before-sentinel">antes</button>
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
      <button type="button" data-testid="after-sentinel">depois</button>
    </div>
  );

  // Foca sentinel "depois" (último elemento focável do DOM de teste)
  const afterSentinel = screen.getByTestId("after-sentinel");
  afterSentinel.focus();
  expect(afterSentinel).toHaveFocus();

  // Ordem esperada do DOM (forward Tab): card1, marcar1, card2, marcar2, card3, marcar3
  // Ordem reversa (Shift+Tab a partir de "depois"): marcar3 → card3 → marcar2 → card2 → marcar1 → card1 → "antes"
  const expectedReverseOrder = [
    { name: "Marcar variação 3 como vencedora" },
    { name: /^Selecionar variação 3/ },
    { name: "Marcar variação 2 como vencedora" },
    { name: /^Selecionar variação 2/ },
    { name: "Marcar variação 1 como vencedora" },
    { name: /^Selecionar variação 1/ },
  ];

  for (const target of expectedReverseOrder) {
    await user.tab({ shift: true });
    const btn = screen.getByRole("button", target);
    expect(btn).toHaveFocus();
  }

  // Próximo Shift+Tab sai do comparador para o sentinel "antes"
  await user.tab({ shift: true });
  expect(screen.getByTestId("before-sentinel")).toHaveFocus();

  // Tab forward retorna ao primeiro card (card1) e Enter/Space funcionam
  await user.tab();
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(card1).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(0);

  // Shift+Tab a partir de card1 volta ao sentinel "antes"
  onSelect.mockClear();
  await user.tab({ shift: true });
  expect(screen.getByTestId("before-sentinel")).toHaveFocus();

  // Sequência mista: Tab até "Marcar var-2", aciona Space, depois Shift+Tab dispara onSelect(1) no card2
  await user.tab(); // card1
  await user.tab(); // marcar1
  await user.tab(); // card2
  await user.tab(); // marcar2
  const winnerBtn2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  expect(winnerBtn2).toHaveFocus();
  await user.keyboard(" ");
  expect(onSelectWinner).toHaveBeenCalledWith(1);

  await user.tab({ shift: true });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(card2).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(1);
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `fireEvent`, `userEvent`, `vi`, `MagicUpVariationComparator`, `navVariations`)
- 2 testes novos (103 → 105 testes)
- Sentinels `before-sentinel`/`after-sentinel` delimitam a tab order do comparador
- `fireEvent.scroll` em container, window e `<section>` interna cobre 3 superfícies de scroll plausíveis
- Validação cumulativa de Tab forward + Shift+Tab + Enter/Space pós-navegação garante que listeners não se "desconectam" por mudanças de foco

## Entregável

- 2 testes cobrindo:
  1. **Scroll preserva foco**: 10 scrolls no container parent + 2 scrolls no window + 1 scroll na `<section>` interna não movem `document.activeElement` de `card2`; mesmo cenário repetido com foco em `Marcar variação 3` (botão de ação); `onSelect`/`onSelectWinner` intocados
  2. **Shift+Tab ordem reversa**: a partir do sentinel "depois", percorre `marcar3 → card3 → marcar2 → card2 → marcar1 → card1 → antes` (7 paradas); Tab forward retoma fluxo; Enter/Space disparam handlers corretos em cada parada; sequência mista Tab+Space+Shift+Tab+Enter valida que listeners permanecem ativos
- Captura regressões onde:
  - Re-render ou efeito colateral de scroll (intersection observer, virtualização futura) roubasse foco
  - Inserção de elementos não-focáveis quebrasse a ordem de tabulação reversa
  - `tabIndex` indevido em um dos botões alterasse a ordem natural do DOM
  - Shift+Tab a partir de card1 não saísse para o elemento anterior (foco preso)
  - Listeners de `onClick`/`onKeyDown` se desconectassem após navegação cruzada Tab/Shift+Tab
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 105/105 verde

