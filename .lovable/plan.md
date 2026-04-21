

# Plano — Testes anti-keyboard-trap no comparador

Adiciono **2 testes** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` em `tests/components/magic-up-onda5.test.tsx`, validando WCAG 2.1.2 (No Keyboard Trap): Tab/Shift+Tab sempre conseguem sair do `MagicUpVariationComparator` em qualquer direção, mesmo com loading ativo.

## Justificativa

Cobertura existente (105 testes): Home/End, Shift+Tab interno, scroll preserva foco, modificadores e auto-repeat em loading.

**Lacuna**: nenhum teste valida explicitamente WCAG 2.1.2 — que o foco nunca fica preso dentro do comparador. Cenários críticos não cobertos:
1. **Tab forward exit**: a partir do último botão (marcar var-N), Tab vai para o sentinel "depois"
2. **Shift+Tab backward exit**: a partir do primeiro botão (card var-1), Shift+Tab vai para o sentinel "antes"
3. **Round-trip completo**: Tab N vezes atravessa todo o comparador sem loop
4. **Exit funciona com loading ativo**: mesmo com `loadingWinnerIndex` desabilitando um botão, a saída por Tab/Shift+Tab continua funcionando (botão disabled é simplesmente pulado)

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 2 testes ao final do sub-describe `"ativação por Enter/Espaço nos botões"`, reusando `navVariations` (3 variações = 6 botões focáveis: card1, marcar1, card2, marcar2, card3, marcar3):

---

**Teste 1 — Sem keyboard trap: Tab forward sai pelo último botão e Shift+Tab sai pelo primeiro botão**

```ts
it("não cria keyboard trap: Tab no último botão sai para sentinel 'depois' e Shift+Tab no primeiro botão sai para sentinel 'antes' (WCAG 2.1.2)", async () => {
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

  // ─── Cenário A: Shift+Tab a partir do PRIMEIRO botão sai para "antes" ───
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card1.focus();
  expect(card1).toHaveFocus();

  await user.tab({ shift: true });
  expect(screen.getByTestId("before-sentinel")).toHaveFocus();

  // Shift+Tab novamente sai para fora do DOM de teste (body) — confirma que não há loop interno
  await user.tab({ shift: true });
  expect(screen.getByTestId("before-sentinel")).not.toHaveFocus();
  expect(card1).not.toHaveFocus();

  // ─── Cenário B: Tab forward a partir do ÚLTIMO botão sai para "depois" ───
  const winnerBtn3 = screen.getByRole("button", { name: "Marcar variação 3 como vencedora" });
  winnerBtn3.focus();
  expect(winnerBtn3).toHaveFocus();

  await user.tab();
  expect(screen.getByTestId("after-sentinel")).toHaveFocus();

  // Tab novamente sai para fora — não há loop interno do comparador
  await user.tab();
  expect(screen.getByTestId("after-sentinel")).not.toHaveFocus();
  expect(winnerBtn3).not.toHaveFocus();

  // ─── Cenário C: Round-trip Tab forward atravessa todo o comparador (sentinel "antes" → 6 botões → sentinel "depois") ───
  screen.getByTestId("before-sentinel").focus();
  expect(screen.getByTestId("before-sentinel")).toHaveFocus();

  const expectedForwardOrder = [
    { name: /^Selecionar variação 1/ },
    { name: "Marcar variação 1 como vencedora" },
    { name: /^Selecionar variação 2/ },
    { name: "Marcar variação 2 como vencedora" },
    { name: /^Selecionar variação 3/ },
    { name: "Marcar variação 3 como vencedora" },
  ];

  for (const target of expectedForwardOrder) {
    await user.tab();
    expect(screen.getByRole("button", target)).toHaveFocus();
  }

  // 7º Tab sai para sentinel "depois"
  await user.tab();
  expect(screen.getByTestId("after-sentinel")).toHaveFocus();

  // Nenhum handler de seleção foi disparado por simples navegação Tab
  expect(onSelect).not.toHaveBeenCalled();
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

---

**Teste 2 — Sem trap mesmo com loading ativo: botão disabled é pulado e exit por Tab/Shift+Tab continua funcionando**

```ts
it("não cria keyboard trap mesmo com loadingWinnerIndex ativo: botão disabled é pulado e Tab/Shift+Tab saem do comparador (WCAG 2.1.2)", async () => {
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
        loadingWinnerIndex={1}
      />
      <button type="button" data-testid="after-sentinel">depois</button>
    </div>
  );

  // Sanity: marcar-var-2 está disabled e aria-busy
  const winnerBtn2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  expect(winnerBtn2).toBeDisabled();
  expect(winnerBtn2).toHaveAttribute("aria-busy", "true");

  // ─── Cenário A: Tab forward a partir de "antes" pula marcar-var-2 mas chega ao final ───
  screen.getByTestId("before-sentinel").focus();

  // Ordem esperada: card1, marcar1, card2, [marcar2 pulado], card3, marcar3, after-sentinel
  const expectedForwardOrder = [
    { name: /^Selecionar variação 1/ },
    { name: "Marcar variação 1 como vencedora" },
    { name: /^Selecionar variação 2/ },
    { name: /^Selecionar variação 3/ },
    { name: "Marcar variação 3 como vencedora" },
  ];

  for (const target of expectedForwardOrder) {
    await user.tab();
    const btn = screen.getByRole("button", target);
    expect(btn).toHaveFocus();
    // Confirma que marcar-var-2 nunca recebeu foco durante a travessia
    expect(winnerBtn2).not.toHaveFocus();
  }

  // Próximo Tab sai para sentinel "depois" — exit funciona com loading
  await user.tab();
  expect(screen.getByTestId("after-sentinel")).toHaveFocus();

  // ─── Cenário B: Shift+Tab a partir de "depois" volta percorrendo, pula marcar-var-2 e sai para "antes" ───
  const expectedReverseOrder = [
    { name: "Marcar variação 3 como vencedora" },
    { name: /^Selecionar variação 3/ },
    { name: /^Selecionar variação 2/ },
    { name: "Marcar variação 1 como vencedora" },
    { name: /^Selecionar variação 1/ },
  ];

  for (const target of expectedReverseOrder) {
    await user.tab({ shift: true });
    const btn = screen.getByRole("button", target);
    expect(btn).toHaveFocus();
    expect(winnerBtn2).not.toHaveFocus();
  }

  // Próximo Shift+Tab sai para sentinel "antes" — exit reverso funciona com loading
  await user.tab({ shift: true });
  expect(screen.getByTestId("before-sentinel")).toHaveFocus();

  // ─── Cenário C: Foco direto no card var-2 (vizinho do botão em loading) e Tab forward pula marcar-var-2 ───
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  card2.focus();
  expect(card2).toHaveFocus();

  await user.tab();
  // Tab a partir de card2 deve ir direto para card3 (pulando marcar-var-2 disabled)
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toHaveFocus();
  expect(winnerBtn2).not.toHaveFocus();

  // Shift+Tab volta para card2 (pulando marcar-var-2 na direção reversa)
  await user.tab({ shift: true });
  expect(card2).toHaveFocus();
  expect(winnerBtn2).not.toHaveFocus();

  // Sanity: handlers de seleção não foram disparados por navegação Tab
  expect(onSelect).not.toHaveBeenCalled();
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `userEvent`, `vi`, `MagicUpVariationComparator`, `navVariations`)
- 2 testes novos (105 → 107 testes)
- Sentinels `before-sentinel`/`after-sentinel` simulam contexto da página (elementos antes/depois do comparador)
- Validação cumulativa: foco entra → percorre → sai em ambas direções, sem loop e sem prender em botão disabled

## Entregável

- 2 testes cobrindo WCAG 2.1.2 (No Keyboard Trap):
  1. **Sem trap básico**: Shift+Tab no primeiro botão sai para "antes"; Tab no último botão sai para "depois"; nova tentativa de Tab/Shift+Tab além dos sentinels não retorna ao comparador (sem loop); round-trip completo de 6 botões + saída funcional
  2. **Sem trap com loading**: com `loadingWinnerIndex={1}` desabilitando marcar-var-2, Tab forward pula o botão disabled e ainda sai para "depois"; Shift+Tab reverso pula o botão disabled e sai para "antes"; navegação a partir do vizinho (card-var-2) salta direto para card-var-3 em ambas direções
- Captura regressões onde:
  - `tabIndex={-1}` ou `tabIndex` positivo indevido criasse loop interno
  - Foco fosse interceptado e devolvido programaticamente ao comparador (focus trap acidental via `onBlur`/`useEffect`)
  - Botão `disabled` ainda fosse focável (browser quirk ou implementação custom)
  - Atributo `aria-disabled="true"` sem `disabled` real permitisse foco mas bloqueasse interação (anti-padrão)
  - Saída por Tab/Shift+Tab quebrasse com loading ativo
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 107/107 verde

