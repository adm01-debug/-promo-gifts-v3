

# Plano — Teste de empate triplo com isWinner explícito

Adiciono 1 teste cobrindo cenário onde 3 variações empatam no melhor score, mas uma delas tem `isWinner: true` — validando que ainda assim apenas 1 badge "Melhor score" é renderizada (e que `findIndex` retorna o primeiro match, que continua sendo o índice 0 por causa do `||` curto-circuitando em `scores[i] === bestScore`).

## Justificativa

A lógica em `MagicUpVariationComparator.tsx`:
```ts
const winnerIndex = variations.findIndex((v, i) => v.isWinner || scores[i] === bestScore);
```

Cenário: scores `[85, 85, 85]`, com `isWinner: true` na variação 2 (índice 1). O `findIndex` itera do início:
- Índice 0: `isWinner=false`, mas `scores[0] === 85 === bestScore` → **match**, retorna 0

Portanto `winnerIndex === 0`, não 1. A badge aparece no índice 0, não na variação marcada explicitamente. **Esse é o comportamento atual** — o teste documenta e trava esse contrato.

Protege contra refatorações que poderiam:
- Priorizar `isWinner` antes do score (ex: `findIndex(v => v.isWinner) ?? findIndex(...)`)
- Renderizar 2 badges (uma para `isWinner`, outra para `bestScore`)
- Mudar a ordem do `||` no predicate

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — adicionar 1 teste no `describe` do `MagicUpVariationComparator`, após os testes de empate já existentes.

## Caso coberto

```ts
it("empate triplo com isWinner explícito: ainda exibe exatamente 1 badge 'Melhor score'", () => {
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 85 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 85, isWinner: true },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 85 },
  ];
  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );
  // Mesmo com isWinner explícito + 3 empatados, apenas 1 badge
  expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
  // findIndex retorna o primeiro match (índice 0 satisfaz scores[0] === bestScore)
  expect(
    screen.getByRole("button", { name: "Selecionar variação 1, score 85, melhor score" })
  ).toBeInTheDocument();
  // Variação 2 (com isWinner: true) NÃO recebe badge — comportamento atual do findIndex
  expect(
    screen.getByRole("button", { name: "Selecionar variação 2, score 85" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Selecionar variação 3, score 85" })
  ).toBeInTheDocument();
});
```

## Estratégia

- Reutiliza imports e padrão dos testes adjacentes
- Documenta inline o contrato real: predicate `v.isWinner || scores[i] === bestScore` faz `findIndex` retornar o primeiro índice que satisfaz **qualquer** das condições
- Strings literais em `getByRole` para travar o `aria-label` exato

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou dependências
- 1 teste novo

## Entregável

- 1 teste novo em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato: empate triplo + isWinner → ainda 1 única badge, no primeiro índice empatado
- Completa a suíte de tie-break (total, zero, parcial 2/3, triplo+isWinner)

