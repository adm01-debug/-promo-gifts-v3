

# Paridade Favoritos → Coleções (Onda P — 10/10)

## Estado atual
**Favoritos (10/10):** 17 melhorias em 4 ondas — multi-listas + lixeira TTL + price drop + watcher cron + CRM link + apresentação + rota pública + reactions + export PDF/CSV/JSON + atalhos + heatmap + smart empty state + undo + a11y.

**Coleções (~6/10):** persistência Supabase OK, multi-coleções OK, notas OK, reorder OK, seleção em massa → orçamento OK. **Faltam 11 das 17 melhorias dos Favoritos.**

## Gaps identificados (11 melhorias a portar)

| # | Melhoria | Origem | Onda |
|---|---|---|---|
| 1 | Lixeira TTL 30d (`collection_items_trash`) | A | P1 |
| 2 | Toast undo + `Cmd+Z` no remover item | D1 | P1 |
| 3 | Snapshot `price_at_save` em `collection_items` | B1 | P2 |
| 4 | `PriceDropBadge` + filtro "Só com queda" | B1 | P2 |
| 5 | Edge function `collections-watcher` (cron 06:00 BR) | B3 | P2 |
| 6 | Vínculo CRM (`client_id`/`client_name`) na coleção | C2 | P3 |
| 7 | Modo Apresentação fullscreen reusando `PresentationMode` | C3 | P3 |
| 8 | Rota pública `/colecao-publica/:token` + reactions anônimas | C4 | P3 |
| 9 | Export PDF/CSV/JSON (`ExportCollectionButton`) | D2 | P4 |
| 10 | Atalhos globais `G C` + `Shift+C` | D3 | P4 |
| 11 | Smart empty state + heatmap temporal | D4/D5 | P4 |

> **Já entregues** equivalentes (não duplicar): multi-coleções, notas inline, sort/reorder, seleção→orçamento (parcial via `handleSendSelectedToQuote`), bridge catálogo→coleção (`AddToCollectionModal`), multi-variantes (chave `collection_id,product_id,color_name`).

## Roadmap em 4 ondas autônomas

```text
Onda P1 (Confiança)         Onda P2 (Inteligência)      Onda P3 (Ativação)         Onda P4 (Polimento)
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐       ┌──────────────────┐
│ Lixeira + Undo   │   →    │ Snapshot preço   │   →    │ CRM + Apresentar │   →   │ Export + Atalhos │
│ Cmd+Z global     │        │ Badge + Watcher  │        │ Rota pública     │       │ Empty + Heatmap  │
└──────────────────┘        └──────────────────┘        └──────────────────┘       └──────────────────┘
```

### 🟥 Onda P1 — Confiança (Lixeira + Undo)
- **Migração:** tabela `collection_items_trash` (id, original_id, collection_id, user_id, product_id, color_name, color_hex, thumbnail_url, notes, price_at_save, deleted_at, expires_at) com RLS por dono + trigger `move_collection_item_to_trash` espelhando o de favoritos + função `cleanup_expired_collection_trash()` + cron diário.
- **Hook:** `useCollections.removeProductFromCollection` integra `showUndoToast` chamando `restoreFromCollectionTrash` mutation.
- **Página:** `useUndoStack` registrado em `CollectionDetailPage` para `Cmd+Z`.

### 🟧 Onda P2 — Inteligência de Preço
- **Migração:** adicionar coluna `price_at_save numeric` em `collection_items`.
- `addProductToCollection`/`addProductToMultipleCollections` populam `price_at_save = product.price`.
- **Componente:** reusar `PriceDropBadge` dos favoritos no `SortableProductItem` (CollectionDetailPage).
- **Filtro:** chip "Só com queda" no header de detalhe.
- **Edge function:** `collections-watcher/index.ts` (espelha `favorites-watcher`) — cron diário 06:00 BR detecta drops >5%, insere `workspace_notifications` categoria `collections` com dedupe.

### 🟩 Onda P3 — Ativação Comercial
- **Migração:** colunas `client_id text`, `client_name text`, `share_token text unique`, `share_expires_at timestamptz`, `is_public boolean default false` em `collections` + tabela `collection_item_reactions` (espelha `favorite_item_reactions`) + RLS público via token válido.
- **CRM:** `CollectionFormDialog` ganha `FavoritesClientPicker` (renomeado para `EntityClientPicker` ou reusado direto). Badge cliente em `CollectionDetailHeader` (já existe slot `onCreateQuote`).
- **Apresentação:** botão "Apresentar" já existe no `CollectionDetailHeader` — conectar ao `FavoritePresentationLauncher` generalizado (renomear para `EntityPresentationLauncher` aceitando produtos genéricos).
- **Rota pública:** `src/pages/PublicCollectionPage.tsx` + rota `/colecao-publica/:token` em `App.tsx` fora do AuthLayout. Edge function `collections-public-react` (espelha `favorites-public-react` com Zod + rate limit 5/min/IP + IP hash).

### 🟦 Onda P4 — Polimento & DX
- **Export:** `ExportCollectionButton.tsx` reusando lógica do `ExportFavoritesButton` (PDF 2×3 cards/página com jsPDF, CSV BOM UTF-8, JSON estruturado).
- **Atalhos:** `useCollectionsGlobalShortcuts` — sequência `G C` (<800ms) + `Shift+C` navegam para `/colecoes`. Registrar em `mem://features/keyboard-shortcuts-registry`.
- **Empty state inteligente:** RPC `get_top_collected_products(_days, _limit)` agregando produtos mais adicionados a coleções. `CollectionsEmptyStateSmart` mostra top 6 da semana com CTA por produto.
- **Heatmap:** RPC `get_collections_weekly_count(_weeks)` + `CollectionsHeatmap` (sparkline 8 semanas) no header da `CollectionsPage`.
- **A11y:** ARIA-live region em `CollectionDetailPage` para anunciar adições/remoções.

## Detalhes técnicos

**Migrações SQL (4 arquivos):**
1. P1: `collection_items_trash` + trigger + função cleanup + cron `cleanup-collections-trash-daily`.
2. P2: `ALTER TABLE collection_items ADD COLUMN price_at_save numeric`.
3. P3: alterações em `collections` (client_id, share_token, etc.) + `collection_item_reactions` + RLS pública via token.
4. P4: RPCs `get_top_collected_products` + `get_collections_weekly_count` + cron `collections-watcher-daily` (P2).

**Edge functions novas (2):**
- `supabase/functions/collections-watcher/index.ts` (P2)
- `supabase/functions/collections-public-react/index.ts` (P3)

**Hooks novos:**
- `src/hooks/useCollectionTrash.ts` (P1)
- `src/hooks/useCollectionReactions.ts` (P3)
- `src/hooks/useCollectionsGlobalShortcuts.ts` (P4)

**Componentes novos:**
- `src/components/collections/ExportCollectionButton.tsx` (P4)
- `src/components/collections/CollectionsEmptyStateSmart.tsx` (P4)
- `src/components/collections/CollectionsHeatmap.tsx` (P4)
- `src/components/collections/CollectionPresentationLauncher.tsx` (P3 — wrapper reusando launcher dos favoritos)
- `src/pages/PublicCollectionPage.tsx` (P3, lazy via `lazyWithRetry`)

**Componentes modificados:**
- `src/hooks/useCollections.ts` — `addProduct*` aceita `priceAtSave`; `removeProduct*` integra undo; expor `restoreFromTrash`.
- `src/pages/CollectionDetailPage.tsx` — `useUndoStack`, ARIA-live, filtro "queda de preço".
- `src/components/collections/SortableProductItem.tsx` — `PriceDropBadge`.
- `src/components/collections/CollectionDetailHeader.tsx` — conectar export + apresentação + badge cliente.
- `src/components/collections/CollectionFormDialog.tsx` — `FavoritesClientPicker`.
- `src/pages/CollectionsPage.tsx` — heatmap + empty state inteligente.
- `src/App.tsx` — rota `/colecao-publica/:token`.

**Memórias a atualizar:**
- Nova: `mem://features/collections-roadmap.md` (espelha favorites-roadmap).
- Nova: `mem://features/collections-public-share-system.md`.
- Atualizar: `mem://features/keyboard-shortcuts-registry` com `G C` e `Shift+C`.
- Atualizar: `mem://index.md` referenciando o roadmap de Coleções.

## Sequenciamento autônomo

```text
P1 → P2 → P3 → P4 → memória final
```

Sem pausas. Sem perguntas. Cada onda entrega completa (migração + edge function + componente + integração) antes de iniciar a próxima, conforme `mem://~user`.

## Resultado final
Módulo Coleções em **paridade absoluta 10/10 com Favoritos** — 11 melhorias entregues nas 4 ondas, com confiança (lixeira+undo), inteligência (price watcher), ativação comercial (CRM+apresentação+share público) e polimento (export+atalhos+heatmap).

