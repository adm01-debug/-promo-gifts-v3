

# Plano — Teste de empate em score 0 (não tratar 0 como ausente)

Adiciono 1 teste validando que `qualityScore: 0` é um valor válido (não confundido com "score ausente") e que o tie-break determinístico continua funcionando: winner = primeiro índice, exatamente 1 badge "Melhor score".

## Justificativa

A lógica em `MagicUpVariationComparator.tsx`:
```ts
const scores = variations.map((v) => v.qualityDiagnosis?.total || v.qualityScore || 0);
const bestScore = Math.max(...scores);
const winnerIndex = variations.findIndex((v, i) => v.isWinner || scores[i] === bestScore);
```

Quando todos os scores são `0`, `bestScore = 0` e **todos** os índices satisfazem `scores[i] === bestScore`. O `findIndex` retorna 0 (primeiro). O teste trava esse contrato e protege contra mudanças tipo `if (!score) skip` ou `score > 0` que tratariam 0 como ausência.

**Sutileza importante:** o aria-label do botão é construído com `${score ? \`, score ${score}\` : ""}` — então `score === 0` resulta em label SEM sufixo de score (porque `0` é falsy em JS). O teste deve refletir esse comportamento real, não o ideal.

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — adicionar 1 teste no `describe` do `MagicUpVariationComparator`, logo após o teste de empate total (score 80).

## Caso coberto

```ts
it("empate em score 0: trata 0 como valor válido e atribui 'Melhor score' ao primeiro índice", () => {
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 0 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 0 },
  ];
  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );
  // bestScore = 0 é válido → exatamente 1 badge "Melhor score"
  expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
  // Winner determinístico: índice 0 recebe o sufixo "melhor score" no aria-label
  // (aria-label omite ", score N" quando score é 0/falsy — comportamento atual do componente)
  expect(
    screen.getByRole("button", { name: "Selecionar variação 1, melhor score" })
  ).toBeInTheDocument();
  // Variação 2 não recebe sufixo de winner
  expect(
    screen.getByRole("button", { name: "Selecionar variação 2" })
  ).toBeInTheDocument();
});
```

## Estratégia

- Reutiliza imports e padrão dos testes adjacentes
- Confirma que `Math.max(0, 0) === 0` e que `findIndex` resolve no primeiro
- Documenta inline (via teste) que score 0 é válido — qualquer refator que adicione `if (score > 0)` ou `score ?? null` quebra CI

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou dependências
- 1 teste novo

## Entregável

- 1 teste novo em `tests/components/magic-up-onda5.test.tsx` (25 → 26 testes)
- Trava contrato: `qualityScore: 0` é tratado como número válido, não como ausência
- Empate em 0 → winner determinístico no índice 0, exatamente 1 badge

