

# Plano — Testes de acessibilidade do botão "Marcar vencedora" desabilitado

Adiciono **2 testes** ao sub-describe `"ativação por Enter/Espaço nos botões"` em `tests/components/magic-up-onda5.test.tsx` validando que, quando `loadingWinnerIndex` desabilita o botão "Marcar vencedora", o texto acessível (`aria-label`) permanece intacto e os atributos ARIA expõem corretamente o estado para leitores de tela.

## Justificativa

Cobertura existente (testes 95-96):
- Tab pula botão em loading
- Enter/Space não disparam `onSelectWinner` em loading

Lacuna específica de acessibilidade assistiva:
1. **Estabilidade do nome acessível**: o `aria-label="Marcar variação N como vencedora"` deve permanecer **idêntico** entre estado normal e loading — leitor de tela não pode "perder" o botão por mudança de nome
2. **`aria-busy` exposto corretamente**: deve ser `"true"` em loading, **ausente** quando habilitado (não `"false"` — atributo opcional)
3. **Texto sr-only "Marcando vencedora…"** presente apenas em loading para anunciar estado de progresso
4. **Spinner `Loader2` com `aria-hidden="true"`** para não poluir leitura
5. **Cardinalidade isolada**: apenas o botão de índice = `loadingWinnerIndex` exibe estado de loading; os demais botões "Marcar vencedora" continuam plenamente acessíveis e habilitados

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **2 testes** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` (após o último teste de Enter/Space em loading), reusando `navVariations`.

---

**Teste 1 — `aria-label` permanece estável entre estado normal e loading; `aria-busy` exposto apenas em loading**

```ts
it("botão 'Marcar vencedora' preserva aria-label e expõe aria-busy/disabled apenas durante loading", () => {
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  const renderWith = (loadingIdx: number | null) => (
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={0}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
      loadingWinnerIndex={loadingIdx}
    />
  );

  // Estado 1: nenhum loading → todos habilitados, sem aria-busy
  const { rerender } = render(renderWith(null));
  const btn1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  expect(btn1).toHaveAttribute("aria-label", "Marcar variação 1 como vencedora");
  expect(btn1).not.toBeDisabled();
  expect(btn1).not.toHaveAttribute("aria-busy");
  expect(screen.queryByText("Marcando vencedora…")).not.toBeInTheDocument();

  // Estado 2: var-1 em loading → aria-label idêntico, disabled+aria-busy true, sr-only presente
  rerender(renderWith(0));
  const btn1Loading = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  expect(btn1Loading).toHaveAttribute("aria-label", "Marcar variação 1 como vencedora");
  expect(btn1Loading).toBeDisabled();
  expect(btn1Loading).toHaveAttribute("aria-busy", "true");
  expect(screen.getByText("Marcando vencedora…")).toBeInTheDocument();

  // Estado 3: remove loading → aria-label permanece, aria-busy some, sr-only some
  rerender(renderWith(null));
  const btn1Restored = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  expect(btn1Restored).toHaveAttribute("aria-label", "Marcar variação 1 como vencedora");
  expect(btn1Restored).not.toBeDisabled();
  expect(btn1Restored).not.toHaveAttribute("aria-busy");
  expect(screen.queryByText("Marcando vencedora…")).not.toBeInTheDocument();
});
```

---

**Teste 2 — Loading isolado por índice: spinner `aria-hidden`, sr-only único, demais botões intactos**

```ts
it("loading em um botão não afeta acessibilidade dos demais botões 'Marcar vencedora' (cardinalidade isolada)", () => {
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  const { container } = render(
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={0}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
      loadingWinnerIndex={1}
    />
  );

  // Apenas var-2 em loading
  const btn2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  expect(btn2).toBeDisabled();
  expect(btn2).toHaveAttribute("aria-busy", "true");

  // var-1 e var-3 permanecem totalmente acessíveis e habilitadas
  const btn1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  const btn3 = screen.getByRole("button", { name: "Marcar variação 3 como vencedora" });
  expect(btn1).not.toBeDisabled();
  expect(btn1).not.toHaveAttribute("aria-busy");
  expect(btn3).not.toBeDisabled();
  expect(btn3).not.toHaveAttribute("aria-busy");

  // sr-only "Marcando vencedora…" tem cardinalidade exata = 1 (apenas no botão em loading)
  const srOnlyMatches = screen.getAllByText("Marcando vencedora…");
  expect(srOnlyMatches).toHaveLength(1);
  expect(btn2.contains(srOnlyMatches[0])).toBe(true);

  // Spinner Loader2 está presente e marcado como aria-hidden (não poluir leitura)
  const spinners = container.querySelectorAll('svg[aria-hidden="true"].animate-spin');
  expect(spinners).toHaveLength(1);
  expect(btn2.contains(spinners[0])).toBe(true);

  // Botões de seleção (cards) permanecem todos habilitados — loading do "Marcar vencedora" não vaza
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ })).not.toBeDisabled();
  expect(screen.getByRole("button", { name: /^Selecionar variação 2/ })).not.toBeDisabled();
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).not.toBeDisabled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `rerender`, `screen`, `vi`, `MagicUpVariationComparator`, `navVariations`)
- 2 testes novos (96 → 98 testes)
- Queries por `aria-label` exato + `getByText` para sr-only seguem padrão estabelecido
- Verificação de spinner via `container.querySelectorAll` (única forma confiável de validar `aria-hidden` em SVG)

## Entregável

- 2 testes cobrindo perspectiva de **leitor de tela** sobre o botão desabilitado:
  1. `aria-label="Marcar variação N como vencedora"` é **idêntico** em normal/loading/restaurado — leitor de tela mantém referência estável ao botão; `aria-busy="true"` aparece apenas em loading; texto sr-only "Marcando vencedora…" aparece/desaparece junto com o estado
  2. Loading isolado por índice: spinner com `aria-hidden="true"` (não poluiu leitura), sr-only com cardinalidade = 1, demais botões "Marcar vencedora" e botões de seleção plenamente acessíveis
- Captura regressões onde:
  - `aria-label` mudasse durante loading (ex: virar "Marcando vencedora variação N…") — quebraria queries de testes e referência de screen reader
  - `aria-busy` virasse `"false"` ao invés de ausente quando habilitado (inflação de atributos)
  - Spinner perdesse `aria-hidden="true"` (leitor anunciaria SVG vazio)
  - `loadingWinnerIndex` afetasse mais de um botão (ex: por engano usar `>=` em vez de `===`)
  - Loading do "Marcar vencedora" desabilitasse o botão de seleção do mesmo card
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 98/98 verde

