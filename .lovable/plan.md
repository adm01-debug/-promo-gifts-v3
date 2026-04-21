

# Plano — Teste de duas variações com `isWinner: true` simultâneo

Adiciono 1 teste cobrindo cenário onde duas variações têm `isWinner: true` ao mesmo tempo, validando que apenas a primeira (menor índice) recebe a badge "Melhor score" — comportamento esperado dado o `findIndex` no componente.

## Justificativa

A lógica em `MagicUpVariationComparator.tsx`:
```ts
const winnerIndex = variations.findIndex((v, i) => v.isWinner || scores[i] === bestScore);
```

Cenário: scores diferentes (`[60, 70, 50]`) com `isWinner: true` nas variações 1 e 3 (índices 0 e 2). O `findIndex`:
- Índice 0: `isWinner=true` → **match**, retorna 0

Resultado: winnerIndex = 0 (primeira ocorrência de `isWinner: true`). A variação 2 (score 70, maior) NÃO ganha badge porque não tem `isWinner: true` e não é o primeiro match. A variação 3 (também `isWinner: true`) é ignorada.

**Contrato travado:** quando há múltiplos `isWinner: true`, vence o primeiro índice. Score mais alto é irrelevante se não é o primeiro `isWinner` ou se outro índice anterior já satisfez o predicate.

Protege contra refatorações como:
- `filter(v => v.isWinner)` retornando múltiplos winners
- Priorizar `isWinner` com maior score (`isWinner && score === bestScore`)
- Validações que rejeitariam múltiplos `isWinner: true` como inválido

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — adicionar 1 teste no `describe` do `MagicUpVariationComparator`, após os testes de empate existentes.

## Caso coberto

```ts
it("dois isWinner: true simultâneos: badge vai para o primeiro índice marcado, ignorando o segundo", () => {
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 60, isWinner: true },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50, isWinner: true },
  ];
  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );
  // Apenas 1 badge mesmo com 2 isWinner: true
  expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
  // Variação 1 (índice 0, primeiro isWinner) recebe sufixo
  expect(
    screen.getByRole("button", { name: "Selecionar variação 1, score 60, melhor score" })
  ).toBeInTheDocument();
  // Variação 2 (score 70, sem isWinner) não recebe badge — score mais alto é ignorado
  expect(
    screen.getByRole("button", { name: "Selecionar variação 2, score 70" })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })
  ).not.toBeInTheDocument();
  // Variação 3 (segundo isWinner) NÃO recebe badge — findIndex já parou no índice 0
  expect(
    screen.getByRole("button", { name: "Selecionar variação 3, score 50" })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Selecionar variação 3.*melhor score/i })
  ).not.toBeInTheDocument();
});
```

## Estratégia

- Reutiliza imports e padrão dos testes adjacentes
- Scores intencionalmente diferentes (60/70/50) para isolar o efeito de `isWinner` (não confunde com tie-break por score)
- Variação 2 com score MAIOR (70) sem `isWinner` confirma que `isWinner` tem precedência sobre score quando aparece antes no array
- Asserts negativos com `queryByRole` + regex para variações 2 e 3 garantem ausência inequívoca da badge

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou dependências
- 1 teste novo (27 → 28 testes)

## Entregável

- 1 teste novo em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato: múltiplos `isWinner: true` → vence o primeiro índice, demais são ignorados, score mais alto sem `isWinner` é ignorado
- Completa a matriz de tie-break: total, zero, parcial 2/3, triplo+isWinner, e agora múltiplos isWinner

