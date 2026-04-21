

# Plano — Teste defensivo: ausência de `bestScore` → nenhuma badge "Melhor score"

Adiciono teste validando o invariante defensivo do `MagicUpVariationComparator`: quando `bestScore === null` (todas variações sem score numérico) **e** nenhuma variação tem `isWinner=true`, nenhuma badge "Melhor score" é renderizada em nenhum card.

## Justificativa

A lógica atual em `MagicUpVariationComparator.tsx`:

```ts
const winnerIndex = explicitWinnerIndex >= 0
  ? explicitWinnerIndex
  : (bestScore !== null ? scores.findIndex((s) => s === bestScore) : -1);
```

Dois caminhos garantem `winnerIndex = -1`:
1. **`bestScore === null`** (sem scores numéricos) E sem `isWinner` → `-1`
2. **Caso "impossível"**: `bestScore` numérico mas nenhum `scores[i] === bestScore` — pelo `Math.max`, sempre existe pelo menos um match, então `findIndex` nunca retorna `-1`. Esse cenário é **logicamente inalcançável** dado o invariante de `Math.max`, mas vale travar como contrato defensivo.

**Cobertura atual:** já existem testes para "todos undefined → -1" e "todos null → nenhuma badge". O gap é validar a propriedade **defensiva** explicitamente: nenhuma badge nem mesmo no DOM (não só no índice 0), incluindo verificação de `aria-label` em todos os botões e ausência de menção a "melhor score" no header.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("invariante defensivo: sem bestScore (todas null) e sem isWinner — nenhuma badge 'Melhor score' renderiza em nenhum card", () => {
  const variations = [
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 0),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 1),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 2),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 3),
  ];
  renderTied(variations);

  // 1. Zero badges "Melhor score" no DOM inteiro
  expect(screen.queryAllByLabelText("Melhor score")).toHaveLength(0);

  // 2. Cada card individualmente: nenhuma badge
  const cards = screen.getAllByRole("listitem");
  expect(cards).toHaveLength(4);
  cards.forEach((card) => {
    expect(within(card).queryByLabelText("Melhor score")).toBeNull();
  });

  // 3. Nenhum aria-label de botão menciona "melhor score" nem "score N"
  for (let i = 1; i <= 4; i++) {
    const btn = screen.getByRole("button", { name: new RegExp(`Selecionar variação ${i}`) });
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).not.toContain("melhor score");
    expect(label).not.toMatch(/, score \d/);
  }

  // 4. Header global mostra "—" (placeholder) e aria-label "indisponível"
  const headerBadge = screen.getByLabelText(/Melhor score entre variações/);
  expect(headerBadge).toHaveTextContent("Melhor score: —");
  expect(headerBadge.getAttribute("aria-label")).toContain("indisponível");

  // 5. Cada card mostra "Score indisponível" no span de score
  cards.forEach((card) => {
    expect(within(card).getByLabelText("Score indisponível")).toBeInTheDocument();
  });
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx` — comportamento atual já é o contrato correto
- Reusa helpers `buildVariation`, `renderTied`, `within` já importados
- Sem novos imports
- Caso "impossível" (`bestScore` numérico sem match) é inalcançável por invariante de `Math.max` — não testável sem mock

## Entregável

- 1 novo teste defensivo cobrindo 5 invariantes simultâneos: zero badges no DOM, zero badges por card, zero menções em aria-labels, header com "—" e "indisponível", spans de score com "Score indisponível"
- Cobertura: 64 → 65 testes
- Trava propriedade defensiva: ausência de `bestScore` nunca renderiza vencedor falso, em nenhum nível do DOM

