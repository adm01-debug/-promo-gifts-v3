## Situação atual

O `ColumnSelector` já lê do `localStorage` no init (`getDefaultColumns()`) e já salva ao **clicar** em uma opção. Mas em `useCatalogState`:

- `const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns)` usa o setter cru do `useState` — então qualquer `setGridColumns(...)` chamado de fora do `ColumnSelector` (ex.: de outro consumidor, ou se algum dia trocarmos a UI) **não persiste**.
- O `useEffect` de clamp responsivo (mobile <640px → 1 col, <768px → 2 col) chama `setGridColumns` automaticamente — esse ajuste forçado **não deve** sobrescrever a preferência salva, senão ao voltar para desktop o usuário perde a escolha.

## Proposta

Em `src/hooks/useCatalogState.ts`:

1. Importar `STORAGE_KEY` do `ColumnSelector` (já é exportado como `STORAGE_KEY`):
   ```ts
   import { getDefaultColumns, STORAGE_KEY as GRID_COLUMNS_KEY, type ColumnCount } from "@/components/products/ColumnSelector";
   ```

2. Renomear o setter cru e criar um wrapper persistente:
   ```ts
   const [gridColumns, setGridColumnsState] = useState<ColumnCount>(getDefaultColumns);
   const setGridColumns = useCallback((cols: ColumnCount) => {
     setGridColumnsState(cols);
     try { localStorage.setItem(GRID_COLUMNS_KEY, String(cols)); } catch {}
   }, []);
   ```

3. No clamp responsivo (linhas 78-90), trocar `setGridColumns` pelo setter cru `setGridColumnsState` — assim o ajuste de tela pequena é apenas visual e **não escreve no storage**, preservando a preferência original do usuário.

## Resultado

- Toda escolha explícita do usuário (via `ColumnSelector` ou qualquer outro consumidor que use o setter exposto pelo hook) é persistida.
- Reload mantém a preferência.
- Em mobile, o grid ainda é apertado para 1/2 colunas, mas ao voltar para desktop a escolha original (ex.: 8 colunas) volta automaticamente.

## Arquivo afetado

- `src/hooks/useCatalogState.ts` (3 trechos: import, criação do setter, clamp responsivo)
