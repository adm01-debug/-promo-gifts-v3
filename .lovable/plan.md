

## Corrigir crash do `ComparisonDuelView` (`Cannot read properties of undefined (reading 'length')`)

### Causa raiz

Em `src/components/compare/ComparisonDuelView.tsx:34` o hook é consumido como objeto:

```ts
const { items: scoreItems } = useComparisonScore(products);
```

Mas `useComparisonScore` retorna **um array `ProductScore[]` diretamente** (não um objeto `{ items }`). Resultado: `scoreItems === undefined`, e o `useMemo` seguinte explode em `scoreItems.length`.

A página `/comparar` quebra inteira sempre que há 2 produtos selecionados e o modo duelo está ativo.

### Correção

**Arquivo: `src/components/compare/ComparisonDuelView.tsx`**

Trocar a linha 34 de:
```ts
const { items: scoreItems } = useComparisonScore(products);
```
para:
```ts
const scoreItems = useComparisonScore(products);
```

Nenhuma outra parte do componente precisa mudar — o `useMemo` abaixo já usa `scoreItems.length`, `scoreItems.reduce(...)` e `arr[best].score`. Confirmar que o campo correto no `ProductScore` é `total` (não `score`) e ajustar o reduce:

```ts
const winnerIdx = useMemo(() => {
  if (scoreItems.length === 0) return -1;
  return scoreItems.reduce((best, cur, idx, arr) => cur.total > arr[best].total ? idx : best, 0);
}, [scoreItems]);
```

(O hook expõe `total: number`, não `score`.)

### Por que aconteceu

Provavelmente refator antigo do hook mudou a assinatura de `{ items, ... }` para `ProductScore[]` puro e este consumidor ficou para trás — não há outro lugar no projeto fazendo essa desestruturação errada (busca confirmou).

### Arquivos modificados

- `src/components/compare/ComparisonDuelView.tsx` — 2 linhas (destrutura + campo `total`).

Sem alteração de hook, schema, RLS, edge function ou testes.

