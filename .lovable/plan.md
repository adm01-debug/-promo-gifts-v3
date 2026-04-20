

# Fechamento final — Coleções 10/10 (Onda Q3 + Q4)

Continuação direta do trabalho da rodada anterior. Q1 e Q2 estão entregues; faltam **6 wirings finais** para módulo ficar 100% funcional end-to-end.

## Pendências confirmadas

| # | Item | Arquivo |
|---|---|---|
| 1 | Chip toggle "Só com queda" + botão "Gerenciar" no toolbar | `CollectionDetailPage.tsx` |
| 2 | Render do modo `manage` com `<DndContext>` + `SortableProductItem` | `CollectionDetailPage.tsx` |
| 3 | Substituir `<PresentationMode>` direto pelo `<CollectionPresentationLauncher>` | `CollectionDetailPage.tsx` |
| 4 | Montar `<ShareCollectionDialog>` no JSX final | `CollectionDetailPage.tsx` |
| 5 | Criar `CollectionsTrashView.tsx` (espelho do FavoritesTrashView) + aba "Lixeira" | `src/components/collections/` + `CollectionDetailPage.tsx` |
| 6 | Atualizar memórias finais (`mem://index.md`, `keyboard-shortcuts-registry`) | `mem://` |

## Plano sequencial autônomo

### Etapa 1 — Toolbar com chip "Só com queda" + botão "Gerenciar"
Adicionar no toolbar de busca/sort:
- Toggle pill "Só com queda" (ativo quando `onlyDrops=true`) com ícone `TrendingDown` e contador.
- Botão "Gerenciar" (ícone `Settings2`) que alterna `manageMode`.

### Etapa 2 — Modo manage com DnD
Quando `manageMode=true`, renderizar lista vertical com:
```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={filteredProducts.map(p=>p.id)} strategy={verticalListSortingStrategy}>
    {filteredProducts.map(p => (
      <SortableProductItem
        product={p}
        variant={variantMap.get(p.id)}
        priceAtSave={priceAtSaveMap.get(p.id)}
        addedAt={addedAtMap.get(p.id)}
        notes={notesMap.get(p.id)}
        onNotesChange={(notes) => updateProductNote(collection.id, p.id, notes)}
        isSelected={selectedIds.has(p.id)}
        onToggleSelect={() => toggleSelect(p.id)}
        onRemove={() => handleRemoveFromCollection(p.id)}
      />
    ))}
  </SortableContext>
</DndContext>
```

### Etapa 3 — CollectionPresentationLauncher
Substituir bloco `{showPresentation && <PresentationMode .../>}` por:
```tsx
<CollectionPresentationLauncher
  open={showPresentation}
  onClose={() => setShowPresentation(false)}
  products={products}
  collectionName={collection.name}
/>
```

### Etapa 4 — ShareCollectionDialog no JSX
Adicionar antes do fechamento da página:
```tsx
{localCollection && (
  <ShareCollectionDialog
    open={showShareDialog}
    onClose={() => setShowShareDialog(false)}
    collectionId={localCollection.id}
    collectionName={localCollection.name}
    shareToken={localCollection.shareToken}
    shareExpiresAt={localCollection.shareExpiresAt}
    isPublic={localCollection.isPublic}
  />
)}
```

### Etapa 5 — CollectionsTrashView + aba Lixeira
Criar `src/components/collections/CollectionsTrashView.tsx` (espelho de `FavoritesTrashView`):
- Lista itens da `collection_items_trash` filtrados por `collection_id`.
- Cada item mostra produto + countdown TTL + botão "Restaurar" (chama `restoreFromTrash`).
- Botão "Esvaziar lixeira" no header.

Adicionar Tabs no `CollectionDetailPage`:
- Tab "Produtos" (atual)
- Tab "Lixeira" (badge com contador)

### Etapa 6 — Memórias finais
- Atualizar `mem://features/keyboard-shortcuts-registry.md` com `G C` + `Shift+C` documentados.
- Atualizar `mem://index.md` substituindo entrada antiga de Collections para refletir 10/10 absoluto + paridade total com Favoritos.

## Sequenciamento

```text
1 (toolbar) → 2 (DnD render) → 3 (launcher) → 4 (share dialog) → 5 (trash view) → 6 (memória)
```

Sem pausas. Sem perguntas. Cada etapa entrega completa antes da próxima.

## Arquivos afetados

**Modificados:**
- `src/pages/CollectionDetailPage.tsx` (etapas 1-5)

**Criados:**
- `src/components/collections/CollectionsTrashView.tsx` (etapa 5)

**Memórias:**
- `mem://features/keyboard-shortcuts-registry.md` (etapa 6)
- `mem://index.md` (etapa 6)

## Resultado final
Módulo Coleções com **paridade absoluta 10/10 com Favoritos** — todos os 11 componentes da Onda P efetivamente acessíveis, visíveis e funcionando end-to-end na UI: CRM picker, Share público, PriceDropBadge, filtro queda, modo gerenciar com DnD, Apresentação fullscreen, Lixeira com restore manual, Export PDF/CSV/JSON, ARIA-live e atalhos globais.

