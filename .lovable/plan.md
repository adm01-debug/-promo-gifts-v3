

# Plano — Teste de invariância da badge sob cliques em cards empatados não vencedores

Adiciono um novo teste ao `tests/components/magic-up-onda5.test.tsx` que valida o cenário específico de **empate entre perdedores**: dois cards não vencedores compartilham o mesmo score, e o usuário clica neles em sequência. A badge "Melhor score" deve permanecer **fixa no winner único** (índice 0) sem nunca migrar para nenhum dos empatados.

## Justificativa

O teste atual de invariância (`badge 'Melhor score' permanece no winnerIndex...`) cobre cliques em cards com scores **distintos**. Falta cenário onde:

1. **Dois perdedores empatados** (ex: var-B=70, var-C=70) clicados sequencialmente — risco de a lógica de desempate acidentalmente promover um deles a "winner visual" ao receber `activeIndex`
2. **Tie-breaking determinístico** entre perdedores — confirma que o `Math.max` sobre scores e o `findIndex` no componente sempre retornam o vencedor real (var-A=95), independente de cliques posteriores
3. **Cardinalidade global = 1** preservada após N cliques em empatados — captura regressão onde múltiplos cards empatados receberiam badge

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar novo teste no `describe` do `MagicUpVariationComparator`, após o teste de invariância existente:

```ts
it("badge 'Melhor score' não migra ao clicar em sequência em cards empatados não vencedores", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  // Setup: var-A é winner único (95); var-B e var-C empatadas em 70 (perdedoras)
  const variations: VariationItem[] = [
    { id: "var-A", imageUrl: "https://example.com/a.png", qualityScore: 95 },
    { id: "var-B", imageUrl: "https://example.com/b.png", qualityScore: 70 },
    { id: "var-C", imageUrl: "https://example.com/c.png", qualityScore: 70 },
  ];
  const winnerIndex = 0;

  const renderWithActive = (activeIndex: number) => (
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={activeIndex}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );

  const { rerender } = render(renderWithActive(0));

  // Helper: valida que badge está SOMENTE em var-A em todos os estados
  const assertBadgeFixedOnWinner = (currentActive: number, label: string) => {
    const cards = screen.getAllByRole("listitem");

    // 1. Cardinalidade global: exatamente 1 badge no DOM (label + texto)
    expect(screen.getAllByLabelText("Melhor score", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("Melhor score", { exact: true })).toHaveLength(1);

    // 2. Badge presente em var-A (winner único)
    expect(within(cards[winnerIndex]).getByLabelText("Melhor score")).toBeInTheDocument();

    // 3. Badge AUSENTE nas duas empatadas (var-B e var-C)
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    // 4. Aria-labels: empatadas têm 2 componentes (sem sufixo); winner tem 3
    const aLabel = within(cards[0]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
    const bLabel = within(cards[1]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
    const cLabel = within(cards[2]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
    expect(aLabel).toBe("Selecionar variação 1, score 95, melhor score");
    expect(bLabel).toBe("Selecionar variação 2, score 70");
    expect(cLabel).toBe("Selecionar variação 3, score 70");

    // 5. aria-pressed reflete activeIndex; badge é independente
    expect(within(cards[currentActive]).getByRole("button", { name: /^Selecionar variação/ }))
      .toHaveAttribute("aria-pressed", "true");
  };

  // Estado inicial
  assertBadgeFixedOnWinner(0, "inicial");

  // CLIQUE 1: var-B (empatada, perdedora)
  await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: /^Selecionar variação 2/ }));
  expect(onSelect).toHaveBeenLastCalledWith(1);
  rerender(renderWithActive(1));
  assertBadgeFixedOnWinner(1, "após clique em var-B");

  // CLIQUE 2: var-C (outra empatada)
  await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
  expect(onSelect).toHaveBeenLastCalledWith(2);
  rerender(renderWithActive(2));
  assertBadgeFixedOnWinner(2, "após clique em var-C");

  // CLIQUE 3: volta para var-B (toggle entre empatadas)
  await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: /^Selecionar variação 2/ }));
  expect(onSelect).toHaveBeenLastCalledWith(1);
  rerender(renderWithActive(1));
  assertBadgeFixedOnWinner(1, "após retorno a var-B");

  // CLIQUE 4: var-C novamente (segunda iteração entre empatadas)
  await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
  expect(onSelect).toHaveBeenLastCalledWith(2);
  rerender(renderWithActive(2));
  assertBadgeFixedOnWinner(2, "após segundo clique em var-C");

  // Auditoria final
  expect(onSelect).toHaveBeenCalledTimes(4);
  expect(onSelect.mock.calls.map((c) => c[0])).toEqual([1, 2, 1, 2]);
  expect(onSelectWinner).not.toHaveBeenCalled();

  // Badge nunca apareceu em var-B ou var-C em NENHUM dos 5 estados (inicial + 4 cliques)
  // Isso é garantido pela cardinalidade global = 1 + presença em var-A em cada assert
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `rerender`, `screen`, `within`, `user`, `vi`, `VariationItem`)
- Cenário ortogonal aos testes existentes: foco em **empate entre perdedores** (não cobre empate envolvendo o winner — já validado em outros testes)
- 4 cliques + estado inicial = 5 snapshots × 5 invariantes por snapshot = **25 verificações**

## Entregável

- 1 novo teste (78 → 79 testes)
- Trava 4 invariantes específicas para empate entre perdedores:
  1. Badge permanece fixa em var-A (winner único com score 95) através de 4 cliques alternados em var-B e var-C (ambas com score 70)
  2. Cardinalidade global = 1 preservada em todos os 5 estados (inicial + 4 cliques)
  3. Aria-labels das empatadas (var-B, var-C) **nunca** ganham sufixo `, melhor score`
  4. `aria-pressed` migra normalmente entre empatadas; badge é dimensão ortogonal
- Captura regressões onde:
  - Lógica de desempate promovesse acidentalmente um perdedor empatado ao receber foco/seleção
  - `findIndex` retornasse `activeIndex` em vez do índice do max real
  - Badge fosse duplicada em ambos os empatados (cardinalidade > 1)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 79/79 verde

