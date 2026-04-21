

# Plano — Testes de robustez do `aria-label` quando `qualityScore` é ausente

Adiciono **1 teste** ao final do sub-describe `"setas atualizam activeIndex e ARIA acompanha após rerender"` em `tests/components/magic-up-onda5.test.tsx`, validando que quando `qualityScore` é `undefined` (e `qualityDiagnosis.total` também ausente), o `aria-label` do card:
1. **NÃO** inclui literal `"score 0"` (que seria falso-negativo da lógica `score !== null`)
2. **NÃO** inclui o substring `"score"` precedido de número
3. Mantém estrutura consistente entre cards winner e não-winner (apenas o sufixo `, melhor score` muda)

## Justificativa

A lógica em `MagicUpVariationComparator.tsx` linha ~80:

```ts
aria-label={`Selecionar variação ${index + 1}${score !== null ? `, score ${score}` : ""}${isWinner ? ", melhor score" : ""}`}
```

usa `score !== null` (não `score != null` nem `!!score`), o que é correto — `0` é score válido e deve aparecer. Mas existem riscos não cobertos:

| Risco | Como passa silenciosamente |
|---|---|
| Refator trocar `score !== null` por `score` (truthy) | Score `0` legítimo desaparece do rótulo — perda de info crítica |
| Refator trocar `score !== null` por `score != null` | Comportamento idêntico, mas se alguém depois mudar `resolveScore` para retornar `undefined` em vez de `null`, label vira `"score undefined"` |
| Refator inverter condição e gerar `"score 0"` quando ausente | Screen reader anuncia "score zero" para variação sem avaliação — informação falsa |
| Variação winner sem score perde sufixo `melhor score` por curto-circuito | Inconsistência: winner com score tem 2 sufixos, winner sem score perde ambos |
| Inserção de espaço duplo entre sufixos quando score ausente | `"Selecionar variação 1  , melhor score"` — feio mas funcional, regressão silenciosa |

**Princípio**: ausência de dado ≠ dado zero. O `aria-label` deve refletir essa distinção.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final do sub-describe `"setas atualizam activeIndex e ARIA acompanha após rerender"` (após o teste de hierarquia acessível, antes do `});` que fecha o describe interno):

```ts
it("aria-label omite 'score' quando qualityScore/qualityDiagnosis.total ausentes; consistência winner/não-winner preservada", async () => {
  const onSelectWinner = vi.fn();

  // Fixture: 4 variações cobrindo matriz completa de combinações
  // [score? × winner?]
  const matrixVariations = [
    // 0: sem score, não-winner
    { ...navVariations[0], qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false },
    // 1: sem score, winner
    { ...navVariations[0], id: "var-no-score-winner", qualityScore: undefined, qualityDiagnosis: undefined, isWinner: true },
    // 2: com score 0 (caso-limite — zero é válido), não-winner
    { ...navVariations[0], id: "var-score-zero", qualityScore: 0, qualityDiagnosis: undefined, isWinner: false },
    // 3: com score 85, não-winner
    { ...navVariations[0], id: "var-score-85", qualityScore: 85, qualityDiagnosis: undefined, isWinner: false },
  ];

  render(
    <MagicUpVariationComparator
      variations={matrixVariations}
      activeIndex={0}
      onSelect={() => {}}
      onSelectWinner={onSelectWinner}
    />
  );

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  const card4 = screen.getByRole("button", { name: /^Selecionar variação 4/ });

  const label1 = card1.getAttribute("aria-label") ?? "";
  const label2 = card2.getAttribute("aria-label") ?? "";
  const label3 = card3.getAttribute("aria-label") ?? "";
  const label4 = card4.getAttribute("aria-label") ?? "";

  // ── 1) Sem score: NÃO contém ", score" nem "score 0" nem "score undefined" ──
  expect(label1).not.toMatch(/,\s*score\s/i);
  expect(label1).not.toMatch(/score\s+0\b/i);
  expect(label1).not.toMatch(/score\s+undefined/i);
  expect(label1).not.toMatch(/score\s+null/i);
  expect(label1).not.toMatch(/score\s+NaN/i);

  expect(label2).not.toMatch(/,\s*score\s/i);
  expect(label2).not.toMatch(/score\s+0\b/i);
  expect(label2).not.toMatch(/score\s+undefined/i);

  // ── 2) Score 0 É anunciado (zero é dado válido, não ausência) ──
  expect(label3).toMatch(/score\s+0\b/i);

  // ── 3) Score 85 é anunciado normalmente ──
  expect(label4).toMatch(/score\s+85\b/i);

  // ── 4) Winner sem score MANTÉM sufixo "melhor score" ──
  // (curto-circuito de score ausente não pode arrastar isWinner)
  expect(label2).toMatch(/melhor score/i);
  expect(label1).not.toMatch(/melhor score/i);
  expect(label3).not.toMatch(/melhor score/i);
  expect(label4).not.toMatch(/melhor score/i);

  // ── 5) Consistência estrutural: prefixo idêntico ──
  // Todos começam com "Selecionar variação N"
  expect(label1).toMatch(/^Selecionar variação 1/);
  expect(label2).toMatch(/^Selecionar variação 2/);
  expect(label3).toMatch(/^Selecionar variação 3/);
  expect(label4).toMatch(/^Selecionar variação 4/);

  // ── 6) Winner sem score = prefixo + ", melhor score" (sem fragmento de score numérico) ──
  expect(label2).toBe("Selecionar variação 2, melhor score");

  // ── 7) Não-winner sem score = APENAS prefixo (nada mais) ──
  expect(label1).toBe("Selecionar variação 1");

  // ── 8) Não-winner com score 0 = prefixo + ", score 0" ──
  expect(label3).toBe("Selecionar variação 3, score 0");

  // ── 9) Não-winner com score 85 = prefixo + ", score 85" ──
  expect(label4).toBe("Selecionar variação 4, score 85");

  // ── 10) Sem espaços duplos, vírgulas órfãs ou sufixos vazios ──
  [label1, label2, label3, label4].forEach((label) => {
    expect(label).not.toMatch(/\s{2,}/); // sem espaços duplos
    expect(label).not.toMatch(/,\s*,/); // sem vírgulas consecutivas
    expect(label).not.toMatch(/,\s*$/); // não termina em vírgula
    expect(label.trim()).toBe(label); // sem espaço inicial/final
  });

  // ── 11) Cobertura simétrica: variações com score visível na UI também respeitam ──
  // O badge visual de score mostra "—" quando ausente; o aria-label deve omitir totalmente
  // (não há "score —" no rótulo)
  expect(label1).not.toMatch(/score\s+—/);
  expect(label2).not.toMatch(/score\s+—/);

  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa tudo já presente)
- 1 teste novo (113 → 114 testes)
- Fixture local com 4 variações cobre matriz `{score: ausente | 0 | 85} × {winner: false | true}` nos 4 casos críticos
- Sem `user.click()`/`user.keyboard()` — teste declarativo de strings de `aria-label`

## Entregável

- 1 teste cobrindo:
  1. **Score ausente NÃO vira `"score 0"`**: regex `/score\s+0\b/i` não casa quando `qualityScore` é `undefined`
  2. **Score ausente NÃO vira `"score undefined"`/`"score null"`/`"score NaN"`**: blindagem contra serialização ruim
  3. **Score `0` legítimo É anunciado**: distingue "ausência" de "valor zero"
  4. **Score `85` é anunciado normalmente**: caso de controle positivo
  5. **Winner sem score mantém `"melhor score"`**: ausência de score não arrasta sufixo de winner
  6. **Não-winner sem score**: rótulo é exatamente `"Selecionar variação N"` (string completa)
  7. **Winner sem score**: rótulo é exatamente `"Selecionar variação N, melhor score"`
  8. **Não-winner com score 0**: rótulo é exatamente `"Selecionar variação N, score 0"`
  9. **Não-winner com score 85**: rótulo é exatamente `"Selecionar variação N, score 85"`
  10. **Higiene de string**: sem espaços duplos, vírgulas consecutivas, vírgula final ou whitespace de bordas
  11. **Sem `"score —"` no rótulo**: o placeholder visual `"—"` não vaza para acessibilidade
- Captura regressões onde:
  - `score !== null` vire `score` (truthy) — score `0` desapareceria
  - `score !== null` vire `score != null` + `resolveScore` mude para retornar `undefined`
  - Inversão acidental de condição que injete `"score 0"` quando ausente
  - Sufixo de winner condicione-se a `score && isWinner` (perderia anúncio de winner sem score)
  - Template literal ganhe espaço extra entre sufixos
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 114/114 verde

