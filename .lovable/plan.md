
## Plano: 3 modos de visualização no módulo Favoritos

Replicar o padrão já consolidado de `CollectionDetailPage` (referência canônica) na página `/favoritos`, adicionando o botão **Layout** com Grid/Lista/Tabela + seletor de colunas (3-8) — idêntico ao módulo Produtos da screenshot.

### O que muda

**Arquivo único modificado:** `src/pages/FavoritesPage.tsx`

1. **Toolbar nova** (à direita do "Compartilhar" / "Limpar Tudo"):
   - `<LayoutPopover viewMode setViewMode gridColumns setGridColumns />` — exatamente como em Produtos.

2. **Estado local persistido em `localStorage`**:
   - `viewMode: "grid" | "list" | "table"` (chave `favorites-view-mode`, default `"grid"`)
   - `gridColumns: ColumnCount` (chave `favorites-grid-cols`, default via `getDefaultColumns()`)

3. **Renderização condicional** (substitui o grid fixo `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`):
   - **Grid**: usa `getGridColsClass(gridColumns)` + `getGridGapClass(gridColumns)` (helpers já exportados em `VirtualizedReplenishmentGrid.tsx`) com `ProductCard` + overlay heart/cor preservado.
   - **Lista**: `<ProductListItem>` por item (mesmo componente usado em CollectionDetail), com `onToggleFavorite` mapeado para `handleRemoveFavorite`.
   - **Tabela**: `<ProductTableView products={filteredProducts} ... />` — mesma assinatura de CollectionDetail.

4. **Preservação do contexto de variante**: o `productsWithVariant` (com thumbnail da cor salva) continua sendo a fonte para os 3 modos. Badge de cor salva permanece no Grid (overlay); na Lista/Tabela aparece via `ProductListItem` que já consome a thumbnail injetada.

### Padrões respeitados (memórias)
- `mem://architecture/selection-state-controlled-view-pattern`: estado de view controlado, persistência local.
- `mem://ui/catalog/visual-styling-and-layout-controls`: pill animada já vem de `LayoutPopover`.
- `mem://constraints/ui-redesign-protocol`: zero redesign — apenas adiciona controle existente do design system.
- `mem://architecture/component-refactoring-and-modularity`: reusa `LayoutPopover`, `ColumnSelector`, `ProductTableView`, `ProductListItem`, `getGridColsClass/getGridGapClass`. Nenhum componente novo.

### Fora de escopo (intencional)
- Virtualização: lista de favoritos raramente passa de 100 itens (`mem://architecture/performance-virtualization-standards` só exige >100). Se crescer, replicamos `VirtualizedReplenishmentGrid` numa segunda passada.
- Modo de seleção em massa: não estava na screenshot do módulo Produtos referenciada.

### Arquivos
- **Modificado**: `src/pages/FavoritesPage.tsx` (única alteração).
