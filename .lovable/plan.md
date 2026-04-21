

# Plano — Reforçar teste de empate em score 0 no `MagicUpVariationComparator`

O teste de score 0 já existe na sub-suíte criada anteriormente (`tests/components/magic-up-onda5.test.tsx`), mas valida apenas o posicionamento da badge no índice 0 — **não** assegura explicitamente que existe **exatamente 1** badge no total. Adiciono novo teste dedicado e mais rigoroso para esse caso degenerado.

## Justificativa

O teste atual de score 0:
```ts
it("caso degenerado (todos sem score): bestScore=0, badge ainda aparece no índice 0", () => {
  // verifica within(cards[0/1/2]).queryByLabelText("Melhor score")
  // mas NÃO verifica getAllByLabelText("Melhor score").toHaveLength(1)
});
```

Falta a asserção global de contagem (`toHaveLength(1)`), presente nos outros testes da sub-suíte (qualityScore=75, qualityDiagnosis=90, empate parcial). Isso cria assimetria: se aparecesse uma badge extra fora dos cards listados, o teste passaria silenciosamente.

Riscos cobertos pelo novo teste:
- **Contagem global** de badges "Melhor score" no caso degenerado (todos com score 0)
- **Determinismo do winnerIndex=0** mesmo quando `bestScore` é falsy (`0`)
- **Variação no número de cards** (testa com 2, 3 e 5 variações zeradas) — garante que o índice 0 sempre vence independentemente do tamanho do array

## Arquivo alterado

Apenas testes:
- **`tests/components/magic-up-onda5.test.tsx`** — adiciona 1 teste paramétrico ao final da sub-suíte `MagicUpVariationComparator — empate total de scores (determinismo)`

## Novo teste

```ts
it.each([2, 3, 5])(
  "empate em score 0 com %i variações: exatamente 1 badge 'Melhor score', sempre no índice 0",
  (count) => {
    const variations = Array.from({ length: count }, (_, i) =>
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, i)
    );
    renderTied(variations);

    // Asserção global: apenas 1 badge no DOM inteiro
    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);

    // Asserção de posicionamento: badge no card[0], ausente nos demais
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(count);
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    for (let i = 1; i < count; i++) {
      expect(within(cards[i]).queryByLabelText("Melhor score")).toBeNull();
    }
  }
);
```

**Cobre:**
- Contagem global (`toHaveLength(1)`) — fechava o gap do teste anterior
- 3 cenários de tamanho (2, 5, 5) confirmam que o comportamento é estável independentemente do número de variações
- Asserção de posicionamento determinístico no índice 0 mantida e aplicada a TODOS os índices `i ≥ 1` (não apenas 1 e 2)

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` — comportamento atual é o contrato
- Sem alterar testes existentes da sub-suíte — apenas adiciona
- Reusa helper `buildVariation` e `renderTied` já definidos
- `it.each` já é padrão Vitest, sem novos imports

## Entregável

- 1 novo teste paramétrico (3 execuções: 2, 3, 5 variações) ao final da sub-suíte de empate
- Cobertura final do arquivo: 54 → 55 testes (3 execuções via `it.each`)
- Trava reforçada: empate em score 0 → exatamente 1 badge no índice 0, em qualquer cardinalidade

