

# Plano — Teste de clique em card empatado não-vencedor não move a badge

Adiciono 1 teste validando que, em cenário de empate, clicar em um card que tem o mesmo score do vencedor mas NÃO é o `winnerIndex` (não é o primeiro índice empatado) **não move a badge "Melhor score"**. O `onSelect` é chamado, mas o `winnerIndex` é puramente derivado de `variations` + `scores`, não do `activeIndex` — portanto a badge permanece no índice 0.

## Justificativa

A lógica em `MagicUpVariationComparator.tsx`:
```ts
const winnerIndex = variations.findIndex((v, i) => v.isWinner || scores[i] === bestScore);
```

`winnerIndex` é independente de `activeIndex`. Clicar em um card chama `onSelect(index)` mas:
- Não muta `variations`
- Não recalcula `winnerIndex` baseado em seleção
- A badge permanece ancorada ao primeiro empatado

**Contrato travado:** seleção (UI state) é ortogonal a winner (data state). Clicar no card 2 (empatado, não-vencedor) chama `onSelect(1)` mas a badge continua no card 1.

Protege contra refatorações como:
- Mover badge para o card ativo
- Fazer `winnerIndex = activeIndex` quando há empate
- Adicionar lógica de "winner = último clicado entre empatados"

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — adicionar 1 teste no `describe` do `MagicUpVariationComparator`, após os testes de empate/isWinner existentes.

## Caso coberto

```ts
it("clicar em card empatado não-vencedor: chama onSelect mas não move a badge 'Melhor score'", () => {
  const onSelect = vi.fn();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 80 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 80 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 80 },
  ];
  const { rerender } = render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={onSelect}
      onSelectWinner={vi.fn()}
    />
  );
  // Estado inicial: badge no card 1 (índice 0, primeiro empatado)
  expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
  expect(
    screen.getByRole("button", { name: "Selecionar variação 1, score 80, melhor score" })
  ).toBeInTheDocument();

  // Clica no card 2 (empatado, mas não é winner)
  fireEvent.click(screen.getByRole("button", { name: "Selecionar variação 2, score 80" }));
  expect(onSelect).toHaveBeenCalledWith(1);

  // Simula update do parent: activeIndex agora é 1
  rerender(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={1}
      onSelect={onSelect}
      onSelectWinner={vi.fn()}
    />
  );

  // Badge AINDA está no card 1 — winnerIndex independe de activeIndex
  expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
  expect(
    screen.getByRole("button", { name: "Selecionar variação 1, score 80, melhor score" })
  ).toBeInTheDocument();
  // Card 2 (agora ativo) continua sem o sufixo de winner
  expect(
    screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })
  ).not.toBeInTheDocument();
  // aria-pressed do card 2 deve refletir seleção (sanity check da seleção real)
  expect(
    screen.getByRole("button", { name: "Selecionar variação 2, score 80" })
  ).toHaveAttribute("aria-pressed", "true");
});
```

## Estratégia

- Usa `rerender` da Testing Library para simular o ciclo controlled-component (parent atualiza `activeIndex` após `onSelect`)
- Verifica `onSelect` foi chamado com índice correto (contrato de callback intacto)
- Asserts pré e pós-clique confirmam invariância da badge
- `aria-pressed="true"` no card 2 pós-rerender confirma que a seleção realmente mudou (descarta hipótese de "rerender não funcionou")
- Reutiliza `fireEvent` (já importado nos testes adjacentes da suíte)

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou imports além de `fireEvent` (já presente)
- 1 teste novo (28 → 29 testes)

## Entregável

- 1 teste novo em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato: `winnerIndex` é função pura de `variations`, ortogonal a `activeIndex`
- Cobertura UX: clicar em empatado não "rouba" o status de winner

