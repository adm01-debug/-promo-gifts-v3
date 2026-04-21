

# Plano — Testes de edge cases do MagicUpVariationComparator

Adiciono casos cobrindo cenários não testados hoje, sem alterar produção.

## Arquivo único alterado

`tests/components/magic-up-onda5.test.tsx` — 4 novos `it()` no bloco existente.

## Casos cobertos

1. **Todos os scores ausentes** — variações sem `qualityScore` nem `qualityDiagnosis`. Asserts: badge "Melhor score" exibe "—", cada card mostra "—" no score, e o primeiro item ainda recebe a badge "Melhor score" (winnerIndex cai no índice 0 por `findIndex` quando todos empatam em 0). Garante que a UI não quebra com `Math.max(0, 0, 0) = 0`.

2. **Scores parciais (mistura de presente/ausente)** — uma variação com score 80, duas sem score. Asserts: winner é a de score 80 com badge "Melhor score", outras mostram "—" sem badge. Previne regressão onde `score || "—"` poderia confundir `0` com ausente.

3. **Lista longa (8 variações)** — render com 8 itens, todos com scores diferentes. Asserts: 8 `listitem`, 8 botões "Marcar … como vencedora" únicos, exatamente 1 badge "Melhor score" no topo (pelo maior score), aria-label do card vencedor inclui "melhor score".

4. **Seleção após marcação de vencedora** — `isWinner` da variação 2 vem `true` via prop. Asserts: aria-pressed reflete `activeIndex` (não `isWinner`); clicar em card diferente do vencedor chama `onSelect` com o índice clicado; clicar "Marcar vencedora" em outro card chama `onSelectWinner` sem disparar `onSelect` (evento isolado no botão interno).

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` nem outros componentes.
- Sem novos mocks; reutiliza `diagnosis()` helper já existente.
- Sem dependência de browser; tudo via `@testing-library/react` + `vitest`.

## Entregável

- 4 novos testes verdes
- Total do arquivo: 7 → 11 testes
- Relatório com nome de cada caso e o que ele protege

