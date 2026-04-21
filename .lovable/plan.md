

# Plano — Teste de empate total no `MagicUpVariationComparator`

Adiciono teste no arquivo de testes do `MagicUpVariationComparator` validando o comportamento determinístico quando todas as variações têm score idêntico: apenas **uma** badge "Melhor score" deve aparecer, e o `winnerIndex` deve cair no **primeiro índice** (índice 0).

## Justificativa

A lógica atual em `MagicUpVariationComparator.tsx`:

```ts
const winnerIndex = variations.findIndex(
  (variation, index) => variation.isWinner || scores[index] === bestScore
);
```

`Array.prototype.findIndex` retorna o **primeiro** índice que satisfaz a condição. Em empate total (todos os scores iguais a `bestScore`), o índice 0 vence. Esse comportamento é determinístico mas **não está coberto por teste** — qualquer refactor que troque `findIndex` por `lastIndexOf`, `Math.max` com tiebreaker diferente, ou ordenação prévia quebraria silenciosamente o contrato.

Riscos cobertos pelo novo teste:
- **Múltiplas badges "Melhor score"** renderizadas (regressão visual: usuário veria 3 vencedores)
- **Winner index não-determinístico** (ex: aleatório, ou último em vez de primeiro)
- **Empate específico em score 0** (caso degenerado: todas sem `qualityDiagnosis` nem `qualityScore`)

## Arquivo alterado

Apenas testes — preciso primeiro localizar o arquivo de teste do `MagicUpVariationComparator` (provavelmente `tests/components/magic-up-variation-comparator.test.tsx` ou similar). Caso não exista, crio novo arquivo dedicado seguindo padrão dos demais testes do módulo Magic Up.

**Plano executa:**
1. `code--search_files` para localizar arquivo de teste existente do comparator (ou confirmar ausência)
2. Se existir: adiciona nova sub-suíte ao final
3. Se não existir: cria `tests/components/magic-up-variation-comparator.test.tsx` com setup mínimo + a sub-suíte

## Sub-suíte nova: `MagicUpVariationComparator — empate total de scores (determinismo)`

### Helper local

```ts
function buildVariation(overrides: Partial<VariationItem> = {}): VariationItem {
  return {
    id: `var-${Math.random()}`,
    imageUrl: "https://example.com/img.png",
    qualityScore: 75,
    isWinner: false,
    ...overrides,
  };
}
```

### ~5 testes

**Teste 1 — Empate total com 3 variações (mesmo `qualityScore=75`): apenas 1 badge "Melhor score"**
- Renderiza 3 variações todas com `qualityScore: 75`, `isWinner: false`
- `screen.getAllByLabelText("Melhor score")` → `expect(badges).toHaveLength(1)`
- Trava: regressão que renderizaria badge em todos os empatados

**Teste 2 — Empate total: badge aparece no card do índice 0 (determinístico)**
- Mesma setup
- Pega todos os cards (`role="listitem"`)
- Confirma que a badge "Melhor score" está dentro do card[0], não dos demais
- Usa `within(cards[0]).queryByLabelText("Melhor score")` → existe
- `within(cards[1]).queryByLabelText("Melhor score")` → null
- `within(cards[2]).queryByLabelText("Melhor score")` → null

**Teste 3 — Empate total com `qualityDiagnosis.total` (caminho alternativo de score)**
- 3 variações com `qualityDiagnosis: { total: 90 }` idênticos, sem `qualityScore`
- Confirma que ainda é apenas 1 badge no índice 0 (mesmo determinismo via campo diferente)
- Trava: mudança que dê precedência diferente entre `qualityDiagnosis.total` vs `qualityScore` em empate

**Teste 4 — Empate total em score 0 (caso degenerado: nenhum score informado)**
- 3 variações sem `qualityDiagnosis` e sem `qualityScore` → `scores = [0, 0, 0]`, `bestScore = 0`
- Componente atualmente exibe "—" no badge "Melhor score: —" mas ainda calcula `winnerIndex`
- Verifica que badge "Melhor score" no card aparece **0 vezes** OU exatamente 1 vez no índice 0 — comportamento atual: como `bestScore = 0` é falsy, mas `scores[index] === bestScore` continua `true` (0 === 0), `findIndex` retorna 0 e badge aparece no card 0
- Documenta o contrato real: badge no índice 0 mesmo com todos zerados
- Se for considerado bug, teste vira `it.todo` com comentário explicando — mas como o plano é travar comportamento atual, fica como `it` ativo

**Teste 5 — Empate parcial (não-empate total) NÃO é regredido pelo novo código**
- Garde-fou: 3 variações com scores `[60, 90, 90]` → winnerIndex deve ser 1 (primeiro com 90), apenas 1 badge no card[1]
- Confirma que a lógica `findIndex` continua respeitando "primeiro com bestScore" mesmo fora de empate total
- Trava: alguém "consertar" empate total criando bug em empate parcial

### Estratégia técnica

- **Reusa setup existente** se houver arquivo de teste do comparator; caso contrário cria setup mínimo (sem mocks de hooks pesados — o componente é puro: recebe `variations`, `activeIndex`, callbacks)
- **Sem `userEvent`**: testes são puramente sobre renderização condicional de badges
- **Selector primário**: `getAllByLabelText("Melhor score")` (badge tem `aria-label="Melhor score"` no código atual) + `within()` para escopo por card
- **Callbacks**: passa `vi.fn()` para `onSelect` e `onSelectWinner`, não invocados nesta sub-suíte

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` — comportamento atual é o contrato
- Sem alterar outros testes do módulo Magic Up (mantém os 86 do `magic-up-result-panel-keyboard.test.tsx` intactos)
- Sem novos mocks ou fixtures globais
- Cobertura: determinismo de `findIndex`, contrato de "única badge vencedora"

## Entregável

- Nova sub-suíte com 5 testes em `tests/components/magic-up-variation-comparator.test.tsx` (criado ou estendido)
- 1 helper local `buildVariation`
- Trava contrato: empate total → exatamente 1 badge "Melhor score" no índice 0
- Trava contrato: empate parcial → primeiro empatado vence (regressão guard)
- Cobertura de 3 caminhos de score: `qualityScore`, `qualityDiagnosis.total`, score 0 (degenerado)

