---
name: Favorites Roadmap (4 ondas)
description: Roadmap do módulo Favoritos — Ondas A, A.2 e B (B0..B3) entregues. Restam C (ativação comercial) e D (polimento)
type: feature
---

# Roadmap de Favoritos — meta 10/10

## ✅ Onda A — Fundação (entregue 2026-04-20)
Schema multi-listas + lixeira TTL 30d + RLS + RPC + componentes UI.

## ✅ Onda A.2 — Integração visual (entregue 2026-04-20)
FavoritesPage refatorada com sidebar 2-col, sort, notas inline, lixeira.

## ✅ Onda B — Inteligência de Preço (entregue 2026-04-20)
- **B0 Bridge catálogo→listas:** `useFavoriteQuickAdd` orquestra; `handleFavoriteProduct` em `useCatalogState` agora salva na lista padrão remota (popula `price_at_save = product.price`). Shift+clique pula confirmações. Componente `QuickListPicker` disponível para uso opt-in.
- **B1 PriceDropBadge:** `src/components/favorites/PriceDropBadge.tsx` — badge canto inferior esquerdo do card quando |Δ|>2%. Verde para queda, neutro para alta. Tooltip com valor salvo + valor atual + data.
- **B2 Filtro "Só com queda":** chip na `FavoritesSortBar` (com counter), persistido em `favorites-only-drops`. Aplicado em `filteredProducts` quando `isRemoteListView`.
- **B3 favorites-watcher:** edge function `supabase/functions/favorites-watcher/index.ts` + cron `favorites-watcher-daily` (09:00 UTC = 06:00 BR). Detecta drops >5% via comparação `price_at_save` × `products.price`. Insere `workspace_notifications` (categoria `favorites`) com dedupe diário via `metadata.incident_key = favorites_drop:YYYY-MM-DD`. Action URL: `/favoritos?filter=drops`.

**Arquivos novos da Onda B:**
- `src/hooks/useFavoriteQuickAdd.ts`
- `src/components/favorites/QuickListPicker.tsx`
- `src/components/favorites/PriceDropBadge.tsx`
- `supabase/functions/favorites-watcher/index.ts`

## 🔜 Onda C — Ativação Comercial
- C1 Botão "Transformar em orçamento" no header (URL params para Quote Builder)
- C2 Vincular lista a cliente CRM (CartCompanyPicker no CreateListDialog)
- C3 Modo apresentação (showroom fullscreen)
- C4 Rota pública `/lista-publica/:token` + `favorite_item_reactions`

## 🔜 Onda D — Polimento, DX & Entrega
- D1 Export PDF/CSV/JSON
- D2 Toast com undo + Cmd+Z global
- D3 Atalhos `F` / `G L` / `Shift+click`
- D4 Empty state inteligente (top semanais)
- D5 Heatmap temporal + insights
- D6 Multi-variantes do mesmo produto
- D7 A11y & mobile polish (swipe-delete, long-press)

## Próximo passo recomendado
Onda C1: botão "Transformar em orçamento" reusando `quote-system-url-params-standard` — é a maior alavanca de receita.
