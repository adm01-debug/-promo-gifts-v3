

# Plano — Tratamento explícito de score 0 vs ausente no `MagicUpVariationComparator`

Substituo o uso de `||` (falsy JS) pela checagem explícita `?? `/`undefined`, separando semanticamente "score ausente" (sem dado) de "score zero" (avaliado como ruim). Hoje ambos colapsam em `0`, criando ambiguidade que já causou refactors sucessivos nos testes.

## Problema atual

```ts
const scores = variations.map((v) => v.qualityDiagnosis?.total || v.qualityScore || 0);
const bestScore = Math.max(...scores);
const hasValidScores = bestScore > 0;
```

Ambiguidades:
1. `qualityDiagnosis.total === 0` cai no fallback `qualityScore` — ignora um diagnóstico legítimo de score zero
2. `qualityScore === 0` colapsa para `0` indistinguível de `undefined`
3. `bestScore > 0` exclui um cenário legítimo onde todas as variações foram avaliadas e receberam 0
4. `aria-label` usa `score ?` (falsy) — esconde "score 0" mesmo quando é uma avaliação real

## Nova lógica

### `src/components/magic-up/MagicUpVariationComparator.tsx`

```ts
// Score numérico ou null (ausente). Nunca colapsa 0 em undefined.
const resolveScore = (v: VariationItem): number | null => {
  if (typeof v.qualityDiagnosis?.total === "number") return v.qualityDiagnosis.total;
  if (typeof v.qualityScore === "number") return v.qualityScore;
  return null;
};

const scores = variations.map(resolveScore);
const numericScores = scores.filter((s): s is number => s !== null);
const hasAnyScore = numericScores.length > 0;
const bestScore = hasAnyScore ? Math.max(...numericScores) : null;

const explicitWinnerIndex = variations.findIndex((v) => v.isWinner);
const winnerIndex = explicitWinnerIndex >= 0
  ? explicitWinnerIndex
  : (bestScore !== null ? scores.findIndex((s) => s === bestScore) : -1);
```

**Renderização:**
- Header badge: `Melhor score: {bestScore ?? "—"}` (mostra `0` quando todos avaliados em zero, `—` quando ausentes)
- Card score: `{scores[index] ?? "—"}` (idem por card)
- Winner badge: `{isWinner && <Badge>...}` (sem mudança — `winnerIndex=-1` já garante)
- `aria-label` do botão:
  ```ts
  const scoreLabel = scores[index] !== null ? `, score ${scores[index]}` : "";
  const winnerLabel = isWinner ? ", melhor score" : "";
  ```
  Agora `score 0` aparece quando há avaliação real de zero (semântica correta para screen readers — é um dado, não ausência).

**Comportamento resultante (matriz):**

| Cenário | bestScore | winnerIndex | Badge no card |
|---|---|---|---|
| Todos `null` (sem dados) | `null` | `-1` | nenhuma |
| Todos `0` (avaliados ruins) | `0` | `0` (primeiro) | índice 0 |
| `isWinner=true` em qualquer índice | — | índice do `isWinner` | índice marcado |
| Empate em score real | maior | primeiro com maior | primeiro empatado |
| Mix `null` + numéricos | maior numérico | primeiro com maior | primeiro com maior |

### `tests/components/magic-up-onda5.test.tsx`

Ajustes na sub-suíte de empate para refletir nova semântica:

1. **Manter** `isWinner` testes (3 casos) — passam sem alteração (lógica de prioridade preservada)
2. **Manter** "todos undefined → nenhuma badge" — passa (continua `winnerIndex=-1`)
3. **Atualizar** teste `aria-label score=0` — agora `qualityScore: 0` é tratado como avaliação real:
   - Vencedor `qualityScore: 0` → aria-label **contém** `, score 0` E `, melhor score`
   - Inverter assertion `not.toMatch(/score 0\b/)` para `toContain("score 0")`
4. **Adicionar** novo teste: "todos `qualityScore: 0` (avaliados ruins) → badge aparece no índice 0":
   - 3 variações com `qualityScore: 0` explícito
   - `bestScore=0`, `winnerIndex=0`, 1 badge "Melhor score" no índice 0
   - Header mostra `Melhor score: 0` (não `—`)
5. **Adicionar** teste: "mix de `null` e numéricos → vencedor é o numérico maior":
   - `[null, 60, null, 40]` → winnerIndex=1, badge no índice 1
   - Cards 0 e 2 mostram score `—`, cards 1 e 3 mostram `60`/`40`
6. **Adicionar** teste: "`qualityDiagnosis.total === 0` é respeitado (não cai em qualityScore=80)":
   - Variação com `qualityDiagnosis.total: 0` E `qualityScore: 80` → resolveScore retorna `0` (diagnóstico tem prioridade absoluta)
   - Outra variação com `qualityScore: 50` → vence (50 > 0)

### Verificar testes pré-existentes que possam quebrar

Buscar fixtures com `qualityScore: 0` ou `qualityDiagnosis.total: 0` no arquivo de testes — ajustar assertions de score exibido que esperem `—` em casos onde agora aparecerá `0`.

## Restrições

- Mudança comportamental **intencional** — corrige ambiguidade falsy
- `qualityDiagnosis.total` ganha prioridade absoluta (era ofuscado quando 0)
- `aria-label` passa a incluir `score 0` quando há avaliação real (melhor a11y — anuncia o dado)
- `isWinner` mantém prioridade absoluta (sem regressão)
- Reusa helpers de teste existentes; sem novos imports
- Tipo de retorno `null` (não `undefined`) — distinção explícita "ausente" vs "zero"

## Entregável

- 1 modificação em `MagicUpVariationComparator.tsx` (helper `resolveScore`, tipo `number | null`, renderização com `??`)
- 3 novos testes (todos zero, mix null/numérico, diagnóstico zero sobrepõe qualityScore)
- 1 teste invertido (aria-label score=0 agora **inclui** "score 0")
- Possíveis ajustes em testes pré-existentes que assumiam comportamento falsy
- Cobertura: 61 → 64 testes
- Trava semântica: `null` = sem dado, `0` = avaliação real ruim

