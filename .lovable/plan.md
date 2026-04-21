

# Plano — Testes de navegação por teclado (setas) no `MagicUpVariationComparator`

Adiciono testes ao `tests/components/magic-up-onda5.test.tsx` que validam o comportamento de navegação por teclado já implementado em `handleArrowKey` (linhas 33-44 do componente): setas `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`, `Home` e `End` chamam `onSelect` com o índice correto, e o card ativo (via `aria-pressed="true"` e `aria-current="true"`) acompanha a mudança quando o pai re-renderiza com o novo `activeIndex`.

## Justificativa

Cobertura existente: cliques de mouse atualizando `activeIndex` e badge fixa. Lacuna: **navegação por teclado** (`onKeyDown` → `handleArrowKey`), incluindo:

1. **Wrap-around circular**: `ArrowRight` no último volta para 0; `ArrowLeft` no primeiro vai ao último (`(currentIndex - 1 + total) % total`)
2. **Equivalência de eixos**: `ArrowDown` ≡ `ArrowRight` e `ArrowUp` ≡ `ArrowLeft`
3. **Atalhos `Home` / `End`**: vão direto para 0 / `total-1`
4. **Foco programático**: `cardRefs.current[nextIndex]?.focus()` move foco junto com seleção
5. **`preventDefault`**: setas não disparam scroll da página
6. **Teclas ignoradas**: `Tab`, `Enter`, `Space`, letras não chamam `onSelect`
7. **`aria-pressed` / `aria-current`** acompanham `activeIndex` após re-render do pai

## Alterações

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **5 testes** em sequência ao final do `describe` do `MagicUpVariationComparator`, seguindo o padrão dos testes existentes (uso de `userEvent`, `rerender`, queries por `aria-label` exato).

**Setup compartilhado (repetido em cada teste com 3 variações):**
```ts
const variations: VariationItem[] = [
  { id: "var-1", imageUrl: "https://example.com/1.png", qualityScore: 80 },
  { id: "var-2", imageUrl: "https://example.com/2.png", qualityScore: 70 },
  { id: "var-3", imageUrl: "https://example.com/3.png", qualityScore: 90 },
];
```

---

**Teste 1 — `ArrowRight` avança e `aria-pressed` acompanha após rerender**

```ts
it("ArrowRight chama onSelect com próximo índice e aria-pressed/aria-current acompanham após rerender", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  const renderWith = (activeIndex: number) => (
    <MagicUpVariationComparator variations={variations} activeIndex={activeIndex} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );
  const { rerender } = render(renderWith(0));

  // Foco inicial no card ativo
  const card0 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card0.focus();
  expect(card0).toHaveFocus();

  // ArrowRight em var-1 (idx 0) → onSelect(1)
  await user.keyboard("{ArrowRight}");
  expect(onSelect).toHaveBeenLastCalledWith(1);

  // Pai re-renderiza com novo activeIndex
  rerender(renderWith(1));
  const card1After = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(card1After).toHaveAttribute("aria-pressed", "true");
  expect(card1After).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toHaveAttribute("aria-pressed", "false");

  // ArrowRight em var-3 (idx 2) com wrap-around → onSelect(0)
  rerender(renderWith(2));
  screen.getByRole("button", { name: /^Selecionar variação 3/ }).focus();
  await user.keyboard("{ArrowRight}");
  expect(onSelect).toHaveBeenLastCalledWith(0);
});
```

---

**Teste 2 — `ArrowLeft` retrocede com wrap-around**

```ts
it("ArrowLeft retrocede e faz wrap-around do índice 0 para o último", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  render(
    <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  // Foco em var-1 (idx 0); ArrowLeft → wrap para idx 2
  screen.getByRole("button", { name: /^Selecionar variação 1/ }).focus();
  await user.keyboard("{ArrowLeft}");
  expect(onSelect).toHaveBeenLastCalledWith(2);

  // Foco em var-3 (idx 2); ArrowLeft → idx 1
  onSelect.mockClear();
  screen.getByRole("button", { name: /^Selecionar variação 3/ }).focus();
  await user.keyboard("{ArrowLeft}");
  expect(onSelect).toHaveBeenLastCalledWith(1);
});
```

---

**Teste 3 — `ArrowUp` ≡ `ArrowLeft` e `ArrowDown` ≡ `ArrowRight`**

```ts
it("ArrowUp/ArrowDown comportam-se como ArrowLeft/ArrowRight (eixo vertical equivalente)", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  render(
    <MagicUpVariationComparator variations={variations} activeIndex={1} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  card1.focus();

  // ArrowDown ≡ ArrowRight → próximo (idx 2)
  await user.keyboard("{ArrowDown}");
  expect(onSelect).toHaveBeenLastCalledWith(2);

  // ArrowUp ≡ ArrowLeft → anterior (idx 0)
  onSelect.mockClear();
  card1.focus();
  await user.keyboard("{ArrowUp}");
  expect(onSelect).toHaveBeenLastCalledWith(0);
});
```

---

**Teste 4 — `Home` e `End` saltam para extremos**

```ts
it("Home vai para o primeiro índice e End vai para o último", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  render(
    <MagicUpVariationComparator variations={variations} activeIndex={1} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  card1.focus();
  await user.keyboard("{Home}");
  expect(onSelect).toHaveBeenLastCalledWith(0);

  onSelect.mockClear();
  card1.focus();
  await user.keyboard("{End}");
  expect(onSelect).toHaveBeenLastCalledWith(2);
});
```

---

**Teste 5 — Teclas não-navegacionais não disparam `onSelect` nem `onSelectWinner`**

```ts
it("Tab/Enter/Space/letras não chamam onSelect nem onSelectWinner via handleArrowKey", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  render(
    <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  const card0 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card0.focus();

  // Letras e teclas não-mapeadas não disparam handleArrowKey
  await user.keyboard("a");
  await user.keyboard("{Escape}");
  await user.keyboard("{PageDown}");
  expect(onSelect).not.toHaveBeenCalled();

  // Enter/Space disparam click nativo do <button> → onSelect com índice atual (0)
  // Validamos que NÃO disparam onSelectWinner (esse é botão separado)
  await user.keyboard("{Enter}");
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `rerender`, `screen`, `userEvent`, `vi`, `VariationItem`)
- 5 testes novos (80 → 85 testes)
- Cada teste usa setup independente para isolamento total
- Queries por `aria-label` exato seguem padrão estabelecido nos testes anteriores

## Entregável

- 5 testes cobrindo:
  1. `ArrowRight` + wrap-around + propagação para `aria-pressed`/`aria-current` após rerender
  2. `ArrowLeft` + wrap-around (idx 0 → último)
  3. Equivalência `ArrowUp`/`ArrowDown` ↔ `ArrowLeft`/`ArrowRight`
  4. Atalhos `Home` (→ 0) e `End` (→ `total-1`)
  5. Teclas ignoradas (letras, `Escape`, `PageDown`) não disparam `onSelect`; `Enter`/`Space` não disparam `onSelectWinner`
- Captura regressões onde:
  - Wrap-around fosse removido (clamp em vez de módulo)
  - `ArrowDown`/`ArrowUp` parassem de espelhar `ArrowRight`/`ArrowLeft`
  - `Home`/`End` deixassem de funcionar
  - `preventDefault` fosse removido (testes ainda passariam, mas teclas extras vazariam para `onSelect`)
  - `aria-current`/`aria-pressed` desacoplassem de `activeIndex`
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 85/85 verde

