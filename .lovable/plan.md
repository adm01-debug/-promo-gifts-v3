

# Comparador de Produtos 10/10 — Execução Onda C completa

Execução autônoma das **26 melhorias** em 5 ondas sequenciais, sem pausas, conforme `mem://~user`. Cada onda entrega completa (DB + edge function + componente + integração + memória) antes da próxima.

## Sequenciamento

```text
C1 (Inteligência decisão #1-6)
  → C2 (CRM + Share + Persistência #7-11)
  → C3 (UX premium #12-17)
  → C4 (Inteligência comercial #18-22)
  → C5 (Polimento + atalhos #23-26)
  → Memória final
```

## Onda C1 — Inteligência de decisão

| # | Entrega | Arquivo |
|---|---|---|
| 1 | `useComparisonScore.ts` — score ponderado (preço 35% + estoque 20% + qtd mín 15% + cores 10% + verificado 10% + lead time 10%) com pesos ajustáveis via popover | hook novo |
| 2 | `ComparisonRadarChart.tsx` (recharts) — eixos: preço, estoque, variedade cores, qtd mín invertida, lead time | componente novo |
| 3 | TCO — coluna "Custo total na qtd mín" em `CompareTableView.tsx` | edit |
| 4 | Highlight expandido em 8 linhas (estoque, lead time, cores, materiais, peso, dimensões, MOQ, verificado) | edit `CompareTableView` |
| 5 | Toggle "Differences only" — chip que oculta linhas idênticas | edit `ComparePage` + `CompareTableView` |
| 6 | `AIComparisonAdvisor.tsx` + edge function `comparison-ai-advisor` (Lovable AI Gateway, `google/gemini-2.5-flash`, cache sessionStorage 30min) | componente + EF nova |

## Onda C2 — CRM + Persistência cross-device + Share público

| # | Entrega |
|---|---|
| 7 | `FavoritesClientPicker` no header de `ComparePage` |
| 8 | CTA "Criar orçamento desta comparação" passando `client_id`/`client_name` + produtos via URL params padrão |
| 9 | Migration: tabelas `user_comparisons` (id, user_id, client_id, items jsonb, share_token, is_public, share_expires_at) e `comparison_reactions` (mesmo padrão favorites). RLS + trigger `move_*_to_trash` opcional |
| 9b | Edge function `comparisons-public-react` (Zod + rate limit 5/min/IP + IP hash) |
| 9c | Rota `/comparar-publica/:token` registrada em `App.tsx` + `PublicComparisonPage.tsx` |
| 10 | `ExportComparisonButton.tsx` — dropdown PDF (jsPDF A4 paisagem) / PNG (html2canvas da galeria) / CSV |
| 11 | Hook `useComparisonSync` — upsert em `user_comparisons` ao logar; localStorage como cache offline-first; merge inteligente |

## Onda C3 — UX/Visualização premium

| # | Entrega |
|---|---|
| 12 | `ComparisonDuelView.tsx` — layout 2-col tipo "duelo" quando `compareCount === 2` |
| 13 | Sincronizar troca de variante no `SyncedZoomGallery` — match por nome/hex próximo |
| 14 | `ComparisonMobileView.tsx` — carousel vertical de atributos < 768px |
| 15 | Sticky header com thumbnails miniatura ao rolar a tabela |
| 16 | Hover swatch troca imagem do header (sem navegar) |
| 17 | `framer-motion` `AnimatePresence` para colunas (slide+fade) ao add/remove |

## Onda C4 — Inteligência comercial avançada

| # | Entrega |
|---|---|
| 18 | Sparkline 30d de preço inline (recharts mini) + badge "↓X% no mês" — usa `price_history` (cria tabela se ausente) |
| 19 | Linha expansível "Outros fornecedores deste produto" via `useSupplierComparison` existente |
| 20 | Badge "Risco de estoque" usando `useFutureStock` — vermelho se ruptura < 30d |
| 21 | Bottom rail "Compare também com…" — 4-6 produtos similares com `+ Adicionar` |
| 22 | `ComparisonPresentationLauncher.tsx` — fullscreen slide deck + slide final com tabela; espelho de `CollectionPresentationLauncher` |

## Onda C5 — Polimento, A11y, atalhos, empty state

| # | Entrega |
|---|---|
| 23 | `useComparisonShortcuts.ts` — `G X` navega, `Shift+X` limpa, `1-4` foca produto N, `D` toggle differences, `R` abre radar |
| 24 | ARIA-live region em `ComparePage` para anúncios add/remove/clear |
| 25 | Empty state inteligente quando 0-1 produtos — top 6 da semana via RPC `get_top_compared_products` (criar) + CTA "+ Adicionar" |
| 26 | `RecentComparisonsSidebar.tsx` — últimas 5 comparações recarregáveis em 1 clique |

## Cron jobs (insert tool)

- `cleanup-expired-public-comparisons` — diário 03:30 BR → RPC `cleanup_expired_public_comparisons()`

## Memórias finais

- Atualizar `mem://features/catalog/comparison-system-spec` com 26 melhorias
- Atualizar `mem://features/keyboard-shortcuts-registry` com `G X`, `Shift+X`, `1-4`, `D`, `R`
- Criar `mem://features/comparison-public-share-system`
- Atualizar `mem://index.md` com entradas "Comparison Roadmap 10/10" e "Comparison Public Share"

## Arquivos afetados

**Modificados:** `src/pages/ComparePage.tsx`, `src/components/compare/CompareTableView.tsx`, `src/components/compare/FloatingCompareBar.tsx`, `src/components/compare/SyncedZoomGallery.tsx`, `src/stores/useComparisonStore.ts`, `src/App.tsx`

**Criados (componentes):**
- `src/components/compare/ComparisonScoreCard.tsx`
- `src/components/compare/ComparisonRadarChart.tsx`
- `src/components/compare/AIComparisonAdvisor.tsx`
- `src/components/compare/ShareComparisonDialog.tsx`
- `src/components/compare/ExportComparisonButton.tsx`
- `src/components/compare/ComparisonDuelView.tsx`
- `src/components/compare/ComparisonMobileView.tsx`
- `src/components/compare/ComparisonPresentationLauncher.tsx`
- `src/components/compare/RecentComparisonsSidebar.tsx`
- `src/components/compare/CompareEmptyStateSmart.tsx`
- `src/pages/PublicComparisonPage.tsx`

**Criados (hooks):**
- `src/hooks/useComparisonScore.ts`
- `src/hooks/useComparisonShortcuts.ts`
- `src/hooks/useComparisonSync.ts`

**Edge functions:**
- `supabase/functions/comparison-ai-advisor/index.ts`
- `supabase/functions/comparisons-public-react/index.ts`

**DB (migration):** tabelas `user_comparisons`, `comparison_reactions`, `price_history` (se ausente); RPCs `cleanup_expired_public_comparisons`, `get_top_compared_products`, `get_user_recent_comparisons`; RLS completa.

**DB (insert tool):** cron `cleanup-expired-public-comparisons` 03:30 BR.

## Resultado final
Comparador de produtos em **10/10 absoluto** — co-piloto de decisão B2B com IA, score ponderado, radar visual, TCO, share público com reactions, persistência cross-device, modo duelo, mobile-first, atalhos globais, ARIA-live, paridade total com Favoritos/Coleções já em 10/10.

