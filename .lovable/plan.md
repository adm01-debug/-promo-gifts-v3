

# Auditoria estratégica — Módulo Favoritos (V2)
**Perspectiva: Product Designer Strategist | Estado atual: Onda A (fundação) entregue**

## 1. Onde estamos vs. onde podemos chegar

**Já entregue (Onda A — fundação técnica):**
- Schema multi-listas (`favorite_lists` + `favorite_items` + lixeira TTL 30d)
- Sync Supabase com RLS (dono/admin/público via token)
- Componentes UI prontos (`FavoriteListsSidebar`, `CreateListDialog`, `ShareListDialog`, `FavoritesTrashView`, `ItemNoteEditor`, `FavoritesSortBar`)
- Migração idempotente do localStorage → nuvem ativa em background

**Gap crítico imediato:** os componentes existem mas **não estão conectados na `FavoritesPage`** — usuário ainda vê a versão flat single-list. Tudo o resto (Ondas B/C/D) depende dessa integração visual.

---

## 2. Roadmap proposto — 4 ondas (priorizadas por ROI)

### 🔴 Onda A.2 — Integração visual (desbloqueio imediato)

**A2.1 Layout 2-coluna na FavoritesPage**
- Sidebar `FavoriteListsSidebar` à esquerda (lg:w-64) + view principal à direita
- Em mobile: sidebar vira `Sheet` lateral acionado por botão "Listas"
- Trocar `useFavoritesStore` por `useFavoriteListItems(selectedListId)` — store fica como fallback offline
- Persistir `selectedListId` em localStorage para retomar última lista vista

**A2.2 Tabs lista ativa / lixeira**
- Quando `showTrash=true`, renderiza `FavoritesTrashView`; senão, view atual filtrada
- Header dinâmico: nome + cor da lista + counter de itens + ação "Apresentar"

**A2.3 Sort + notas inline integrados**
- `FavoritesSortBar` no header do view (7 critérios)
- `ItemNoteEditor` como overlay no canto superior direito de cada card
- Indicador visual 📝 quando item tem nota; tooltip preview no hover

**A2.4 Drag-and-drop entre listas**
- `@dnd-kit` (já no projeto) — arrastar card de produto para item da sidebar = mover
- Toast com undo (5s) após mover

---

### 🟡 Onda B — Inteligência de Preço & Estoque

**B1. Snapshot de preço ao favoritar**
- Hook `useFavoriteListItems.addItem` já aceita `priceAtSave` — popular automaticamente com `min_price` atual do produto
- Badge no card: "↓ 12% desde que você salvou" (verde) / "↑ 5%" (cinza neutro) / "—" (sem mudança)
- Filtro rápido "Só com queda de preço"

**B2. Stock awareness**
- Cruzar com tabela de estoque externa (já temos via `external-db-bridge`)
- Badges: 🚨 "Esgotando" (<10 un.) / ❌ "Indisponível" / ✨ "Voltou ao estoque"
- Filtro "Só em estoque"

**B3. Cron `favorites-watcher` (edge function)**
- Roda 1x/dia (06:00 BR) via `pg_cron`
- Detecta drops >5% e items que voltaram ao estoque
- Insere `workspace_notifications` (categoria `favorites`) com dedupe 24h
- Toggle nas preferências: notificação push vs digest semanal

**B4. Heatmap temporal no header**
- Mini-sparkline com items salvos por semana (últimas 8 semanas)
- Identifica padrões: "você salva mais às segundas" / "pico em novembro"

---

### 🟢 Onda C — Ativação Comercial (favorito → receita)

**C1. Lista → Quote Builder em 1 clique**
- Botão CTA "💰 Transformar em orçamento" no header de cada lista
- Pré-popula Quote Builder com items + variantes salvas + qty default da min_quantity
- KPI no header: "Valor potencial: R$ X.XXX" (soma `min_price × min_quantity`)
- Reusa parâmetros de URL do `quote-system-url-params-standard`

**C2. Vincular lista a cliente CRM**
- Campos `client_id` / `client_name` já existem no schema
- Picker no `CreateListDialog` (reusa `CartCompanyPicker`)
- Avatar + nome do cliente no header da lista
- Histórico: "Última vez compartilhada com Acme em 14/04"

**C3. Modo apresentação (Showroom)**
- Botão "Apresentar" no header → fullscreen 1 produto/tela
- Reusa `PresentationMode` já existente em CollectionDetailPage
- Setas de teclado, fullscreen API, watermark "Curadoria de [vendedor]"
- QR code para cliente acessar do celular

**C4. Rota pública `/lista-publica/:token`**
- RLS já permite leitura anônima via `shared_token`
- Page minimal sem chrome admin: hero (nome lista + curador) + grid produtos
- Cliente reage 👍/👎/❤️ por item → grava em `favorite_item_reactions`
- Vendedor vê reactions no card original
- Watermark + expiração visível
- Anti-scraping aplicado (rate limit já existe)

---

### 🔵 Onda D — Polimento, DX & Resiliência

**D1. Toast com undo na remoção**
- Lixeira backend já implementada — só falta UX
- Sonner `toast.action({ label: "Desfazer", onClick: restore })` por 5s
- Atalho `Cmd+Z` global após delete

**D2. Bulk import/export**
- Export CSV/JSON (lista atual ou tudo) — reusa `ExportButton` da Onda 13 do Connections Hub
- Import CSV (coluna SKU) → busca produtos por código e cria lista
- Export PDF estilo catálogo (4 cols/página, com preço, nota e variante salva) — reusa lib do Quote PDF

**D3. Atalhos de teclado**
- `F` em qualquer card/produto: favoritar (já existe `Ctrl+K` busca)
- `G L` na FavoritesPage: abrir seletor de lista
- `Shift+click` em remove: pula confirmação
- Registrar em `mem://features/keyboard-shortcuts-registry`

**D4. Multi-variantes do mesmo produto**
- Schema já suporta (chave composta `list_id, product_id, variant_id`)
- UI: permitir favoritar SKU-X cor azul + SKU-X cor verde como entradas separadas
- Mesmo padrão do Comparison System

**D5. A11y & mobile polish**
- Swipe-to-delete em mobile (lista)
- Long-press em card → action sheet (mover lista / anotar / remover)
- ARIA-live para "X adicionado aos favoritos"
- Skeletons sofisticados com CLS=0
- Touch targets ≥44px

**D6. Empty state inteligente**
- "Top 6 produtos que vendedores como você favoritam esta semana" (RPC com agregação)
- "Continuar de onde parou" (recently viewed × nunca favoritados)
- CTA "Adicionar todos com 1 clique"

---

## 3. Sequenciamento recomendado

```text
        Sprint atual                  Próxima sprint
┌──────────────────────┐    ┌──────────────────────────┐
│  Onda A.2 (4 itens)  │ →  │  Onda B (4 itens)        │
│  ─────────────────   │    │  + C1 + C4 (rota pub.)   │
│  desbloqueio visual  │    │  ROI imediato comercial  │
└──────────────────────┘    └──────────────────────────┘
                                         ↓
                            ┌──────────────────────────┐
                            │  Onda C2/C3 + Onda D     │
                            │  showroom + polimento    │
                            └──────────────────────────┘
```

**Justificativa:** A.2 é pré-requisito de tudo (sem UI integrada nada do resto aparece). B é a ferramenta que faz o vendedor voltar (notificações = retenção). C1+C4 fecha o loop de receita. D é polimento final 10/10.

---

## 4. Métricas de sucesso

- **Adoção:** % vendedores com ≥1 lista nomeada (meta: >70% em 30d)
- **Profundidade:** items médios por lista (meta: >12)
- **Conversão:** % listas que viram orçamento (meta: >25%)
- **Engajamento:** % listas com share público ativo (meta: >15%)
- **Retenção:** taxa de notificação price-drop → clique (meta: >18%)

---

## 5. Detalhes técnicos (para Default Mode executar)

**Onda A.2 — arquivos afetados:**
- `src/pages/FavoritesPage.tsx` — refatoração layout 2-col
- Novo: `src/components/favorites/FavoritesViewHeader.tsx` (nome lista + sort + apresentar + CTA orçamento)
- Novo: `src/components/favorites/FavoritesEnrichedGrid.tsx` (cruza store + items remotos + price snapshots)
- `src/hooks/useFavoriteLists.ts` — adicionar `useEnrichedFavoriteItems(listId)` que faz join produto + price diff

**Onda B — novos artefatos:**
- Edge function `supabase/functions/favorites-watcher/index.ts` + cron 06:00 BR
- Tabela `favorite_price_snapshots` (opcional — ou usar `price_at_save` direto)
- Componente `PriceDropBadge` reusável

**Onda C4 — rota pública:**
- `src/pages/PublicFavoriteListPage.tsx` no `App.tsx` em rota fora do AuthLayout
- Tabela `favorite_item_reactions` (anon_id via cookie + emoji)
- Edge function `favorites-public-react` (rate limit 5/min/IP)

**Memória a atualizar ao fim:**
- `mem://features/favorites-roadmap.md` registrar progresso de cada onda
- `mem://features/keyboard-shortcuts-registry` adicionar atalhos da D3

---

## 6. Recomendação executiva

Começar **agora** pela **Onda A.2** numa única sprint autônoma — sem ela todo o trabalho da Onda A fica invisível. Depois execução contínua B → C → D em ondas aprovadas.

Diga **"executar Onda A.2"** que parto pra refatoração visual completa da FavoritesPage com sidebar + sort + notas + lixeira integrados.

