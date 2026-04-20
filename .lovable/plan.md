

# Auditoria estratégica — Módulo Favoritos
**Perspectiva: Product Designer Strategist | Meta: 10/10 enterprise**

## 1. Diagnóstico do estado atual

**O que já existe (forte):**
- Persistência local (Zustand + localStorage) com variant info (cor/tamanho/thumbnail)
- 3 view modes (grid/list/table) + seleção em massa
- KPIs (total, categorias, faixa de preço)
- Bulk actions compartilhadas com catálogo (orçamento/carrinho/coleção/comparar)
- Badge de cor salva no card

**Gaps críticos identificados:**
1. **Lista única e plana** — sem pastas, tags ou múltiplas listas (cliente A vs. cliente B)
2. **Sem contexto temporal** — não sei quando salvei, não vejo "salvos esta semana"
3. **Sem ordenação** — só ordem de inserção (mais recente primeiro implícito)
4. **Sem inteligência de preço** — produto baixou de preço? saiu de estoque? esgotou variante?
5. **Sem anotações** — vendedor não pode escrever "cliente Pedrinho gostou do azul"
6. **Persistência só no device** — perdeu se trocar de máquina/limpar cache
7. **Sem colaboração** — não dá para compartilhar lista com colega/cliente
8. **Sem ativação comercial** — favorito é "limbo": fica lá parado, não vira receita
9. **Sem segmentação por intent** — "para mim" vs "para mostrar ao cliente" vs "para reposição"
10. **Empty state genérico** — não sugere produtos a favoritar baseado em comportamento
11. **Sem histórico/lixeira** — remoção acidental = perda permanente
12. **Sem export/share fora do app** — não dá pra mandar PDF/link da lista

---

## 2. Roadmap de melhorias — 4 ondas

### 🔴 Onda A — Organização & Persistência (fundação)

**A1. Múltiplas listas (Wishlists)**
- Tabela `favorite_lists` (id, user_id, name, color, icon, is_default, shared_token, created_at)
- Tabela `favorite_items` (list_id, product_id, variant_info JSONB, note TEXT, added_at, position)
- UI: sidebar/tab com listas ("Cliente Acme", "Reposição Q4", "Inspirações") + drag & drop entre listas
- Migra favoritos atuais para lista "Padrão" automaticamente

**A2. Sync cross-device (Supabase)**
- Espelho local (Zustand) ↔ remoto (Supabase) com optimistic updates + conflict resolution last-write-wins
- Indicador "sincronizado há X" no header
- Funciona offline (queue de mutations)

**A3. Anotações por item**
- Campo `note` (textarea inline ao expandir card) — máx 280 chars
- Mostra ícone 📝 quando há nota; tooltip preview
- Buscável (search expande para incluir notas)

**A4. Ordenação & filtros avançados**
- Sort: recém-adicionado / preço asc-desc / nome / categoria / "preço caiu"
- Filtros laterais: categoria, fornecedor, faixa preço, tem variante selecionada, tem nota, sem estoque

---

### 🟡 Onda B — Inteligência & Sinais

**B1. Price drop & stock alerts**
- Snapshot de preço no momento do favoritar (`price_at_save`)
- Badge no card: "↓ 12% desde que você salvou" (verde) ou "↑ 5%" (cinza)
- Alerta visual: "🚨 Esgotando" (stock < 10) / "❌ Indisponível"
- Filtro rápido: "Só com queda de preço" / "Só em estoque"

**B2. Cron `favorites-watcher`**
- Roda 1x/dia: detecta drops >5% e items que voltaram ao estoque
- Insere `workspace_notifications` (categoria `favorites`) com dedupe 24h
- Email digest semanal opcional (toggle nas preferências)

**B3. Recomendações no empty state**
- "Top 6 produtos que vendedores como você favoritam esta semana"
- "Continuar de onde parou" (recently viewed cruzado com nunca favoritados)
- CTA forte: "Adicionar todos com 1 clique"

**B4. Heatmap temporal**
- Mini-gráfico no header: salvos por semana últimas 8 semanas
- Identifica picos sazonais ("você salva mais em novembro")

---

### 🟢 Onda C — Ativação Comercial (converter favorito em receita)

**C1. Conversão direta para orçamento**
- Botão pulsante no header: "💰 Transformar lista em orçamento"
- Pré-popula Quote Builder com todos os items + variantes salvas + qty default 100
- Métrica de header: "Valor potencial: R$ X" (soma min_price × min_quantity)

**C2. Vincular lista a cliente (CRM)**
- Cada lista pode ter `client_id` (opt) → puxa de companies (CRM)
- Exibe avatar + nome do cliente no header da lista
- Histórico: "Última vez compartilhada com Acme em 14/04"

**C3. Modo apresentação (showroom)**
- Botão "Apresentar" → fullscreen, 1 produto/tela, navegação por setas, sem UI admin
- Reusa `PresentationMode` já existente em CollectionDetailPage
- QR code para cliente acessar do celular

**C4. Compartilhamento público (token)**
- Link `/lista-publica/:token` view-only para cliente
- Cliente pode marcar 👍/👎 em cada item → vendedor vê reactions
- Expira em 30d (configurável)
- Watermark "Curadoria de [vendedor]"

---

### 🔵 Onda D — Resiliência & DX

**D1. Lixeira (soft delete)**
- Items removidos vão para `favorite_items_trash` (TTL 30 dias)
- Aba "Lixeira" com botão "Restaurar" / "Excluir definitivamente"
- Toast com undo (5s) na remoção

**D2. Bulk import/export**
- Export CSV/JSON (lista atual ou tudo) — reusa `ExportButton` da Onda 13 do Connections Hub
- Import CSV (SKUs) → busca produtos e cria lista
- Export PDF estilo catálogo (4 cols/página, com preço e variante salva)

**D3. Atalhos de teclado**
- `F` em qualquer card/produto: favoritar (já existe `Ctrl+K` busca)
- `G L` na FavoritesPage: abrir seletor de lista
- `Shift+click` em remove: pula confirmação
- Registrar em `mem://features/keyboard-shortcuts-registry`

**D4. Variant management granular**
- Hoje: 1 produto = 1 favorito (variante única)
- Proposta: permitir favoritar **múltiplas variantes do mesmo produto** (ex: SKU-X cor azul + SKU-X cor verde como entradas separadas)
- Composite key `productId::variantId` (mesmo padrão do Comparison System)

**D5. A11y & mobile polish**
- Swipe-to-delete em mobile (lista)
- Long-press em card → action sheet (mover lista / anotar / remover)
- Skeletons sofisticados no carregamento (CLS=0)
- ARIA-live para "X adicionado aos favoritos"

---

## 3. Priorização sugerida (impacto × esforço)

```text
                  Alto impacto
                       │
   A1 (Listas) ●       │       ● C1 (→ Orçamento)
   B1 (Price drop) ●   │       ● C4 (Share público)
                       │
   ────────────────────┼──────────────────── Baixo esforço
                       │
   A2 (Sync) ●         │       ● B2 (Cron watcher)
   D1 (Lixeira) ●      │       ● A3 (Notas)
                       │
                  Baixo impacto
```

**Sequência recomendada:**
1. **Onda A completa** (fundação obrigatória — sem isso nada escala)
2. **C1 + B1** (ROI imediato: vendedor vê valor potencial e drops)
3. **C4 + B2** (engajamento e proatividade)
4. **D1-D5** (polimento final 10/10)

---

## 4. Métricas de sucesso (para validar pós-implementação)

- **Adoção:** % de vendedores com ≥1 lista (meta: >70% em 30d)
- **Profundidade:** items médios por lista (meta: >12)
- **Conversão:** % de listas que viram orçamento (meta: >25%)
- **Retenção:** % de favoritos com mais de 30 dias (meta: <40% — sinal saudável de rotação)
- **Compartilhamento:** % de listas com share público ativo (meta: >15%)

---

## 5. Recomendação executiva

Começar pela **Onda A (#A1, #A2, #A3, #A4)** numa única sprint — fundação de schema novo + sync + listas. Sem isso, qualquer feature subsequente reescreve infra.

Depois execução autônoma sequencial: B → C → D, conforme padrão `mem://~user`.

**Total estimado:** 4 ondas, 17 melhorias, ~2 sprints de execução contínua para chegar em 10/10 absoluto.

Diga **"executar Onda A"** (ou outra) que eu detalho o plano técnico de implementação e parto pra execução autônoma sequencial até concluir.

