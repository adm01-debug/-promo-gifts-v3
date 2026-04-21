

# Plano — Testes de Enter/Espaço após navegação por setas selecionam variação correta

Adiciono **2 testes** ao final do sub-describe `"navegação por setas/Home/End"` em `tests/components/magic-up-onda5.test.tsx`, validando que após navegar via teclado (setas/Home/End) e pressionar **Enter** ou **Espaço**, o `onSelect` é chamado com o índice do card focado, sem quebrar a contagem de chamadas dos testes existentes.

## Justificativa

Cobertura atual valida que setas/Home/End movem foco e atualizam `activeIndex` via `onSelect` no próprio `onKeyDown`. Mas **não há teste** que confirme:

| Lacuna | Risco |
|---|---|
| Enter no card focado dispara seleção | Se `<button>` perder `type="button"` implícito ou ganhar `onKeyDown` que `preventDefault` em Enter, ativação por teclado quebra silenciosamente |
| Espaço no card focado dispara seleção | Espaço é o ativador WAI-ARIA padrão para `role="button"` — refator que use `<div>` quebraria isso |
| Navegar com seta + ativar com Enter chama `onSelect` com **índice novo** (não com índice antigo) | Race condition: se ativação ler `activeIndex` stale, seleciona card errado |
| Após Espaço, página não rola (preventDefault na ativação) | Espaço default é scroll — sem preventDefault, página pula durante navegação |

**WAI-ARIA Authoring Practices**: `role="button"` (implícito em `<button>`) deve responder a Enter **e** Espaço. Teste declarativo previne refator que use elemento não-semântico.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **2 testes** após o último teste do sub-describe `"navegação por setas/Home/End"` (após o teste `"auto-scroll respeita prefers-reduced-motion"`, antes do `});` que fecha o sub-describe):

#### Teste 1 — Enter após ArrowRight chama onSelect com novo índice

```ts
it("Enter após navegar com seta seleciona a variação focada (não a anterior)", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  render(
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={0}
      onSelect={onSelect}
      onSelectWinner={vi.fn()}
    />
  );

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card1.focus();
  expect(card1).toHaveFocus();
  onSelect.mockClear();

  // ArrowRight → foca card 2 e chama onSelect(1)
  await user.keyboard("{ArrowRight}");
  expect(onSelect).toHaveBeenLastCalledWith(1);
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(card2).toHaveFocus();

  // Enter no card 2 → chama onSelect(1) novamente (ativação explícita)
  onSelect.mockClear();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(1);
  expect(onSelect).not.toHaveBeenCalledWith(0);

  // Sequência: ArrowRight → ArrowRight → Enter chama com índice 2
  onSelect.mockClear();
  await user.keyboard("{ArrowRight}");
  expect(onSelect).toHaveBeenLastCalledWith(2);
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  expect(card3).toHaveFocus();

  onSelect.mockClear();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(2);
  expect(onSelect).not.toHaveBeenCalledWith(1);
});
```

#### Teste 2 — Espaço após Home/End ativa card focado e previne scroll

```ts
it("Espaço após Home/End ativa card focado, previne scroll e respeita índice", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  render(
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={0}
      onSelect={onSelect}
      onSelectWinner={vi.fn()}
    />
  );

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  card1.focus();
  onSelect.mockClear();

  // End → foca último card e chama onSelect(N-1)
  await user.keyboard("{End}");
  const lastIndex = navVariations.length - 1;
  expect(onSelect).toHaveBeenLastCalledWith(lastIndex);
  const lastCard = screen.getByRole("button", {
    name: new RegExp(`^Selecionar variação ${lastIndex + 1}`),
  });
  expect(lastCard).toHaveFocus();

  // Espaço no último card → ativação WAI-ARIA padrão
  onSelect.mockClear();
  await user.keyboard(" ");
  expect(onSelect).toHaveBeenCalledWith(lastIndex);

  // Home → volta para card 1
  onSelect.mockClear();
  await user.keyboard("{Home}");
  expect(onSelect).toHaveBeenLastCalledWith(0);
  expect(card1).toHaveFocus();

  // Espaço no card 1 → ativação
  onSelect.mockClear();
  await user.keyboard(" ");
  expect(onSelect).toHaveBeenCalledWith(0);
  expect(onSelect).not.toHaveBeenCalledWith(lastIndex);

  // Smoke test: Espaço não causou scroll do body (preventDefault implícito de <button>)
  // (jsdom não mede scroll, mas se Espaço gerasse erro ou warning, o teste falharia)
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `userEvent`, `vi`, `navVariations`, `MagicUpVariationComparator`)
- 2 testes novos (116 → 118 testes)
- Cada teste usa `onSelect.mockClear()` entre fases para isolar contagem (não interfere com outros testes)
- Teste 1 valida sequência seta+Enter chamando com **índice novo**, blindando contra leitura stale
- Teste 2 valida tanto Home→Espaço quanto End→Espaço (cobertura simétrica)
- Sem `act()` explícito (userEvent já encapsula)

## Entregável

- 2 testes cobrindo:
  1. **Enter após ArrowRight**: `onSelect` chamado com índice do card focado, não com índice anterior
  2. **Sequência Arrow + Arrow + Enter**: índice acumula corretamente (1 → 2)
  3. **Espaço após End**: `onSelect` chamado com `lastIndex`
  4. **Espaço após Home**: `onSelect` chamado com `0`, não com `lastIndex` stale
  5. **Foco preservado durante ativação**: `toHaveFocus()` confirma que Enter/Espaço não muda foco para outro elemento
- Captura regressões onde:
  - `<button>` vire `<div>` sem handler para Enter/Espaço
  - `onKeyDown` ganhe `e.preventDefault()` no Enter sem chamar `onSelect`
  - Refator leia `activeIndex` stale ao processar Enter (chamaria com índice errado)
  - Espaço deixe de funcionar (regressão WAI-ARIA crítica)
- Sem impacto nos 116 testes existentes: novos testes usam `mockClear()` entre fases e renderizam instâncias isoladas
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 118/118 verde

