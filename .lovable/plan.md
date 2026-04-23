

## Corrigir bug `Cannot read properties of undefined (reading 'length')` no comparador

### Causa raiz

`src/components/compare/ComparisonMobileView.tsx` está usando a API errada do hook `useComparisonScore`:

```ts
// ❌ ERRADO (linha 29)
const { items: scoreItems } = useComparisonScore(products);
// useComparisonScore retorna ProductScore[] direto, não { items: [...] }
// → scoreItems = undefined → scoreItems.length lança TypeError

// ❌ ERRADO (linha 31)
cur.score > arr[best].score
// O tipo ProductScore tem `total`, não `score`
```

O componente é renderizado em todos os viewports (escondido via `md:hidden`), então o erro dispara também em desktop e quebra a página inteira via ErrorBoundary.

### O que será alterado

**`src/components/compare/ComparisonMobileView.tsx`** (3 linhas):

```ts
// linha 29
const scoreItems = useComparisonScore(products);

// linha 30-32
const winnerIdx = scoreItems.length > 0
  ? scoreItems.reduce((best, cur, idx, arr) => cur.total > arr[best].total ? idx : best, 0)
  : -1;
```

### Por que apareceu agora

Provavelmente o hook `useComparisonScore` foi refatorado em algum momento para retornar `ProductScore[]` direto (em vez de `{ items, weights }`), mas o `ComparisonMobileView` não foi atualizado. O `ComparisonDuelView` já usa a API correta (`const scoreItems = useComparisonScore(products)` + `cur.total`), o que confirma o contrato atual.

### Resultado

Página `/comparar` volta a renderizar com 2+ produtos selecionados, sem ErrorBoundary. Modo Duelo, mobile carousel, score card — tudo funcional.

