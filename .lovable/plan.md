

# Plano — Snapshot tests do MagicUpVariationComparator

Adiciono snapshots de DOM cobrindo os principais estados visuais do comparador, para travar regressões de layout, badges e classes.

## Arquivo único alterado

`tests/components/magic-up-onda5.test.tsx` — novo bloco `describe("MagicUpVariationComparator snapshots")` ao final.

## Snapshots cobertos (4 cenários)

1. **Estado base — 3 variações com scores distintos**
   - Asserção: `expect(container.firstChild).toMatchSnapshot()`
   - Trava: estrutura do header (badge "Melhor score: X"), grid `grid-cols-2 sm:grid-cols-3`, ordem dos cards, badge "Melhor score" no vencedor, botão "Marcar vencedora" em cada card.

2. **Variação ativa (activeIndex=1)**
   - Trava: classes `border-primary ring-2 ring-primary/20` no card ativo, `aria-pressed="true"` e `aria-current="true"`.

3. **Empate de scores [70, 90, 90]**
   - Trava: apenas 1 badge "Melhor score" (no índice 1, primeiro empatado), determinismo do `findIndex`, badge global "Melhor score: 90".

4. **Scores ausentes (todos sem `qualityScore` nem `qualityDiagnosis`)**
   - Trava: placeholders "—" no header e em cada card, badge "Melhor score" caindo no índice 0.

## Estratégia anti-flaky

- Usar `imageUrl` determinístico (`https://example.com/{a,b,c}.png`) — sem timestamps ou IDs gerados
- Sem `Date.now()`, sem `Math.random()`, sem props derivadas de hooks externos
- Snapshots inline via `toMatchInlineSnapshot()` para revisão visual no próprio arquivo de teste (mais fácil de auditar em PRs do que `.snap` separados)
- Helper local `baseVariation(overrides)` para reduzir ruído nas props

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` nem outros componentes de produção
- Sem novos mocks, sem dependência de browser
- Reutiliza imports já existentes no arquivo de teste

## Entregável

- 4 novos snapshots verdes (inline)
- Total do arquivo: 13 → 17 testes
- Snapshots inline servem como documentação visual do contrato de UI do comparador
- Qualquer mudança futura em estrutura/classes/badges falha o teste e exige atualização explícita via `vitest -u`

