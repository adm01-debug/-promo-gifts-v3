

# Auditoria estratégica V3 — Módulo Favoritos
**Product Designer Strategist | Estado: Ondas A + A.2 entregues | Meta: 10/10 absoluto**

## 1. Diagnóstico pós-A.2

**Já entregue:**
- Multi-listas com sidebar, sort 7 critérios, notas inline, lixeira TTL 30d
- Sync Supabase + RLS + migração legacy idempotente
- Layout 2-col responsivo (sheet mobile)

**Gaps críticos identificados na revisão:**

| # | Gap | Impacto | Onda |
|---|---|---|---|
| 1 | `favoritar` no catálogo NÃO grava em lista remota — só no Zustand | 🔴 fundação | B0 |
| 2 | `price_at_save` nunca é populado (snapshot perdido) | 🔴 inteligência | B1 |
| 3 | Sem alerta visual de queda de preço (badge calculado mas não renderizado) | 🟡 ROI | B1 |
| 4 | Sem cron monitorando preços/estoque → vendedor não volta | 🟡 retenção | B2 |
| 5 | Lista não vira orçamento direto (loop receita aberto) | 🟢 conversão | C1 |
| 6 | Sem rota pública `/lista-publica/:token` (RLS já permite) | 🟢 viralização | C2 |
| 7 | Sem modo apresentação fullscreen | 🟢 sales enablement | C3 |
| 8 | Sem export PDF/CSV da lista | 🔵 entrega | D1 |
| 9 | Remoção sem undo (lixeira backend pronta, UX faltando) | 🔵 confiança | D2 |
| 10 | Sem atalhos `F`/`G L`/`Cmd+Z` | 🔵 DX | D3 |
| 11 | Empty state genérico (sem recomendações) | 🔵 ativação | D4 |
| 12 | Sem heatmap temporal / insights de uso | 🔵 analytics | D5 |

## 2. Roadmap proposto — 4 ondas (sequência de execução)

### 🔴 Onda B — Inteligência de Preço & Estoque

**B0. Bridge catálogo → listas remotas (pré-requisito)**
- `useFavoritesStore.toggleFavorite` passa a aceitar `targetListId` opcional
- Quando usuário tem listas remotas, abrir mini-popover "Adicionar a qual lista?" no clique do coração no catálogo (default = última usada)
- Atalho: shift+clique adiciona direto à lista padrão sem popover
- Migração suave: enquanto usuário não cria 2ª lista, comportamento atual preserva

**B1. Snapshot de preço + Price drop badges**
- `addItem` popula `price_at_save = product.price` automaticamente
- Componente `PriceDropBadge` no canto inferior do `ProductCard` (apenas em listas remotas):
  - ↓ verde "−12%" se queda >2%
  - ↑ cinza "+5%" se alta >2%
  - sem badge se variação <2%
- Filtro rápido na sort bar: chip "Só com queda"
- Tooltip: "Salvo a R$ X em DD/MM • hoje R$ Y"

**B2. Stock awareness no card**
- Cruza com estoque externo via `external-db-bridge` (já existe)
- Badges sobrepostos: 🚨 "Esgotando" (<10) / ❌ "Indisponível" / ✨ "Voltou ao estoque"
- Filtro chip "Só em estoque"

**B3. Edge function `favorites-watcher` + cron 06:00 BR**
- Roda 1x/dia: detecta drops >5% ou items que voltaram ao estoque
- Insere `workspace_notifications` categoria `favorites` com dedupe 24h via `incident_key`
- Notificação clica → abre FavoritesPage com filtro "Só com queda" pré-aplicado

---

### 🟢 Onda C — Ativação Comercial (favorito → receita)

**C1. Botão CTA "Transformar em orçamento"**
- No `FavoritesViewHeader` quando lista tem ≥1 item
- Pré-popula Quote Builder via URL params (`/orcamentos/novo?items=...&list_id=...`)
- KPI no header: "Valor potencial: R$ X.XXX" (soma `price × min_quantity`)
- Quando lista tem `client_id`, vincula automaticamente o orçamento ao cliente

**C2. Vincular lista a cliente CRM**
- Picker no `CreateListDialog` reusando `CartCompanyPicker`
- Avatar + nome do cliente no `FavoritesViewHeader`
- Histórico mini: "Compartilhada 2x • última em 14/04"

**C3. Modo apresentação (Showroom)**
- Botão "Apresentar" no header → fullscreen 1 produto/tela
- Reusa `PresentationMode` do CollectionDetailPage
- Setas de teclado, watermark "Curadoria de [vendedor]"
- QR code para cliente espelhar no celular

**C4. Rota pública `/lista-publica/:token`**
- Page minimal sem chrome admin (logo Promo Gifts + nome lista + curador)
- Cliente reage 👍/❤️ por item → grava em `favorite_item_reactions` (anon_id via cookie)
- Vendedor vê reactions com avatar de "cliente anônimo" no card
- Anti-scraping aplicado (rate limit já existe)
- Watermark "Expira em DD/MM"

---

### 🔵 Onda D — Polimento, DX & Entrega

**D1. Export PDF / CSV / JSON**
- Reusa `ExportButton` da Onda 13 do Connections Hub
- PDF estilo catálogo (4 cols/página) com preço + variante salva + nota
- CSV com SKU/nome/preço/nota/categoria
- JSON para integrações externas

**D2. Toast com undo (5s) + Cmd+Z global**
- Sonner `toast.action({ label: "Desfazer", onClick: restore })` ao remover
- Hook `useUndoStack` com `Cmd+Z` listener global na FavoritesPage

**D3. Atalhos de teclado**
- `F` em qualquer card: favoritar (já existe `Ctrl+K`)
- `G L` na FavoritesPage: abrir seletor de lista
- `Shift+click` em remove: pula confirmação
- Registrar em `mem://features/keyboard-shortcuts-registry`

**D4. Empty state inteligente**
- "Top 6 produtos que vendedores favoritam esta semana" (RPC com agregação)
- "Continuar de onde parou" (recently viewed × nunca favoritados)
- CTA "Adicionar todos com 1 clique"

**D5. Heatmap temporal + insights**
- Mini-sparkline no `FavoritesViewHeader`: items salvos por semana últimas 8
- Insight contextual: "você salva mais às segundas" / "pico em novembro"

**D6. Multi-variantes do mesmo produto**
- Schema já suporta (chave composta `list_id, product_id, variant_id`)
- UI permite favoritar SKU-X cor azul + SKU-X cor verde como entradas separadas
- Mesmo padrão do Comparison System

**D7. A11y & mobile polish**
- Swipe-to-delete em mobile (lista)
- Long-press em card → action sheet (mover lista / anotar / remover)
- ARIA-live para "X adicionado aos favoritos"
- Touch targets ≥44px

---

## 3. Sequenciamento e priorização

```text
       Sprint 1                    Sprint 2                  Sprint 3
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│  Onda B (B0→B3)    │ →  │  Onda C (C1→C4)    │ →  │  Onda D (D1→D7)    │
│  4 melhorias       │    │  4 melhorias       │    │  7 melhorias       │
│  fundação + valor  │    │  receita + viral   │    │  polimento 10/10   │
└────────────────────┘    └────────────────────┘    └────────────────────┘
```

**Justificativa:**
- **B primeiro:** sem B0 (catálogo→lista) toda a Onda A.2 fica subutilizada; sem B1+B3 não há retenção
- **C segundo:** fecha o loop de receita (favorito vira orçamento) e abre canal viral (link público)
- **D último:** polimento que eleva de 9/10 funcional para 10/10 absoluto

## 4. Métricas de sucesso

| Métrica | Meta |
|---|---|
| Adoção (vendedores com ≥1 lista nomeada em 30d) | >70% |
| Profundidade (items médios por lista) | >12 |
| Conversão (listas → orçamento) | >25% |
| Engajamento (listas com share público ativo) | >15% |
| Retenção (CTR de notificação price-drop) | >18% |

## 5. Detalhes técnicos para Default Mode

**Onda B — arquivos:**
- `src/stores/useFavoritesStore.ts` — estender `toggleFavorite(productId, variant?, targetListId?)`
- Novo: `src/components/favorites/QuickListPicker.tsx` — popover de seleção de lista no catálogo
- Novo: `src/components/favorites/PriceDropBadge.tsx` — badge reusável
- `src/hooks/useFavoriteLists.ts` — `addItem` aceita `priceAtSave`
- Novo: `supabase/functions/favorites-watcher/index.ts` + cron via migração SQL
- Reusa `useEnrichedFavoriteItems` (já calcula `priceDiffPct`)

**Onda C — arquivos:**
- `src/components/favorites/FavoritesViewHeader.tsx` — adicionar CTA "Orçamento" + "Apresentar" + KPI valor potencial
- Novo: `src/pages/PublicFavoriteListPage.tsx` em `App.tsx` fora do AuthLayout
- Migração: tabela `favorite_item_reactions` (anon_id, emoji, created_at) + RLS público via token
- Novo: `supabase/functions/favorites-public-react/index.ts` (rate limit 5/min/IP)
- `src/components/favorites/CreateListDialog.tsx` — adicionar `CartCompanyPicker`

**Onda D — arquivos:**
- Novo: `src/components/favorites/ExportFavoritesButton.tsx` (reusa `ExportButton`)
- Novo: `src/hooks/useUndoStack.ts` (Cmd+Z global)
- Novo: `src/components/favorites/FavoritesEmptyStateSmart.tsx`
- Novo: `src/components/favorites/FavoritesHeatmap.tsx` (sparkline)
- RPC novo: `get_top_favorited_products(_days int, _limit int)`
- `mem://features/keyboard-shortcuts-registry` — registrar `F`, `G L`

**Memória a atualizar ao fim de cada onda:**
- `mem://features/favorites-roadmap.md` registrar progresso
- Nova: `mem://features/favorites-intelligence-system` documentando watcher + dedupe

## 6. Recomendação executiva

Começar **agora** pela **Onda B (B0→B3)** — é o desbloqueio mais crítico. Sem B0 a Onda A.2 não é usada de verdade (vendedor segue salvando no Zustand legacy). Depois execução autônoma sequencial C → D conforme padrão `mem://~user`.

**Total restante:** 3 ondas, 15 melhorias, ~3 sprints autônomas para 10/10 absoluto.

Diga **"executar Onda B"** e parto pra implementação completa: bridge catálogo→listas + snapshot de preço + badges + cron watcher + notificações.

