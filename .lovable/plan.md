

# Comparador 10/10 — Wiring C3 + Ondas C4 + C5 (final)

C1 e C2 entregues. Componentes da C3 já criados (Duel, Mobile, Presentation, variant-matching). Falta o **wiring** na `ComparePage` + tudo de C4 e C5.

## Etapa 1 — Wiring Onda C3 (#12, #14, #15, #16, #17)

| # | Ação | Arquivo |
|---|---|---|
| 12 | Renderizar `ComparisonDuelView` quando `compareCount === 2` (toggle "Modo Duelo / Tabela") | edit `ComparePage.tsx` |
| 14 | Renderizar `ComparisonMobileView` em `<768px` (Tailwind `md:hidden` na tabela, `md:hidden` invertido no mobile) | edit `ComparePage.tsx` |
| 15 | Sticky thumbnails header — IntersectionObserver no topo da tabela; mini-cards fixos com nome + foto | edit `CompareTableView.tsx` |
| 16 | Hover em swatch troca foto do header (estado `hoveredVariantId`) | edit `CompareTableView.tsx` |
| 17 | `framer-motion` `AnimatePresence` envolvendo as colunas — `layout` + `initial/animate/exit` (slide+fade) | edit `CompareTableView.tsx` |
| 13 | Aplicar `findMatchingColorIndex` ao trocar variante na galeria — propaga para os outros produtos | edit `SyncedZoomGallery.tsx` |

## Etapa 2 — Onda C4 — Inteligência comercial (#18-22)

| # | Entrega | Arquivo |
|---|---|---|
| 18 | `PriceSparkline.tsx` — recharts `<LineChart>` mini (60×24, sem axes), badge "↓X% no mês" baseado em `price_history` | novo + edit `CompareTableView` |
| 19 | `OtherSuppliersRow.tsx` — linha expansível usando `useSupplierComparison` existente | novo + edit `CompareTableView` |
| 20 | `StockRiskBadge.tsx` — usa `useFutureStock`, vermelho se ruptura < 30d | novo + edit `CompareTableView` |
| 21 | `SimilarProductsRail.tsx` — bottom rail 4-6 produtos (mesma categoria + preço ±20%) com botão "+ Adicionar" | novo + integra em `ComparePage` |
| 22 | Botão "▶ Apresentar" no header de `ComparePage` que abre `ComparisonPresentationLauncher` (já criado) | edit `ComparePage.tsx` |

## Etapa 3 — Onda C5 — Polimento + A11y + atalhos + empty state (#23-26)

| # | Entrega | Arquivo |
|---|---|---|
| 23 | `useComparisonShortcuts.ts` — `G X` navega `/comparar`, `Shift+X` limpa, `1-4` foca produto N (scrollIntoView), `D` toggle differences, `R` toggle radar, `?` abre cheatsheet | novo hook + integra em `App.tsx` ou `Layout` |
| 24 | ARIA-live `<div aria-live="polite" aria-atomic="true" className="sr-only">` em `ComparePage` — anuncia add/remove/clear | edit `ComparePage.tsx` |
| 25 | `CompareEmptyStateSmart.tsx` — quando 0-1 produtos, lista top 6 via RPC `get_top_compared_products` (já criada na C1) + CTA "+ Adicionar" inline | novo + integra em `ComparePage` |
| 26 | `RecentComparisonsSidebar.tsx` — `Sheet` lateral disparado por botão "🕒 Recentes" no header; usa RPC `get_user_recent_comparisons` (já criada na C1); restaura ao clicar | novo + integra em `ComparePage` |

## Etapa 4 — Cron job (insert tool, não migration)

```sql
select cron.schedule(
  'cleanup-expired-public-comparisons',
  '30 6 * * *',  -- 03:30 BR (UTC-3)
  $$ select public.cleanup_expired_public_comparisons(); $$
);
```

## Etapa 5 — Memórias (atualização final)

- **Atualizar** `mem://features/catalog/comparison-system-spec` — adicionar bloco "Roadmap 10/10 entregue" com as 26 melhorias resumidas
- **Atualizar** `mem://features/keyboard-shortcuts-registry` — adicionar `G X`, `Shift+X`, `1-4`, `D`, `R`, `F` (presentation)
- **Criar** `mem://features/comparison-public-share-system` — espelho de `favorites-public-share-system` (token, RLS por token público, edge function reactions)
- **Atualizar** `mem://index.md` — adicionar 2 entradas: "Comparison Roadmap 10/10" + "Comparison Public Share"

## Arquivos afetados

**Modificados:** `ComparePage.tsx`, `CompareTableView.tsx`, `SyncedZoomGallery.tsx`

**Criados (componentes):** `PriceSparkline`, `OtherSuppliersRow`, `StockRiskBadge`, `SimilarProductsRail`, `CompareEmptyStateSmart`, `RecentComparisonsSidebar`

**Criados (hooks):** `useComparisonShortcuts`

**Cron:** `cleanup-expired-public-comparisons` (pg_cron via insert tool)

**Memórias:** 4 atualizações/criações

## Sequenciamento

```text
Etapa 1 (wiring C3) → Etapa 2 (C4 5 itens) → Etapa 3 (C5 4 itens) → Etapa 4 (cron) → Etapa 5 (memória)
```

Sem pausas, sem perguntas. Execução completa até paridade absoluta com Favoritos/Coleções 10/10.

## Resultado final
Comparador em **10/10 absoluto** — co-piloto B2B com IA, score ponderado, radar visual, TCO, share público com reactions, persistência cross-device, modo duelo, mobile carousel, sticky thumbs, hover preview, animações suaves, sparkline 30d, risco de estoque, sugestões similares, presentation fullscreen, atalhos globais, ARIA-live, empty state inteligente, sidebar de recentes.

