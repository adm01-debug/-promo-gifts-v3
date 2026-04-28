## Problema

O `ColumnSelector` esconde opções (4/5/6/8 colunas) baseado em `window.innerWidth`, então monitores menores nunca veem todas. Você quer todas sempre visíveis.

## Proposta

Em `src/components/products/ColumnSelector.tsx`:

1. Zerar todos os `minWidth` no array `columnOptions` (3, 4, 5, 6, 8 → todos `minWidth: 0`).
2. Remover o filtro `getAvailableOptions()` e o listener de `resize` (não são mais necessários).
3. Remover o `useEffect` que força `onChange` quando o valor excede o máximo disponível (também desnecessário).
4. Remover o early-return `if (available.length <= 1) return null;` — sempre haverá 5 opções.

Resultado: as 5 opções (3, 4, 5, 6, 8 colunas) aparecem em qualquer viewport. O grid CSS responsivo continua funcionando normalmente — em telas estreitas, escolher 8 colunas simplesmente apertará os cards.

## Arquivo afetado

- `src/components/products/ColumnSelector.tsx`
