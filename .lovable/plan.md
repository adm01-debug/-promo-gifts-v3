

# Plano — Teste: `isWinner=true` tem prioridade sobre score maior

Adiciono teste validando que quando uma variação tem `isWinner=true` mas score **menor** que outra, ela ainda recebe a badge "Melhor score" (prioridade do flag explícito sobre o cálculo automático).

## Justificativa

A lógica atual em `MagicUpVariationComparator.tsx`:

```ts
const winnerIndex = hasValidScores
  ? variations.findIndex((v, i) => v.isWinner || scores[i] === bestScore)
  : -1;
```

O operador `||` no predicate dá **prioridade ao `isWinner`**: se uma variação no índice `i` tem `isWinner=true`, ela vence imediatamente — mesmo que outra variação tenha score maior. `findIndex` retorna o **primeiro** índice que satisfaz, então se `isWinner` está num índice anterior ao `bestScore`, ela vence; mas se `isWinner` está num índice posterior, depende da ordem.

**Casos a travar:**
1. `isWinner=true` em índice 0 com score 50, índice 1 com score 90 (sem isWinner) → vencedor = 0 (isWinner)
2. `isWinner=true` em índice 2 com score 30, índices 0/1 com score 70/80 → vencedor = ? (`findIndex` itera 0→2, índice 1 satisfaz `scores[1]===bestScore=80` antes de chegar ao 2 com isWinner)

**Comportamento real do caso 2:** `findIndex` encontra índice 1 primeiro (`scores[1] === 80 === bestScore`), retorna 1 — `isWinner=true` no índice 2 é **ignorado**. Isso é um bug sutil de prioridade.

**Decisão:** o teste pedido pelo usuário ("isWinner segue a regra de prioridade") implica que `isWinner=true` deve **sempre** vencer, independente da posição. Isso requer reordenar a lógica:

```ts
const explicitWinner = variations.findIndex((v) => v.isWinner);
const winnerIndex = hasValidScores
  ? (explicitWinner >= 0 ? explicitWinner : variations.findIndex((_, i) => scores[i] === bestScore))
  : explicitWinner; // -1 se nenhum, ou índice do isWinner mesmo sem scores
```

Edge case: se `isWinner=true` mas `bestScore=0` (sem scores válidos), o flag explícito ainda deve vencer — `isWinner` é decisão de UX/curadoria que sobrepõe ausência de score automático.

## Alterações

### 1. `src/components/magic-up/MagicUpVariationComparator.tsx`

Substituir cálculo de `winnerIndex` para garantir prioridade absoluta de `isWinner`:

```tsx
const scores = variations.map((v) => v.qualityDiagnosis?.total || v.qualityScore || 0);
const bestScore = Math.max(...scores);
const hasValidScores = bestScore > 0;
const explicitWinnerIndex = variations.findIndex((v) => v.isWinner);
const winnerIndex = explicitWinnerIndex >= 0
  ? explicitWinnerIndex
  : (hasValidScores ? variations.findIndex((_, i) => scores[i] === bestScore) : -1);
```

Renderização de badge permanece `{isWinner && ...}` (onde `isWinner = index === winnerIndex`).

**Comportamento resultante:**
- `isWinner=true` em qualquer índice → vence (mesmo sem scores)
- Sem `isWinner` + scores válidos → primeiro com bestScore vence
- Sem `isWinner` + sem scores → nenhum vencedor

### 2. `tests/components/magic-up-onda5.test.tsx`

Adicionar 3 testes no final da sub-suíte de empate:

```ts
it("isWinner=true em índice 0 com score menor (50) vence sobre índice 1 com score maior (90)", () => {
  const variations = [
    buildVariation({ qualityScore: 50, isWinner: true }, 0),
    buildVariation({ qualityScore: 90 }, 1),
    buildVariation({ qualityScore: 70 }, 2),
  ];
  renderTied(variations);

  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  const cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

  // aria-label do vencedor confirma destaque mesmo com score 50
  const winnerBtn = screen.getByRole("button", { name: /Selecionar variação 1/ });
  expect(winnerBtn.getAttribute("aria-label")).toContain("melhor score");
  expect(winnerBtn.getAttribute("aria-label")).toContain("score 50");
});

it("isWinner=true em índice 2 com score menor (30) vence sobre índices 0/1 com scores maiores (70/80)", () => {
  const variations = [
    buildVariation({ qualityScore: 70 }, 0),
    buildVariation({ qualityScore: 80 }, 1),
    buildVariation({ qualityScore: 30, isWinner: true }, 2),
  ];
  renderTied(variations);

  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  const cards = screen.getAllByRole("listitem");
  expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).not.toBeNull();
});

it("isWinner=true sem scores válidos: vence mesmo com bestScore=0", () => {
  const variations = [
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 0),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: true }, 1),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 2),
  ];
  renderTied(variations);

  // isWinner sobrepõe guard hasValidScores
  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  const cards = screen.getAllByRole("listitem");
  expect(within(cards[1]).queryByLabelText("Melhor score")).not.toBeNull();
  expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
  expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

  // Badge global do header ainda mostra "—" (não há bestScore numérico)
  expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: —");
});
```

### 3. Verificar testes pré-existentes

Pesquisar no arquivo qualquer fixture com `isWinner: true` combinado com score menor — se existirem, podem precisar de ajuste. O teste base com `qualityScore: 90, isWinner: true` (linha ~911) tem score maior, então é compatível com a nova lógica (vence por ambos os critérios). Sem ajustes esperados, mas validar via execução.

## Restrições

- Mudança comportamental no componente é **intencional** — corrige bug de prioridade do operador `||`
- `isWinner=true` torna-se **flag absoluto de curadoria** (sobrepõe scores e ausência de scores)
- Reusa helpers `buildVariation`, `renderTied`, `within` já importados
- Sem novos imports

## Entregável

- 1 modificação em `MagicUpVariationComparator.tsx` (cálculo de `winnerIndex` com prioridade explícita)
- 3 novos testes cobrindo: `isWinner` em posição inicial com score menor, `isWinner` em posição final com score menor, `isWinner` sem scores válidos
- Cobertura: 58 → 61 testes
- Trava contrato: `isWinner=true` é prioridade absoluta sobre cálculo automático

