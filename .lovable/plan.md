

## Plano: Bulk "Enviar para Orçamento" no módulo Favoritos

Replicar o padrão consolidado do módulo Produtos (`useCatalogSelection` + `BulkVariantWizard` + URL params) dentro de `/favoritos`, aproveitando 100% da infraestrutura existente — zero componente novo.

### Fluxo do vendedor

1. Clica em **Selecionar** (já existe) → entra em selection mode
2. Marca N favoritos (checkbox no card)
3. Nova **BulkActionBar** flutuante aparece embaixo (mesma do catálogo) com ações: Orçamento / Carrinho / Coleção / Comparar / Favoritar
4. Clica em **Orçamento** → abre `BulkVariantWizard` (mode `quote`) para garantir cor/tamanho de cada item (política `mem://architecture/variant-selection-enforcement-policy`)
5. Wizard completa → navega para `/orcamentos/novo?items[]=...` com payload padronizado (`mem://features/quote-system-url-params-standard`)

### O que muda

**Único arquivo modificado:** `src/pages/FavoritesPage.tsx`

1. **Remover** a lógica manual atual de `selectedIds` + barra inline de "Remover selecionados" e substituir por composição com componentes existentes.

2. **Adicionar**:
   - Import e uso do hook `useCatalogSelection(filteredProducts, selectionMode, setSelectedCount)` — já encapsula toda a lógica de bulk (favoritar, comparar, coleção, carrinho, orçamento).
   - `<BulkActionBar>` flutuante quando `selectionMode && selectedCount > 0`, ligando os handlers do hook.
   - `<BulkVariantWizard>`, `<BulkAddToCartModal>`, `<AddToCollectionModal>` — exatamente como em `CatalogBulkModals.tsx` (podemos inclusive reutilizar o próprio `<CatalogBulkModals>`).
   - Manter o botão **Remover selecionados** como ação extra específica de Favoritos (não existe em Produtos), via um botão local na BulkActionBar OU atalho `Delete`.

3. **Card overlay**: manter checkbox + ring de seleção já implementados.

### Pré-condição respeitada

- `mem://architecture/selection-state-controlled-view-pattern` — estado controlado, persistência entre Grid/Lista/Tabela. O hook `useCatalogSelection` já cobre isso e funciona para os 3 view modes (Lista e Tabela só precisam expor `onToggleSelect` e `isSelected`, que `ProductListItem`/`ProductTableView` já aceitam — confirmar no código).
- `mem://features/quote-system-url-params-standard` — payload `items[]` com `product_id`, `quantity`, `color_name`, `color_hex`, `size_code`, etc. (já implementado dentro de `useCatalogSelection.handleWizardComplete`).
- `mem://architecture/variant-selection-enforcement-policy` — wizard obrigatório antes de enviar para orçamento.
- `mem://constraints/ui-redesign-protocol` — zero redesign, só composição de componentes existentes.

### Decisão sobre "Remover selecionados"

A `BulkActionBar` atual não expõe um slot para ação destrutiva customizada. Duas opções:

- **A)** Manter um botão "Remover (N)" inline acima da grid, ao lado do contador, e deixar a BulkActionBar flutuante apenas para as ações compartilhadas com Produtos (Orçamento/Carrinho/etc.)
- **B)** Estender `BulkActionBar` com prop opcional `onBulkDelete` (afeta também o catálogo — fora de escopo)

**Recomendado: A** — isolado em Favoritos, não toca código compartilhado.

### Arquivos

- **Modificado**: `src/pages/FavoritesPage.tsx`

### Fora de escopo

- Alterar `BulkActionBar`, `useCatalogSelection`, `CatalogBulkModals` (são SSOT do catálogo).
- Implementar bulk em Lista/Tabela: já vem grátis ao reutilizar a infra; apenas validamos que `ProductListItem` e `ProductTableView` recebem `selectionMode/selectedIds/onToggleSelect` (a confirmar na implementação — se não receberem, adicionar nos 3 view modes seguindo o padrão Produtos).

