

# Auditoria de paridade — Favoritos × Coleções

Estado real do código (não confiar só nas memórias). Verifiquei `App.tsx`, `CollectionsPage`, `CollectionDetailPage`, `CollectionDetailHeader`, `CollectionFormDialog`, `SortableProductItem`, `FavoritesViewHeader` e a estrutura de pastas.

## Placar geral

**Backend/infra: 10/10 ✅** — todas as tabelas (`collection_items_trash`, `collection_item_reactions`, `price_at_save`, `share_token`/`is_public`, `client_id`/`client_name`), RLS, edge functions (`collections-watcher`, `collections-public-react`), RPCs e crons existem.

**Frontend/UI: ~6/10 ⚠️** — vários componentes foram criados mas **não estão plugados na UI**, e vários elementos visuais que existem em Favoritos não foram replicados.

## Detalhamento por bloco

### ✅ Já entregue end-to-end (paridade real)
| Item | Favoritos | Coleções |
|---|---|---|
| Lixeira TTL 30d (DB) | ✅ | ✅ |
| Snapshot `price_at_save` (DB) | ✅ | ✅ |
| Watcher cron de queda de preço | ✅ | ✅ |
| Rota pública `/...-publica/:token` registrada | ✅ | ✅ (linha 183 `App.tsx`) |
| Reactions anônimas + edge function | ✅ | ✅ |
| RPCs heatmap + top-products | ✅ | ✅ |
| Atalhos globais (`G F`/`G C`) | ✅ | ✅ (chamado em `CollectionsPage`) |
| Heatmap renderizado | ✅ | ✅ (toolbar) |
| Smart Empty State | ✅ | ✅ |
| Toast undo no remover | ✅ | ✅ (linha 248 `CollectionDetailPage`) |

### ❌ Gaps confirmados (existe em Favoritos, falta em Coleções)

| # | Gap | Impacto |
|---|---|---|
| 1 | **`ExportCollectionButton` não está renderizado** no `CollectionDetailHeader`. O botão "PDF" chama `exportCollectionPDF` direto (sem CSV/JSON). | Médio — falta CSV/JSON |
| 2 | **`CollectionPresentationLauncher` não é usado**. A página renderiza `PresentationMode` direto (funciona, mas duplica lógica). | Baixo |
| 3 | **`CollectionFormDialog` não tem `FavoritesClientPicker`** (vínculo CRM). Schema tem `client_id`/`client_name` mas UI não permite preencher. | **Alto** — feature CRM inutilizável |
| 4 | **Botão "Compartilhar publicamente" inexistente**. Não há UI para gerar `share_token` e abrir URL pública. Tabela e rota existem mas usuário não consegue ativar. | **Alto** — share público inacessível |
| 5 | **`PriceDropBadge` não renderizado** em nenhum card/item de coleção (`CollectionGridCard`, `SortableProductItem`, `ProductGrid`). | **Alto** — feature de inteligência invisível |
| 6 | **Filtro "Só com queda" ausente** no `CollectionDetailPage` (Favoritos tem chip toggle no header). | Médio |
| 7 | **`SortableProductItem` não está sendo usado** em `CollectionDetailPage` — ela renderiza `ProductGrid` padrão. As notas inline + reorder DnD existem como componente mas estão órfãs. | **Alto** — perda funcional vs. Favoritos |
| 8 | **Sidebar de coleções (multi-listas estilo Favoritos)** não existe. Coleções usa grid de cards na index — escolha de design legítima, mas perde sidebar com sort/lixeira/reorder. | Médio — design choice |
| 9 | **View "Lixeira" dentro da página** não existe. Em Favoritos há `FavoritesTrashView`; em Coleções só funciona via undo toast (sem tela para ver/restaurar manualmente). | Médio |
| 10 | **Badge cliente CRM no `CollectionDetailHeader`** não existe (Favoritos mostra `<Badge> {client_name}`). | Baixo (depende do #3) |
| 11 | **CTA "Criar Orçamento" não passa `client_id`/`client_name`** no payload (Favoritos passa via URL params). | Baixo |
| 12 | **ARIA-live region** ausente no `CollectionDetailPage` (Favoritos tem `role="status"`). | Baixo (a11y) |

## Plano de fechamento — Onda Q (paridade real 10/10)

Sequência autônoma, 1 etapa por vez, sem perguntas:

### Q1 — CRM + Share público (gaps #3, #4, #10)
- `CollectionFormDialog`: adicionar `FavoritesClientPicker` (já é genérico, aceita callback). Persistir `client_id`/`client_name` via `updateCollection`.
- `CollectionDetailHeader`: badge `<Users/> {client_name}` + dropdown "Compartilhar" que gera `share_token = gen_random_uuid()`, `is_public = true`, `share_expires_at = now() + 30d`, copia URL `/colecao-publica/:token` ao clipboard.
- Hook `updateCollection` em `useCollections` aceita os campos novos.

### Q2 — Inteligência de preço visível (gaps #5, #6)
- Importar `PriceDropBadge` de `@/components/favorites/` em `SortableProductItem`, `CollectionGridCard` e overlay no `ProductGrid` quando renderizado pela CollectionDetailPage. Comparar `product.price` vs `item.price_at_save`.
- Chip toggle "Só com queda" no toolbar do `CollectionDetailPage` filtrando antes do render.

### Q3 — Reusar `SortableProductItem` + view Lixeira (gaps #7, #9)
- Adicionar view-mode `manage` no `CollectionDetailPage` que renderiza lista DnD com `SortableProductItem` (notas inline + reorder + remove). Botão "Gerenciar" no toolbar alterna.
- Criar `CollectionsTrashView.tsx` (espelho de `FavoritesTrashView`) consumindo `restoreFromTrash`. Aba "Lixeira" no `CollectionDetailPage`.

### Q4 — Polish final (gaps #1, #2, #11, #12)
- `CollectionDetailHeader`: substituir botão "PDF" por `<ExportCollectionButton/>` (PDF + CSV + JSON).
- Trocar `<PresentationMode>` direto por `<CollectionPresentationLauncher/>`.
- `handleCreateQuote` adiciona `client_id`/`client_name` aos URL params.
- ARIA-live region `<div role="status" aria-live="polite" className="sr-only">{lastAnnouncement}</div>` em `CollectionDetailPage`.

## Sequenciamento

```text
Q1 (CRM + Share)  →  Q2 (Price)  →  Q3 (DnD + Trash)  →  Q4 (Polish)
```

## Arquivos afetados

**Modificados:**
- `src/components/collections/CollectionFormDialog.tsx`
- `src/components/collections/CollectionDetailHeader.tsx`
- `src/components/collections/CollectionGridCard.tsx`
- `src/components/collections/SortableProductItem.tsx`
- `src/pages/CollectionDetailPage.tsx`
- `src/hooks/useCollections.ts`
- `src/contexts/CollectionsContext.tsx`

**Criados:**
- `src/components/collections/CollectionsTrashView.tsx`
- `src/components/collections/ShareCollectionDialog.tsx`

## Resultado
Paridade real 10/10 entre Favoritos e Coleções — todas as 11 melhorias da Onda P efetivamente acessíveis e visíveis na UI, não só presentes no backend.

