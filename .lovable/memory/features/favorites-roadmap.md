---
name: Favorites Roadmap (4 ondas)
description: Plano estratégico do módulo Favoritos — Onda A (fundação) entregue: schema multi-listas + sync Supabase + notas + lixeira TTL 30d. Restam B/C/D
type: feature
---

# Roadmap de Favoritos — meta 10/10

## ✅ Onda A — Fundação (entregue 2026-04-20)

**Schema (migração aplicada):**
- `favorite_lists` — listas nomeadas por vendedor (cor, ícone, padrão, client_id, shared_token, shared_expires_at, position)
- `favorite_items` — itens com variant_info JSONB, note (≤280 chars), price_at_save, position. Unique (list_id, product_id, COALESCE(variant_id,''))
- `favorite_items_trash` — lixeira com TTL 30d (trigger BEFORE DELETE move para cá)
- RLS: dono gerencia seu conteúdo; admin lê tudo; público lê listas com shared_token válido
- Funções: `ensure_default_favorite_list(uuid)`, `cleanup_expired_favorite_trash()`, `move_favorite_to_trash()` (trigger)

**Camada de dados (entregue):**
- `src/hooks/useFavoriteLists.ts` — `useFavoriteLists`, `useFavoriteListItems`, `useFavoriteTrash`, `useLegacyFavoritesMigration`
- Migração idempotente do localStorage `product-favorites` → lista padrão (flag `favorites-migrated-${userId}`)

**Componentes UI prontos (não-integrados ainda na page):**
- `FavoriteListsSidebar` — sidebar com listas + dropdown de ações + lixeira
- `CreateListDialog` — criar/editar (16 cores, descrição até 200ch)
- `ShareListDialog` — gerar/revogar token público
- `FavoritesTrashView` — restaurar/purgar
- `ItemNoteEditor` — popover com textarea 280ch
- `FavoritesSortBar` — 7 critérios de ordenação

**Hook ativado em FavoritesPage:** apenas `useLegacyFavoritesMigration()` para migrar dados legados em background. Refatoração visual completa (sidebar + tabs lista/lixeira + sort + notas inline) fica para próxima sessão — todos os componentes já existem e tipam.

## 🔜 Onda B — Inteligência
- B1 Price drop badges (usar `price_at_save`)
- B2 Cron `favorites-watcher` (notificações)
- B3 Recomendações no empty state
- B4 Heatmap temporal

## 🔜 Onda C — Ativação Comercial
- C1 Lista → Quote Builder
- C2 Vincular cliente CRM (campos `client_id`/`client_name` já existem)
- C3 Modo apresentação (showroom)
- C4 Rota `/lista-publica/:token` (RLS já permite leitura anônima)

## 🔜 Onda D — Resiliência & DX
- D1 Toast com undo (lixeira já implementada no schema)
- D2 Bulk import/export
- D3 Atalhos `F`, `G L`
- D4 Multi-variantes do mesmo produto (chave composta já no schema)
- D5 A11y mobile polish

## Próximo passo recomendado
Refatorar `src/pages/FavoritesPage.tsx` para layout 2-coluna com `FavoriteListsSidebar` à esquerda + view atual filtrada pelo `selectedListId`. Substituir `useFavoritesStore` por `useFavoriteListItems(selectedListId)` mantendo o store como fallback offline.
