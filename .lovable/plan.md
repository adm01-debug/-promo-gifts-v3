

# Plano — Testes de Home/End para navegação ao primeiro/último card focável

Adiciono **2 testes** ao final do sub-describe `"navegação por setas/Home/End nos cards de variação"` (ou criando-o se não existir, ao final do describe principal) em `tests/components/magic-up-onda5.test.tsx`, validando que `Home` e `End` movem foco e seleção para o primeiro e último card de variação respectivamente, e que Enter/Space subsequentes continuam disparando `onSelect` consistentemente.

## Justificativa

O componente `MagicUpVariationComparator` já implementa `Home`/`End` no `handleArrowKey` (linhas 38-39 do componente):
```ts
else if (e.key === "Home") nextIndex = 0;
else if (e.key === "End") nextIndex = total - 1;
```

E expõe via `aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"`.

Cobertura existente (testes 95-101): foco em `loadingWinnerIndex` e teclado avançado no botão "Marcar vencedora". **Lacuna**: `Home`/`End` nos botões de seleção de variação não têm cobertura dedicada validando salto + foco + Enter/Space consistentes pós-salto.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 2 testes reusando `navVariations` (3 variações):

---

**Teste 1 — `Home` salta para primeiro card (de qualquer posição) e Enter/Space disparam `onSelect(0)`**

```ts
it("Home salta foco e seleção para o primeiro card de variação e Enter/Space disparam onSelect(0)", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  render(
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={2}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );

  // Foco inicial no último card (índice 2)
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  card3.focus();
  expect(card3).toHaveFocus();

  // Home → salta para card 1
  await user.keyboard("{Home}");
  expect(onSelect).toHaveBeenCalledWith(0);
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(card1).toHaveFocus();

  // Aria-keyshortcuts expõe Home como atalho
  expect(card1).toHaveAttribute("aria-keyshortcuts", expect.stringContaining("Home"));

  // Enter no card 1 dispara onSelect(0) novamente — comportamento consistente pós-Home
  onSelect.mockClear();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(0);

  // Space também dispara onSelect(0)
  onSelect.mockClear();
  await user.keyboard(" ");
  expect(onSelect).toHaveBeenCalledWith(0);

  // onSelectWinner intocado
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

---

**Teste 2 — `End` salta para último card (de qualquer posição) e Enter/Space disparam `onSelect(last)`**

```ts
it("End salta foco e seleção para o último card de variação e Enter/Space disparam onSelect(last)", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  render(
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={0}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );

  const lastIndex = navVariations.length - 1; // 2

  // Foco inicial no primeiro card (índice 0)
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card1.focus();
  expect(card1).toHaveFocus();

  // End → salta para último card
  await user.keyboard("{End}");
  expect(onSelect).toHaveBeenCalledWith(lastIndex);
  const cardLast = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  expect(cardLast).toHaveFocus();

  // Aria-keyshortcuts expõe End como atalho
  expect(cardLast).toHaveAttribute("aria-keyshortcuts", expect.stringContaining("End"));

  // Enter no último card dispara onSelect(lastIndex)
  onSelect.mockClear();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(lastIndex);

  // Space também dispara onSelect(lastIndex)
  onSelect.mockClear();
  await user.keyboard(" ");
  expect(onSelect).toHaveBeenCalledWith(lastIndex);

  // Sequência Home → End → Home (idempotência de saltos)
  onSelect.mockClear();
  await user.keyboard("{Home}");
  expect(onSelect).toHaveBeenLastCalledWith(0);
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toHaveFocus();

  await user.keyboard("{End}");
  expect(onSelect).toHaveBeenLastCalledWith(lastIndex);
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toHaveFocus();

  await user.keyboard("{Home}");
  expect(onSelect).toHaveBeenLastCalledWith(0);
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toHaveFocus();

  // onSelectWinner intocado durante toda a sequência
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx` (Home/End já implementados)
- Sem novos imports (reusa `render`, `screen`, `userEvent`, `vi`, `MagicUpVariationComparator`, `navVariations`)
- 2 testes novos (101 → 103 testes)
- Testes posicionados próximos aos demais testes de navegação por teclado nos cards
- Verificação de `aria-keyshortcuts` confirma exposição assistiva dos atalhos

## Entregável

- 2 testes cobrindo:
  1. `Home` de qualquer card → foco + `onSelect(0)`; Enter/Space pós-Home disparam `onSelect(0)` consistentemente; `aria-keyshortcuts` inclui "Home"
  2. `End` de qualquer card → foco + `onSelect(last)`; Enter/Space pós-End disparam `onSelect(last)`; sequência Home↔End idempotente; `aria-keyshortcuts` inclui "End"
- Captura regressões onde:
  - `Home`/`End` fossem removidos do `handleArrowKey`
  - Salto não movesse foco (apenas chamasse `onSelect` sem `cardRefs.current[nextIndex]?.focus()`)
  - `aria-keyshortcuts` deixasse de declarar Home/End
  - Enter/Space pós-salto deixassem de disparar `onSelect` (ex: handler perdesse referência ao novo índice)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 103/103 verde

