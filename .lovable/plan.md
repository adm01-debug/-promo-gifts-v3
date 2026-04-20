

# Execução autônoma — Ondas C + D restantes (Favoritos → 10/10)

Estado atual: Ondas A, A.2 e B entregues. Restam **Onda C (4 itens)** e **Onda D (7 itens)** = 11 melhorias para chegar em 10/10 absoluto.

Modo de execução: sequencial autônomo, sem pausas, sem perguntas, conforme `mem://~user`.

---

## 🟢 Onda C — Ativação Comercial

### C1. CTA "Transformar em orçamento"
- `FavoritesViewHeader` ganha botão primário "💰 Gerar Orçamento" + KPI "Valor potencial: R$ X.XXX"
- Soma `Σ price × min_quantity` dos itens enriquecidos
- Navega para `/orcamentos/novo?items=ID1:QTD,ID2:QTD&list_id=...&client_id=...` (padrão `quote-system-url-params-standard`)
- Quando lista tem `client_id`, vincula automaticamente

### C2. Vincular lista ao cliente CRM
- `CreateListDialog` + novo `EditListDialog` ganham `CartCompanyPicker` (reusa CRM bridge)
- Persiste `client_id` + `client_name` em `favorite_lists`
- Avatar + nome do cliente no `FavoritesViewHeader` (badge já existe parcialmente)

### C3. Modo apresentação (Showroom)
- Botão "Apresentar" no header → fullscreen 1 produto/tela
- Reusa padrão do `PresentationMode` de CollectionDetailPage
- Setas ←/→/Esc, watermark "Curadoria de [vendedor]", QR code para mirror mobile

### C4. Rota pública `/lista-publica/:token`
- Migração: tabela `favorite_item_reactions` (id, item_id, anon_id cookie, emoji, created_at) + RLS público leitura/insert via token válido
- Página `src/pages/PublicFavoriteListPage.tsx` em `App.tsx` fora do AuthLayout
- Layout minimal: hero (logo + nome lista + curador) + grid produtos + botões 👍 ❤️ por item
- Edge function `favorites-public-react` (Zod + rate limit 5/min/IP via `bot_detection_log`)
- Reactions agregadas visíveis no card original (lado vendedor)
- Watermark "Expira em DD/MM"

---

## 🔵 Onda D — Polimento & DX

### D1. Toast com undo + Cmd+Z global
- `useFavoriteListItems.removeItem` integrado com `showUndoToast` (já existe em `utils/undoToast.tsx`)
- Restore via `restoreFromTrash` mutation
- Hook `useUndoStack` na FavoritesPage com listener `Cmd/Ctrl+Z`

### D2. Export PDF / CSV / JSON
- Componente `ExportFavoritesButton` no header (dropdown 3 formatos)
- CSV: SKU, nome, preço, variante, nota, categoria
- JSON: serialização completa para integrações
- PDF: estilo catálogo 4 cols/página com preço + variante + nota (reusa lib jsPDF do Quote PDF)

### D3. Atalhos de teclado
- `F` em ProductCard: favoritar (já existe `Ctrl+K`)
- `G L` em qualquer página: abrir FavoritesPage
- `Shift+click` em remover: pula confirmação (já implementado em parte)
- Registrar em `mem://features/keyboard-shortcuts-registry`

### D4. Empty state inteligente
- RPC `get_top_favorited_products(_days int, _limit int)` agregando favoritos da última semana
- Componente `FavoritesEmptyStateSmart` com 6 produtos "tops da semana" + "continuar de onde parou" (recently viewed)
- CTA "Adicionar todos com 1 clique"

### D5. Heatmap temporal + insights
- Componente `FavoritesHeatmap` (sparkline 8 semanas) no header
- Insight contextual: "você salva mais às segundas" / "pico em novembro"
- Query agregada em `useFavoriteListItems` (group by week)

### D6. Multi-variantes do mesmo produto
- Schema já suporta (chave `list_id, product_id, variant_id`)
- UI: ProductCard permite adicionar SKU-X cor azul + SKU-X cor verde como entradas separadas
- `QuickListPicker` mostra variante atual selecionada
- Lista exibe múltiplas entradas distinguidas por swatch de cor

### D7. A11y & mobile polish
- Swipe-to-delete em mobile (lista) usando `framer-motion` drag
- Long-press em card → action sheet (Sheet component): mover lista / anotar / remover
- ARIA-live region `aria-live="polite"` para "X adicionado aos favoritos"
- Touch targets ≥44px em todos os botões de favoritos
- Skeletons sofisticados com CLS=0

---

## Sequenciamento autônomo

```text
C1 → C2 → C3 → C4 → D1 → D2 → D3 → D4 → D5 → D6 → D7 → memória
```

Cada etapa entrega completa (migração + edge function + componente + integração) antes de iniciar a próxima. Sem pausas. Sem perguntas.

## Detalhes técnicos

**Migrações SQL:**
- `favorite_item_reactions` (C4)
- RPC `get_top_favorited_products` (D4)

**Edge functions novas:**
- `favorites-public-react` com Zod + rate limit (C4)

**Arquivos novos:**
- `src/pages/PublicFavoriteListPage.tsx` (C4)
- `src/components/favorites/FavoritePresentationMode.tsx` (C3)
- `src/components/favorites/EditListDialog.tsx` (C2)
- `src/components/favorites/ExportFavoritesButton.tsx` (D2)
- `src/components/favorites/FavoritesEmptyStateSmart.tsx` (D4)
- `src/components/favorites/FavoritesHeatmap.tsx` (D5)
- `src/hooks/useUndoStack.ts` (D1)
- `src/hooks/useFavoritesGlobalShortcuts.ts` (D3)

**Arquivos modificados:**
- `src/components/favorites/FavoritesViewHeader.tsx` (C1, C2, C3, D2, D5)
- `src/components/favorites/CreateListDialog.tsx` (C2)
- `src/hooks/useFavoriteLists.ts` (D1 toast undo)
- `src/pages/FavoritesPage.tsx` (D1, D3, D4, D7)
- `src/App.tsx` (C4 rota pública)
- `src/components/favorites/QuickListPicker.tsx` (D6)
- `mem://features/favorites-roadmap.md` (atualização final)
- `mem://features/keyboard-shortcuts-registry.md` (D3)

**Memória nova:**
- `mem://features/favorites-public-share-system.md` documentando rota pública + reactions + anti-scraping

Ao final: módulo Favoritos em 10/10 absoluto com 17 melhorias entregues nas 4 ondas.

