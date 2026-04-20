

# Comparador 10/10 — Onda C6 (Excelência contínua pós-meta)

O comparador atingiu 10/10 com as 26 melhorias das ondas C1→C5. Para manter a filosofia de **perfeição contínua**, proponho a **Onda C6** com 8 melhorias incrementais focadas em refinamento, performance e diferenciais competitivos que vão além do estado-da-arte atual.

## 8 melhorias propostas

### 🎯 Inteligência

**1. Score com pesos personalizáveis persistentes** — Popover com sliders (preço/estoque/qtd mín/cores/lead time) salvos em `user_preferences.comparison_weights`. Cada vendedor calibra para seu perfil de cliente (B2B grande vs revenda pequena).

**2. Comparação histórica "Como estava há 30 dias"** — Toggle que sobrepõe valores antigos da `price_history` em badges discretos ("era R$X há 30d"). Mostra evolução em 1 clique.

**3. Export PDF white-label do cliente vinculado** — Quando há `FavoritesClientPicker` ativo, o PDF leva logo + cores da empresa cliente (busca em `companies.brand_logo_url` / `brand_color`). Hoje é genérico.

### 🎨 UX premium

**4. Drag-and-drop para reordenar colunas** — `@dnd-kit/sortable` na tabela; ordem persiste no `useComparisonStore`. Vendedor coloca "favorito" primeiro para apresentar.

**5. Modo "Foco" full-screen sem chrome** — Tecla `F` esconde sidebar/header e expande tabela ao máximo. Espelho do padrão usado em apresentações.

**6. Zoom de imagem inline na tabela** — Hover na célula da foto abre lupa flutuante com zoom 2× (sem abrir modal). Padrão e-commerce premium.

### 🔔 Engajamento

**7. Notificação "Preço caiu nos seus comparados"** — Edge function diária que cruza `user_comparisons` ativas com `price_history` recente; envia notificação via `notificationService` quando há queda > 5% em produto comparado.

**8. Atalho `Shift+?` cheatsheet visual** — Dialog com TODOS os atalhos do comparador (`G X`, `Shift+X`, `1-4`, `D`, `R`, `F`, `?`) em grid bonito. Padrão Linear/Notion.

## Sequenciamento

```text
C6.1 (Inteligência: #1, #2, #3) → C6.2 (UX: #4, #5, #6) → C6.3 (Engajamento: #7, #8)
```

## Arquivos previstos

**Modificados:** `ComparePage.tsx`, `CompareTableView.tsx`, `useComparisonStore.ts`, `useComparisonShortcuts.ts`, `ExportComparisonButton.tsx`

**Criados:**
- `src/components/compare/ComparisonWeightsPopover.tsx` (#1)
- `src/components/compare/HistoricalPriceOverlay.tsx` (#2)
- `src/lib/pdf/whitelabel-comparison.ts` (#3)
- `src/components/compare/SortableColumnWrapper.tsx` (#4)
- `src/components/compare/FocusModeToggle.tsx` (#5)
- `src/components/compare/ImageZoomCell.tsx` (#6)
- `src/components/compare/ComparisonShortcutsCheatsheet.tsx` (#8)
- `supabase/functions/comparison-price-watcher/index.ts` (#7)

**Migrações DB:**
- Coluna `comparison_weights jsonb` em `user_preferences` (default pesos padrão)
- Cron diário 04:00 BR para `comparison-price-watcher`

**Memórias:**
- Atualizar `mem://features/catalog/comparison-system-spec` com Onda C6
- Atualizar `mem://features/keyboard-shortcuts-registry` com `F` (foco) e `Shift+?` (cheatsheet)

## Resultado final

Comparador continua 10/10, agora com **8 diferenciais competitivos extras** que elevam o módulo ao nível de ferramentas premium tipo Linear/Notion (cheatsheet, foco, drag-reorder, white-label, watcher proativo).

