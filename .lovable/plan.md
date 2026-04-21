

# Plano — Teste do `aria-label` correto quando `qualityScore` é 0

Adiciono teste validando que o `aria-label` do botão de seleção de variação **não inclui "score 0"** quando o score é 0 (falsy), mas a variação **ainda é destacada como vencedora** ("melhor score") no caso degenerado de empate em zero.

## Justificativa

A lógica atual em `MagicUpVariationComparator.tsx` (linha 60):

```tsx
aria-label={`Selecionar variação ${index + 1}${score ? `, score ${score}` : ""}${isWinner ? ", melhor score" : ""}`}
```

Comportamento contratual:
- `score ? ...` é **falsy quando score=0** → trecho `, score 0` é **omitido**
- `isWinner` continua avaliado independentemente → trecho `, melhor score` aparece se a variação for vencedora

Esse comportamento é o correto: anunciar "score 0" para screen readers seria ruído sem valor (significa "score indisponível"), mas omitir o destaque de vencedor seria perda de informação semântica.

**Gap atual:** nenhum teste valida explicitamente que o `aria-label` da variação vencedora com score 0 contém "melhor score" mas **não** contém "score 0". Refactor que troque `score ?` por `score !== undefined` quebraria o contrato silenciosamente (passaria a anunciar "score 0").

## Arquivo alterado

Apenas testes:
- **`tests/components/magic-up-onda5.test.tsx`** — adiciona 1 teste ao final da sub-suíte `MagicUpVariationComparator — empate total de scores (determinismo)`

## Novo teste

```ts
it("score=0 (empate degenerado): aria-label do vencedor inclui 'melhor score' mas omite 'score 0'", () => {
  const variations = [
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 0),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 1),
    buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 2),
  ];
  renderTied(variations);

  // Vencedor (índice 0): aria-label deve conter "melhor score" mas NÃO "score 0"
  const winnerButton = screen.getByRole("button", { name: /Selecionar variação 1/ });
  const winnerLabel = winnerButton.getAttribute("aria-label") || "";
  expect(winnerLabel).toContain("melhor score");
  expect(winnerLabel).not.toMatch(/score 0\b/);
  expect(winnerLabel).not.toContain(", score 0");

  // Não-vencedores (índices 1, 2): aria-label não menciona "score 0" nem "melhor score"
  const loser1 = screen.getByRole("button", { name: /Selecionar variação 2/ });
  const loser2 = screen.getByRole("button", { name: /Selecionar variação 3/ });
  expect(loser1.getAttribute("aria-label")).not.toMatch(/score 0\b/);
  expect(loser1.getAttribute("aria-label")).not.toContain("melhor score");
  expect(loser2.getAttribute("aria-label")).not.toMatch(/score 0\b/);
  expect(loser2.getAttribute("aria-label")).not.toContain("melhor score");
});
```

**Cobre 3 contratos de a11y:**
1. **Omissão de "score 0"** no vencedor — evita ruído para screen readers
2. **Presença de "melhor score"** no vencedor mesmo com score=0 — preserva destaque semântico
3. **Não-vencedores não recebem "melhor score"** — confirma que `isWinner` é exclusivo do índice 0 no empate degenerado (consistente com testes anteriores da sub-suíte)

**Regex `\b` em `score 0`** garante que matches como "score 05" (improvável mas possível) não falseiem o assertion.

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` — comportamento atual é o contrato
- Sem alterar testes existentes — apenas adiciona 1 novo teste
- Reusa helpers `buildVariation` e `renderTied` já definidos
- Sem novos imports

## Entregável

- 1 novo teste ao final da sub-suíte de empate em `tests/components/magic-up-onda5.test.tsx`
- Cobertura final: 57 → 58 testes
- Trava contrato a11y: `aria-label` do vencedor com score 0 contém "melhor score" e omite "score 0"
- Conformidade WCAG 4.1.2 (Name/Role/Value) para caso degenerado de score zerado

