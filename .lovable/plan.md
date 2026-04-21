

# Plano — Testes de ativação por Enter/Espaço nos botões de seleção e "Marcar vencedora"

Adiciono testes ao `tests/components/magic-up-onda5.test.tsx` que validam a ativação nativa via teclado (Enter/Espaço) dos dois botões interativos do `MagicUpVariationComparator`:

1. **Botão "Selecionar variação N"** (`<button type="button">` com `onClick={() => onSelect(index)}`) — Enter/Espaço devem disparar `onSelect` com o índice correto e, após rerender, atualizar `aria-pressed`/`aria-current`.
2. **Botão "Marcar variação N como vencedora"** (`<Button>` com `onClick={() => onSelectWinner(index)}`) — Enter/Espaço devem disparar `onSelectWinner` com o índice correto e, após rerender com `isWinner` atualizado, mover a badge "Melhor score" para o card correspondente.

## Justificativa

Cobertura existente:
- Cliques de mouse em ambos os botões (`onSelect`/`onSelectWinner`)
- Setas (ArrowLeft/Right/Up/Down/Home/End) chamando `onSelect`
- Teste anterior valida que `Enter` no botão de seleção **não** chama `onSelectWinner`

Lacuna: ativação **positiva** via teclado dos dois botões, com:
- Confirmação de que `onSelect`/`onSelectWinner` recebem o índice exato
- Confirmação de que badge "Melhor score" migra após `onSelectWinner` + rerender com novo `isWinner`
- Equivalência funcional Enter ≡ Espaço (comportamento padrão de `<button>`)
- Independência: ativar um botão não dispara o callback do outro

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **3 testes** no final do `describe` "setas atualizam activeIndex e ARIA acompanha após rerender" (mesmo bloco onde os testes de teclado vivem) ou em um sub-describe novo `"ativação por Enter/Espaço nos botões"`. Optarei por sub-describe novo para separar concerns.

**Setup compartilhado (3 variações sem winner inicial):**
```ts
const navVariations: VariationItem[] = [
  { id: "var-1", imageUrl: "https://example.com/1.png", qualityScore: 80 } as VariationItem,
  { id: "var-2", imageUrl: "https://example.com/2.png", qualityScore: 70 } as VariationItem,
  { id: "var-3", imageUrl: "https://example.com/3.png", qualityScore: 90 } as VariationItem,
];
```

---

**Teste 1 — Enter no botão de seleção dispara `onSelect` e ARIA acompanha**

```ts
it("Enter no botão 'Selecionar variação N' chama onSelect(N-1) e aria-pressed/aria-current acompanham após rerender", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  const renderWith = (activeIndex: number) => (
    <MagicUpVariationComparator variations={navVariations} activeIndex={activeIndex} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );
  const { rerender } = render(renderWith(0));

  // Foco no botão "Selecionar variação 2" e Enter
  const selectBtn2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  selectBtn2.focus();
  await user.keyboard("{Enter}");

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenLastCalledWith(1);
  expect(onSelectWinner).not.toHaveBeenCalled();

  // Pai re-renderiza com novo activeIndex → ARIA acompanha
  rerender(renderWith(1));
  const selectBtn2After = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(selectBtn2After).toHaveAttribute("aria-pressed", "true");
  expect(selectBtn2After).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toHaveAttribute("aria-pressed", "false");
});
```

---

**Teste 2 — Espaço no botão de seleção é equivalente a Enter**

```ts
it("Espaço no botão 'Selecionar variação N' chama onSelect(N-1) com mesmo comportamento de Enter", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  render(
    <MagicUpVariationComparator variations={navVariations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  const selectBtn3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  selectBtn3.focus();
  await user.keyboard(" "); // Espaço

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenLastCalledWith(2);
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

---

**Teste 3 — Enter/Espaço no botão "Marcar vencedora" dispara `onSelectWinner` e badge migra após rerender**

```ts
it("Enter e Espaço no botão 'Marcar vencedora' chamam onSelectWinner(index) e badge migra após rerender com isWinner", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  // Estado inicial: nenhum winner explícito → badge cai no maior score (var-3, idx 2)
  const renderWith = (variations: VariationItem[]) => (
    <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );
  const { rerender } = render(renderWith(navVariations));

  // Sanity: badge inicial em var-3 (maior score 90)
  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  const initialWinnerCard = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  expect(initialWinnerCard.getAttribute("aria-label")).toContain(", melhor score");

  // Enter no botão "Marcar variação 1 como vencedora"
  const winnerBtn1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  winnerBtn1.focus();
  await user.keyboard("{Enter}");

  expect(onSelectWinner).toHaveBeenCalledTimes(1);
  expect(onSelectWinner).toHaveBeenLastCalledWith(0);
  expect(onSelect).not.toHaveBeenCalled();

  // Simula handler externo: marca var-1 como winner e rerender
  const updatedVariations: VariationItem[] = [
    { ...navVariations[0], isWinner: true },
    navVariations[1],
    navVariations[2],
  ];
  rerender(renderWith(updatedVariations));

  // Badge migrou para var-1 (única cardinalidade preservada)
  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ }).getAttribute("aria-label"))
    .toContain(", melhor score");
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ }).getAttribute("aria-label"))
    .not.toContain("melhor score");

  // Agora testa Espaço no botão "Marcar variação 2 como vencedora"
  onSelectWinner.mockClear();
  const winnerBtn2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  winnerBtn2.focus();
  await user.keyboard(" ");

  expect(onSelectWinner).toHaveBeenCalledTimes(1);
  expect(onSelectWinner).toHaveBeenLastCalledWith(1);
  expect(onSelect).not.toHaveBeenCalled();

  // Rerender com var-2 como novo winner único
  const updatedAgain: VariationItem[] = [
    navVariations[0],
    { ...navVariations[1], isWinner: true },
    navVariations[2],
  ];
  rerender(renderWith(updatedAgain));

  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  expect(screen.getByRole("button", { name: /^Selecionar variação 2/ }).getAttribute("aria-label"))
    .toContain(", melhor score");
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `rerender`, `screen`, `userEvent`, `vi`, `VariationItem`)
- 3 testes novos (85 → 88 testes)
- Cada teste isolado (mocks recriados por teste; `mockClear` quando reaproveita dentro do mesmo `it`)
- Queries por `aria-label` exato/regex seguem padrão estabelecido

## Entregável

- 3 testes cobrindo:
  1. **Enter** no botão de seleção → `onSelect(index)` + ARIA acompanha após rerender + `onSelectWinner` não disparado
  2. **Espaço** no botão de seleção → equivalência funcional com Enter (mesmo callback, mesmo índice, isolamento de `onSelectWinner`)
  3. **Enter e Espaço** no botão "Marcar vencedora" → `onSelectWinner(index)` + badge migra corretamente após rerender com `isWinner: true` + cardinalidade preservada (1) + `onSelect` não disparado
- Captura regressões onde:
  - `onClick` fosse trocado por `onMouseDown` (quebraria ativação por teclado)
  - Botão de seleção e "Marcar vencedora" fossem fundidos acidentalmente
  - `onSelectWinner` deixasse de receber o índice correto
  - Badge não migrasse após mudança de `isWinner`
  - Eventos de Enter/Espaço propagassem para o botão errado (cardinalidade > 1)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 88/88 verde

