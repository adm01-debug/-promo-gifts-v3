

# Plano — Teste de empate total no MagicUpVariationComparator

Adiciono um teste validando o comportamento determinístico quando todas as variações têm score idêntico: exatamente 1 badge "Melhor score" e o winner é sempre o primeiro índice (índice 0).

## Justificativa

A lógica em `MagicUpVariationComparator.tsx`:
```ts
const winnerIndex = variations.findIndex((variation, index) => variation.isWinner || scores[index] === bestScore);
```
`findIndex` retorna o **primeiro** match — empate total deve resolver para índice 0. Sem teste, uma refatoração futura (ex: trocar para `lastIndex` ou ordenar antes) quebra esse contrato silenciosamente.

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — adicionar 1 teste no `describe` existente do `MagicUpVariationComparator`.

## Caso coberto

**Empate total — winner determinístico no primeiro índice + única badge**

```ts
it("empate total: exibe exatamente 1 badge 'Melhor score' no primeiro índice (winner determinístico)", () => {
  const variations = [
    { id: "v1", imageUrl: "/a.png", qualityScore: 80 },
    { id: "v2", imageUrl: "/b.png", qualityScore: 80 },
    { id: "v3", imageUrl: "/c.png", qualityScore: 80 },
  ];
  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );
  // Exatamente 1 badge "Melhor score"
  const badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);
  // E está dentro do card da Variação 1 (primeiro índice)
  const firstCardButton = screen.getByRole("button", { name: /Selecionar variação 1.*melhor score/i });
  expect(firstCardButton).toBeInTheDocument();
  // Variações 2 e 3 NÃO têm "melhor score" no aria-label
  expect(screen.getByRole("button", { name: /^Selecionar variação 2, score 80$/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Selecionar variação 3, score 80$/ })).toBeInTheDocument();
});
```

## Estratégia

- Reutiliza imports e mocks já existentes no arquivo (`render`, `screen`, `vi`, `MagicUpVariationComparator`)
- Usa `getAllByLabelText("Melhor score")` para contar badges (a badge tem `aria-label="Melhor score"`)
- Usa `aria-label` do botão do card para confirmar que apenas o índice 0 recebe o sufixo `", melhor score"`
- Regex `^...$` em variações 2 e 3 garante ausência do sufixo de winner

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou dependências
- 1 teste novo, alinhado ao padrão existente do arquivo

## Entregável

- 1 teste novo em `tests/components/magic-up-onda5.test.tsx`
- Trava o contrato: empate → winner = índice 0, exatamente 1 badge
- Qualquer mudança futura na lógica de tie-break (ex: trocar `findIndex` por `lastIndexOf` ou `Math.random`) quebra CI

