

# Plano — Teste de foco programático e destaque visual sincronizado com `activeIndex`

Adiciono testes ao `tests/components/magic-up-onda5.test.tsx` que validam dois aspectos correlacionados da navegação por teclado no `MagicUpVariationComparator` ainda não cobertos explicitamente:

1. **Foco programático**: a linha `cardRefs.current[nextIndex]?.focus()` (linha 43 do componente) move o foco do DOM para o **novo** card ativo após cada seta — não permanece no card anterior.
2. **Destaque visual sincronizado**: as classes Tailwind condicionais `border-primary ring-2 ring-primary/20` (wrapper, linha 67) acompanham `activeIndex` após rerender; demais cards usam `border-border hover:border-primary/40`.

## Justificativa

Cobertura existente:
- Setas chamam `onSelect` com índice correto (wrap-around, equivalência de eixos, Home/End)
- ARIA (`aria-pressed`, `aria-current`) acompanha `activeIndex` após rerender
- Cliques de mouse atualizam estado

Lacuna:
- **Foco DOM** após `handleArrowKey`: nenhum teste verifica que `document.activeElement` muda para o botão do novo índice. Regressão silenciosa: se `cardRefs.current[nextIndex]?.focus()` for removido, navegação por teclado continua chamando `onSelect`, mas o usuário "perde" o foco visual e o próximo `ArrowRight` parte do índice errado.
- **Classes de destaque**: nenhum teste valida que o wrapper do card ativo recebe `border-primary ring-2 ring-primary/20` e que apenas **um** card por vez carrega essas classes. Regressão: se a condição `isActive` for invertida ou removida do `cn()`, ARIA continua correto mas usuário não vê destaque.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **2 testes** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` (último bloco do arquivo, antes do `})` de fechamento do describe pai do `MagicUpVariationComparator`).

**Setup compartilhado (reusa `navVariations` já declarado no sub-describe):**
- 3 variações `var-1`/`var-2`/`var-3` com scores 80/70/90
- Helper `renderWith(activeIndex)` segue padrão dos testes anteriores

---

**Teste 1 — Foco DOM segue `activeIndex` após cada seta + rerender**

```ts
it("foco DOM move para o novo card ativo após ArrowRight/ArrowLeft e segue activeIndex após rerender", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  const renderWith = (activeIndex: number) => (
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={activeIndex}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );
  const { rerender } = render(renderWith(0));

  const card0 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card0.focus();
  expect(card0).toHaveFocus();

  // ArrowRight: handleArrowKey chama focus() no card1 ANTES do rerender
  await user.keyboard("{ArrowRight}");
  expect(onSelect).toHaveBeenLastCalledWith(1);
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(card1).toHaveFocus();
  expect(card0).not.toHaveFocus();

  // Pai re-renderiza: foco PERMANECE em card1 (mesmo elemento, ref preservada)
  rerender(renderWith(1));
  const card1AfterRerender = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(card1AfterRerender).toHaveFocus();

  // ArrowLeft → foco volta para card0
  await user.keyboard("{ArrowLeft}");
  expect(onSelect).toHaveBeenLastCalledWith(0);
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toHaveFocus();

  // Home/End também movem foco
  rerender(renderWith(0));
  await user.keyboard("{End}");
  expect(onSelect).toHaveBeenLastCalledWith(2);
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).toHaveFocus();

  rerender(renderWith(2));
  await user.keyboard("{Home}");
  expect(onSelect).toHaveBeenLastCalledWith(0);
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).toHaveFocus();
});
```

---

**Teste 2 — Destaque visual (`border-primary ring-2 ring-primary/20`) sincroniza com `activeIndex`**

```ts
it("wrapper do card ativo recebe classes de destaque (border-primary ring-2) e apenas um card por vez", async () => {
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  const renderWith = (activeIndex: number) => (
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={activeIndex}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );
  const { rerender } = render(renderWith(0));

  // Helper: pega o wrapper (parentElement do <button>) de cada card
  const getWrapper = (variationNum: number): HTMLElement => {
    const btn = screen.getByRole("button", { name: new RegExp(`^Selecionar variação ${variationNum}`) });
    const wrapper = btn.parentElement;
    expect(wrapper).not.toBeNull();
    return wrapper as HTMLElement;
  };

  // Estado inicial: activeIndex=0 → var-1 destacado, demais com border-border
  expect(getWrapper(1).className).toContain("border-primary");
  expect(getWrapper(1).className).toContain("ring-2");
  expect(getWrapper(1).className).toContain("ring-primary/20");
  expect(getWrapper(2).className).not.toContain("border-primary");
  expect(getWrapper(2).className).toContain("border-border");
  expect(getWrapper(3).className).not.toContain("border-primary");
  expect(getWrapper(3).className).toContain("border-border");

  // Cardinalidade: apenas 1 wrapper com border-primary
  const allWrappers = [getWrapper(1), getWrapper(2), getWrapper(3)];
  expect(allWrappers.filter((w) => w.className.includes("border-primary") && !w.className.includes("border-primary/40"))).toHaveLength(1);

  // Rerender com activeIndex=2 → destaque migra para var-3
  rerender(renderWith(2));
  expect(getWrapper(1).className).not.toContain("border-primary");
  expect(getWrapper(1).className).toContain("border-border");
  expect(getWrapper(2).className).not.toContain("border-primary");
  expect(getWrapper(3).className).toContain("border-primary");
  expect(getWrapper(3).className).toContain("ring-2");
  expect(getWrapper(3).className).toContain("ring-primary/20");

  // Rerender com activeIndex=1 → destaque em var-2
  rerender(renderWith(1));
  expect(getWrapper(1).className).not.toContain("border-primary");
  expect(getWrapper(2).className).toContain("border-primary");
  expect(getWrapper(2).className).toContain("ring-2");
  expect(getWrapper(3).className).not.toContain("border-primary");

  // Cardinalidade preservada após cada rerender
  const wrappersAfter = [getWrapper(1), getWrapper(2), getWrapper(3)];
  expect(wrappersAfter.filter((w) => w.className.includes("ring-2"))).toHaveLength(1);
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `rerender`, `screen`, `userEvent`, `vi`, `VariationItem`, `MagicUpVariationComparator`)
- 2 testes novos (88 → 90 testes)
- Reusa `navVariations` já declarado no sub-describe pai
- Queries por aria-label regex/exato seguem padrão estabelecido
- Filtro de cardinalidade exclui `border-primary/40` (classe de hover dos cards inativos) para não falsear contagem

## Entregável

- 2 testes cobrindo:
  1. **Foco DOM**: `cardRefs.current[nextIndex]?.focus()` move foco para o novo card a cada seta (ArrowRight/Left/Home/End); foco persiste através de rerender do pai (ref preservada)
  2. **Destaque visual**: wrapper do card ativo recebe `border-primary ring-2 ring-primary/20`; cards inativos recebem `border-border`; apenas 1 wrapper destacado por vez (cardinalidade); destaque migra corretamente após rerender
- Captura regressões onde:
  - `cardRefs.current[nextIndex]?.focus()` fosse removido (foco fica preso no card anterior)
  - `cardRefs` callback ref fosse alterado (refs ficariam null)
  - Condição `isActive` no `cn()` fosse invertida ou removida (destaque sumiria ou apareceria em todos)
  - Múltiplos cards recebessem `ring-2` simultaneamente
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 90/90 verde

