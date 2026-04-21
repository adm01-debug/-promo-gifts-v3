

# Plano — Teste de empate de scores no MagicUpVariationComparator

Adiciono 1 caso novo cobrindo empate, sem alterar produção.

## Arquivo único alterado

`tests/components/magic-up-onda5.test.tsx` — 1 novo `it()` no bloco do comparador.

## Comportamento auditado

A lógica atual em `MagicUpVariationComparator.tsx`:
```ts
const winnerIndex = variations.findIndex(
  (variation, index) => variation.isWinner || scores[index] === bestScore
);
```
Em empate (ex.: índices 1 e 2 com score 90), `findIndex` retorna o **primeiro índice** com `score === bestScore`, garantindo determinismo. Se algum item tiver `isWinner === true`, ele tem prioridade absoluta sobre o critério de score.

## Caso coberto

**Empate de scores (3 variações, scores [70, 90, 90])**
Asserts:
- Badge global "Melhor score: 90" exposta no header
- Apenas **1** badge "Melhor score" renderizada (não duas)
- A badge "Melhor score" pertence ao card de **índice 1** (primeiro empatado), não ao índice 2
- aria-label do card índice 1 inclui "melhor score"
- aria-label do card índice 2 NÃO inclui "melhor score" mesmo tendo score 90
- Determinismo: re-render com as mesmas props mantém winner no índice 1

**Bônus no mesmo `it()`** — empate com `isWinner` explícito:
- Mesmas variações, mas índice 2 recebe `isWinner: true`
- Asserts: agora a badge "Melhor score" pertence ao índice 2 (prioridade do flag), não ao 1

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` nem outros componentes
- Reutiliza helper `diagnosis()` existente
- Sem novos mocks, sem dependência de browser

## Entregável

- 1 novo teste verde (com 2 cenários internos: empate puro + empate com `isWinner`)
- Total do arquivo: 12 → 13 testes
- Confirmação de que `winnerIndex` é determinístico e respeita prioridade de `isWinner`

