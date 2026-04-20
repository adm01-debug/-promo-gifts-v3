---
name: Favorites Roadmap (4 ondas)
description: Plano estratégico do módulo Favoritos — Ondas A + A.2 entregues (fundação multi-listas + integração visual com sidebar/sort/notas/lixeira). Restam B/C/D
type: feature
---

# Roadmap de Favoritos — meta 10/10

## ✅ Onda A — Fundação (entregue 2026-04-20)
- Schema multi-listas + lixeira TTL 30d + RLS + funções RPC
- Hooks `useFavoriteLists`, `useFavoriteListItems`, `useFavoriteTrash`, `useLegacyFavoritesMigration`
- Componentes UI prontos (sidebar, dialogs, trash, note editor, sort bar)

## ✅ Onda A.2 — Integração visual (entregue 2026-04-20)
**Refatoração completa de `src/pages/FavoritesPage.tsx`:**
- Layout 2-coluna: `FavoriteListsSidebar` à esquerda (lg:w-64) + view principal à direita
- Mobile: sidebar vira `Sheet` lateral acionado por botão "Listas"
- View condicional:
  - `selectedListId === null` → store legado (Zustand) com header "Todos os favoritos"
  - `selectedListId` remoto → items enriquecidos via `useEnrichedFavoriteItems`
  - `showTrash` → `FavoritesTrashView`
- `FavoritesViewHeader` novo: nome + cor + badges (padrão/compartilhada/cliente) + sort bar
- `ItemNoteEditor` overlay nos cards (apenas em listas remotas)
- Persistência localStorage: `favorites-selected-list-id`, `favorites-sort`
- 7 critérios de ordenação aplicados em runtime (recent/oldest/price/name/category)
- Bulk selection + remove funciona em ambos os modos (legado + remoto)
- Search expandida para nome/sku/brand
- KPIs adaptam-se à view ativa

**Arquivos novos:**
- `src/hooks/useEnrichedFavoriteItems.ts` — junta items remotos + ProductsContext + price diff
- `src/components/favorites/FavoritesViewHeader.tsx` — header da view com sort

## 🔜 Onda B — Inteligência
- B1 Price drop badges (campo `price_at_save` já alimentado pelo schema; falta popular no addItem do catálogo)
- B2 Cron `favorites-watcher` edge function (notificações)
- B3 Recomendações no empty state
- B4 Heatmap temporal

## 🔜 Onda C — Ativação Comercial
- C1 Lista → Quote Builder
- C2 Vincular cliente CRM (campos já existem)
- C3 Modo apresentação (showroom)
- C4 Rota `/lista-publica/:token` (RLS já permite leitura anônima)

## 🔜 Onda D — Resiliência & DX
- D1 Toast com undo (lixeira já implementada)
- D2 Bulk import/export
- D3 Atalhos `F`, `G L`
- D4 Multi-variantes do mesmo produto (chave composta já no schema)
- D5 A11y mobile polish

## Próximo passo recomendado
Onda B1: ao favoritar a partir do catálogo, popular `priceAtSave` com `product.price` atual; depois renderizar `PriceDropBadge` reusando `priceDiffPct` já calculado em `useEnrichedFavoriteItems`.
