

# Finalização paridade Coleções 10/10 — Wiring + cron

Estado: Onda P (P1→P4) entregue na rodada anterior — migrações, edge functions, hooks e componentes criados. Faltam **integrações finais na UI + agendamento dos crons** para módulo ficar 100% funcional end-to-end.

## Pendências identificadas

| # | Pendência | Origem |
|---|---|---|
| 1 | Rota `/colecao-publica/:token` registrada em `App.tsx`? Verificar | P3 |
| 2 | `CollectionFormDialog` ainda não usa `FavoritesClientPicker` (CRM) | P3 |
| 3 | `CollectionDetailHeader` não integra `ExportCollectionButton` nem `CollectionPresentationLauncher` | P3/P4 |
| 4 | `SortableProductItem` não exibe `PriceDropBadge` | P2 |
| 5 | Filtro chip "Só com queda" ausente em `CollectionDetailPage` | P2 |
| 6 | `CollectionsPage` não renderiza `CollectionsHeatmap` nem `CollectionsEmptyStateSmart` | P4 |
| 7 | `useCollectionsGlobalShortcuts` criado mas não chamado em `App.tsx` ou layout | P4 |
| 8 | ARIA-live region em `CollectionDetailPage` para anúncios de remoção/restore | P1/A11y |
| 9 | Cron jobs `collections-watcher-daily` (06:00 BR) + `cleanup-collections-trash-daily` (03:00 BR) — **não agendados via insert tool** | P1/P2 |
| 10 | Memórias finais: atualizar `mem://index.md` com referência ao roadmap de Coleções + criar `mem://features/collections-public-share-system.md` | docs |

## Plano de execução autônoma sequencial

### Etapa 1 — Verificar e registrar rota pública
- Conferir `src/App.tsx`. Se ausente, adicionar `<Route path="/colecao-publica/:token" element={<PublicCollectionPage />} />` fora do `AuthLayout` com `lazyWithRetry`.

### Etapa 2 — `CollectionFormDialog` ganha `FavoritesClientPicker`
- Importar `FavoritesClientPicker` (genérico) e adicionar campo "Vincular cliente CRM (opcional)".
- Persistir `client_id` + `client_name` em `collections` via `updateCollection`/`createCollection`.
- Renderizar badge cliente em `CollectionDetailHeader` (já tem espaço no slot de info).

### Etapa 3 — Integrar `ExportCollectionButton` + `CollectionPresentationLauncher` no header
- `CollectionDetailHeader` recebe novos slots `onExport` e o botão "Apresentar" passa a abrir o launcher fullscreen real (substitui placeholder `onPresent`).
- Gerar `share_token` on-demand quando cliente clica em "Compartilhar publicamente" → toast com URL `/colecao-publica/:token`.

### Etapa 4 — `PriceDropBadge` + filtro "Só com queda"
- Em `SortableProductItem`, comparar `product.price` (atual) vs `item.price_at_save` — se queda ≥5%, renderizar `PriceDropBadge` (reusar do favoritos).
- `CollectionDetailPage`: chip toggle "Só com queda" no header de filtros, filtra `items` antes de renderizar a lista.

### Etapa 5 — `CollectionsPage` ganha heatmap + smart empty state
- `CollectionsHeatmap` renderizado no header da grid (sparkline 8 semanas via RPC).
- Quando `collections.length === 0`, renderizar `CollectionsEmptyStateSmart` com top 6 produtos da semana + CTA "criar coleção com este produto".

### Etapa 6 — Atalhos globais
- Chamar `useCollectionsGlobalShortcuts()` em `src/components/layout/AdminLayout.tsx` (ou layout equivalente que envolve rotas autenticadas) para `G C` e `Shift+C` funcionarem em qualquer página.

### Etapa 7 — ARIA-live region
- `CollectionDetailPage`: `<div role="status" aria-live="polite" className="sr-only">{lastAnnouncement}</div>` atualizado em remove/restore/add.

### Etapa 8 — Agendar cron jobs (insert tool, não migration)
- `cleanup-collections-trash-daily` — diário 03:00 BR → chama RPC `cleanup_expired_collection_trash()`.
- `collections-watcher-daily` — diário 06:00 BR → invoca edge function `collections-watcher`.
- Ambos com `pg_cron` + `pg_net` usando URL real do projeto e anon key.

### Etapa 9 — Atualização de memórias
- Criar `mem://features/collections-public-share-system.md` (espelha favorites-public-share-system).
- Atualizar `mem://features/keyboard-shortcuts-registry` adicionando `G C` + `Shift+C`.
- Atualizar `mem://index.md`: adicionar entrada "Collections Roadmap 10/10" e "Collections Public Share".

## Sequenciamento

```text
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (cron via insert) → 9 (memória)
```

Sem pausas. Sem perguntas. Cada etapa entrega completa antes da próxima.

## Arquivos afetados

**Modificados:**
- `src/App.tsx` (etapa 1, se necessário)
- `src/components/collections/CollectionFormDialog.tsx` (etapa 2)
- `src/components/collections/CollectionDetailHeader.tsx` (etapas 2, 3)
- `src/components/collections/SortableProductItem.tsx` (etapa 4)
- `src/pages/CollectionDetailPage.tsx` (etapas 3, 4, 7)
- `src/pages/CollectionsPage.tsx` (etapa 5)
- `src/components/layout/AdminLayout.tsx` ou equivalente (etapa 6)
- `mem://index.md`, `mem://features/keyboard-shortcuts-registry` (etapa 9)

**Criados:**
- `mem://features/collections-public-share-system.md` (etapa 9)

**Operações DB (insert tool):**
- 2 cron jobs via `cron.schedule`

## Resultado final
Módulo Coleções em **paridade absoluta 10/10 com Favoritos** — todas as 11 melhorias da Onda P funcionando end-to-end com UI integrada, atalhos globais, cron jobs agendados e memória consolidada.

