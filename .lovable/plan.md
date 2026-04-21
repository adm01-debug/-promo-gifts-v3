

# Plano — Teste: nenhum score → nenhuma badge "Melhor score" no DOM

Adiciono teste validando que quando **todas as variações não têm `qualityScore` nem `qualityDiagnosis`**, a UI **não exibe nenhuma badge "Melhor score"** nos cards e o badge global do header mostra "—" (placeholder de score indisponível).

## Justificativa

A lógica atual em `MagicUpVariationComparator.tsx`:

```ts
const scores = variations.map((v) => v.qualityDiagnosis?.total || v.qualityScore || 0);
const bestScore = Math.max(...scores);  // = 0 quando todos undefined
const winnerIndex = variations.findIndex(
  (v, i) => v.isWinner || scores[i] === bestScore
);  // = 0 (índice 0 satisfaz 0===0)
```

O teste anterior (caso degenerado) **trava o comportamento atual**: badge aparece no índice 0 mesmo sem score. Mas o **contrato semântico desejado** é diferente: se nenhuma variação tem score real, **não deveria haver vencedor** — exibir "Melhor score" sem dados é enganoso para o usuário.

**Gap:** o teste pedido pelo usuário expõe um possível bug de UX (badge falsa quando `bestScore=0`). Preciso decidir se:
- **(A)** Ajusto o componente para ocultar badge quando `bestScore === 0` (mudança de comportamento)
- **(B)** Adapto o teste para validar comportamento atual (badge no índice 0 mesmo sem score) — mas isso contradiz o pedido literal ("garantindo que 'Melhor score' não seja exibida")

O pedido é explícito: **"Melhor score" não deve ser exibida**. Isso requer **alterar o componente** para ocultar a badge quando `bestScore === 0`, e adicionar o teste que trava esse novo contrato.

## Alterações

### 1. `src/components/magic-up/MagicUpVariationComparator.tsx`

Adicionar guard `bestScore > 0` ao cálculo de `winnerIndex` e à renderização da badge:

```tsx
const scores = variations.map((v) => v.qualityDiagnosis?.total || v.qualityScore || 0);
const bestScore = Math.max(...scores);
const hasValidScores = bestScore > 0;
const winnerIndex = hasValidScores
  ? variations.findIndex((v, i) => v.isWinner || scores[i] === bestScore)
  : -1;  // -1 = nenhum vencedor
```

E na renderização do badge dentro do card:
```tsx
{isWinner && hasValidScores && <Badge ...>Melhor score</Badge>}
```

(Como `winnerIndex = -1`, `isWinner = (index === -1)` é sempre `false`, então a guarda `hasValidScores` é redundante mas explícita — mantém para clareza.)

O badge do header (`Melhor score: —`) já trata `bestScore || "—"` corretamente — sem mudança.

### 2. `tests/components/magic-up-onda5.test.tsx`

Adicionar teste ao final da sub-suíte de empate:

```ts
it("nenhum score (todos undefined): badge 'Melhor score' não aparece em nenhum card e winnerIndex não é falso", () => {
  const variations = [
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 0),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 1),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 2),
  ];
  renderTied(variations);

  // Nenhuma badge "Melhor score" nos cards (queryAllByLabelText retorna array vazio)
  const cards = screen.getAllByRole("listitem");
  expect(cards).toHaveLength(3);
  cards.forEach((card) => {
    expect(within(card).queryByLabelText("Melhor score")).toBeNull();
  });

  // Nenhum aria-label de botão menciona "melhor score"
  for (let i = 1; i <= 3; i++) {
    const btn = screen.getByRole("button", { name: new RegExp(`Selecionar variação ${i}`) });
    expect(btn.getAttribute("aria-label")).not.toContain("melhor score");
    expect(btn.getAttribute("aria-label")).not.toMatch(/score \d/);
  }

  // Badge global do header mostra "—" (placeholder)
  expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: —");
});
```

### 3. Ajustar teste existente que valida comportamento antigo

O teste anterior `caso degenerado (todos sem score): bestScore=0, badge ainda aparece no índice 0` e o `it.each` que asserta `toHaveLength(1)` para score 0 **passariam a falhar** com a mudança no componente.

**Ajustes necessários:**
- Remover/atualizar o teste `caso degenerado ... badge ainda aparece no índice 0` → trocar asserções para `queryByLabelText("Melhor score")).toBeNull()` em todos os cards
- Atualizar `it.each([2, 3, 5])` para que o caso `qualityScore: undefined` seja **separado** dos casos com score real — ou substituir o helper para usar `qualityScore: 75` em vez de `undefined`, mantendo o teste de empate válido em score real
- Atualizar o teste de `aria-label score=0` (recém-adicionado) → vencedor não existe mais quando todos têm score 0, então o aria-label do índice 0 **não deve conter "melhor score"** (inverter asserção)

**Plano de ajuste dos 2 testes pré-existentes:**

| Teste atual | Novo comportamento |
|---|---|
| `caso degenerado: badge no índice 0` | Renomear: `caso degenerado: nenhuma badge em nenhum card` — asserções invertidas |
| `it.each([2,3,5]) score=0: 1 badge no índice 0` | Trocar fixture para `qualityScore: 75` (mantém empate real) — testa apenas empate em score válido |
| `aria-label score=0: vencedor com 'melhor score', sem 'score 0'` | Inverter: `aria-label score=0: nenhum botão recebe 'melhor score' nem 'score N'` |

## Restrições

- Mudança comportamental no componente é **intencional** — corrige UX enganosa de mostrar vencedor sem dados
- Sem alterar testes fora da sub-suíte de empate
- Sem novos imports
- Helper `buildVariation` já suporta `undefined` para ambos os campos

## Entregável

- 1 modificação em `MagicUpVariationComparator.tsx` (guard `bestScore > 0`)
- 1 novo teste validando contrato "sem score → sem badge"
- 3 testes existentes ajustados para o novo contrato (2 substituídos por variantes de score real, 1 invertido)
- Cobertura: 58 → 59 testes (1 novo + 3 ajustados)
- Trava contrato UX: sem dados → sem vencedor falso

