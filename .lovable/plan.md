

# Finalização Onda C + D — Favoritos 10/10

Estado: 8 de 11 melhorias entregues na rodada anterior. Faltam **3 integrações finais + 3 melhorias** para fechar o módulo em 10/10.

## Pendências identificadas

1. **C4 (rota pública)** — `PublicFavoriteListPage.tsx` existe mas não está registrada em `App.tsx`
2. **C2 (CRM)** — `EditListDialog` não criado; sidebar não permite editar lista existente
3. **C3 (apresentação)** — `FavoritePresentationLauncher` existe mas não está conectado ao header
4. **D1 (undo toast)** — `useUndoStack` criado mas `removeItem` não dispara toast com restore
5. **D2 (export)** — `ExportFavoritesButton` existe mas não está no header
6. **D3 (atalhos)** — `F`/`G L` não registrados globalmente
7. **D4 (empty state smart)** — componente existe mas não está renderizado
8. **D5 (heatmap)** — componente existe mas não está renderizado
9. **D6 (multi-variantes)** — falta UX no `QuickListPicker` mostrando variante atual
10. **D7 (a11y mobile)** — swipe-to-delete + long-press + aria-live region

## Plano de execução autônoma sequencial

### Etapa 1 — Wiring completo no `FavoritesPage.tsx`
- Importar e usar `useUndoStack`, `useFavoritesGlobalShortcuts`
- Renderizar `FavoritesHeatmap` no header (já passado via prop)
- Renderizar `FavoritesEmptyStateSmart` quando lista vazia
- Aria-live region `<div aria-live="polite" className="sr-only">` para anúncios

### Etapa 2 — Registrar rota pública
- Adicionar `<Route path="/lista-publica/:token" element={<PublicFavoriteListPage />} />` em `App.tsx` fora do `AuthLayout`
- Lazy import com `lazyWithRetry`

### Etapa 3 — `EditListDialog` + integração na sidebar
- Reusar `CreateListDialog` com prop `existing` (já suportado parcialmente)
- Adicionar botão "Editar" no menu da sidebar de cada lista
- Permite mudar nome, cor, cliente CRM vinculado

### Etapa 4 — Toast undo no `removeItem`
- `useFavoriteListItems.removeItem` chama `showUndoToast` com callback `restoreFromTrash`
- Push para `useUndoStack` para suporte `Cmd+Z`

### Etapa 5 — Conectar `FavoritePresentationLauncher` + `ExportFavoritesButton`
- Já passados via props no `FavoritesViewHeader` mas precisam ativação completa do modo apresentação fullscreen
- Garantir botões visíveis no header

### Etapa 6 — Hook `useFavoritesGlobalShortcuts`
- Listener `keydown`: tecla `F` (sem foco em input) abre `QuickListPicker` no produto hovered
- Sequência `G` depois `L` em até 800ms navega para `/favoritos`
- Registrar atalhos em `mem://features/keyboard-shortcuts-registry`

### Etapa 7 — D6 Multi-variantes no `QuickListPicker`
- Header do popover mostra swatch da cor + nome da variante atual
- Texto: "Adicionando: Camiseta X — Azul Marinho"

### Etapa 8 — D7 Mobile polish
- Swipe gesture com `framer-motion` em items de lista (mobile only)
- Long-press → action sheet com `Sheet` (mover/anotar/remover)
- Touch targets ≥44px confirmados
- Skeletons sofisticados

### Etapa 9 — Atualização de memória
- `mem://features/favorites-roadmap.md` → marcar Ondas C + D como ✅ completas
- `mem://features/keyboard-shortcuts-registry` → adicionar `F`, `G L`, `Shift+click`
- Nova memória `mem://features/favorites-public-share-system` documentando rota pública + reactions

## Sequenciamento

```text
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 (memória final)
```

Sem pausas. Sem perguntas. Cada etapa entrega completa antes da próxima.

## Arquivos afetados

**Modificados:**
- `src/pages/FavoritesPage.tsx` (etapas 1, 4, 8)
- `src/App.tsx` (etapa 2)
- `src/components/favorites/FavoriteListsSidebar.tsx` (etapa 3 — botão editar)
- `src/components/favorites/CreateListDialog.tsx` (etapa 3 — modo edit)
- `src/hooks/useFavoriteLists.ts` (etapa 4 — toast undo)
- `src/components/favorites/QuickListPicker.tsx` (etapa 7)

**Criados:**
- `src/hooks/useFavoritesGlobalShortcuts.ts` (etapa 6)
- `src/components/favorites/FavoriteItemSwipeable.tsx` (etapa 8)
- `src/components/favorites/FavoriteItemLongPressSheet.tsx` (etapa 8)

**Memórias:**
- Atualizar `favorites-roadmap.md` e `keyboard-shortcuts-registry`
- Criar `favorites-public-share-system.md`

Resultado: módulo Favoritos em **10/10 absoluto** com todas as 17 melhorias das 4 ondas entregues e funcionando end-to-end.

