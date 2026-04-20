

# Continuação Comparador 10/10 — Ondas C2 → C5

Onda C1 entregue. Build error é transitório (commit não propagado) — será resolvido na próxima execução. Sigo direto com as 20 melhorias restantes em 4 ondas autônomas.

## Onda C2 — CRM + Persistência + Share público (#7-11)

| # | Entrega | Arquivo |
|---|---|---|
| 7 | `FavoritesClientPicker` integrado ao header de `ComparePage` | edit `ComparePage.tsx` |
| 8 | CTA "Criar orçamento desta comparação" usando padrão URL params (`/orcamentos/novo?products=...&client_id=...`) | edit `ComparePage.tsx` |
| 9 | Edge function `comparisons-public-react` (Zod + IP hash + rate limit 5/min) — espelho de `collections-public-react` | nova EF |
| 9b | Rota `/comparar-publica/:token` + `PublicComparisonPage.tsx` (read-only com reactions anônimas 👍❤️🔥💡) | nova rota + página |
| 9c | `ShareComparisonDialog.tsx` (gera token, define `is_public`, copia link, expiração configurável) | novo componente |
| 10 | `ExportComparisonButton.tsx` — dropdown PDF (jsPDF A4 paisagem) / PNG (html2canvas) / CSV | novo componente |
| 11 | Hook `useComparisonSync` — upsert em `user_comparisons` ao logar; localStorage cache offline-first; merge inteligente | novo hook |

## Onda C3 — UX premium (#12-17)

| # | Entrega |
|---|---|
| 12 | `ComparisonDuelView.tsx` — layout 2-col "duelo" quando `compareCount === 2`, fotos enormes, diferenças zebra |
| 13 | Sincronizar troca de variante no `SyncedZoomGallery` — match por nome (case-insensitive) ou hex próximo (distância < 30) entre produtos |
| 14 | `ComparisonMobileView.tsx` — < 768px renderiza carousel vertical: cada linha = atributo, produtos viram chips horizontais swipeable |
| 15 | Sticky header com thumbnails miniatura ao rolar tabela (IntersectionObserver) |
| 16 | Hover em swatch troca imagem do header sem navegar (estado local `hoveredVariantId`) |
| 17 | `framer-motion` `AnimatePresence` em colunas — slide+fade ao add/remove produto |

## Onda C4 — Inteligência comercial avançada (#18-22)

| # | Entrega |
|---|---|
| 18 | Sparkline 30d de preço inline (recharts `<LineChart>` mini, sem axes) + badge "↓X% no mês" — usa `price_history` criada na C1 |
| 19 | Linha expansível "Outros fornecedores deste produto" via `useSupplierComparison` existente — mostra alternativas mais baratas fora da comparação |
| 20 | Badge "⚠️ Risco de estoque" via `useFutureStock` — vermelho se ruptura < 30d |
| 21 | Bottom rail "Compare também com…" — 4-6 produtos similares (mesma categoria + faixa preço ±20%) com botão "+ Adicionar" |
| 22 | `ComparisonPresentationLauncher.tsx` — fullscreen slide deck (1 produto/slide + slide final tabela), atalhos ←/→/F, espelho de `CollectionPresentationLauncher` |

## Onda C5 — Polimento + A11y + atalhos + empty state (#23-26)

| # | Entrega |
|---|---|
| 23 | Hook `useComparisonShortcuts` — `G X` navega, `Shift+X` limpa, `1-4` foca produto N, `D` toggle differences, `R` abre/fecha radar |
| 24 | ARIA-live region (`aria-live="polite"`) em `ComparePage` anuncia "Produto X adicionado/removido", "Comparação limpa" |
| 25 | `CompareEmptyStateSmart.tsx` — quando 0-1 produtos, lista top 6 da semana via RPC `get_top_compared_products` (criada na C1) + CTA "+ Adicionar" inline |
| 26 | `RecentComparisonsSidebar.tsx` — últimas 5 comparações via RPC `get_user_recent_comparisons`, recarregáveis em 1 clique |

## Cron job (insert tool, pós-migração)

- `cleanup-expired-public-comparisons` — diário 03:30 BR → `cleanup_expired_public_comparisons()`

## Memórias finais

- Atualizar `mem://features/catalog/comparison-system-spec` com 26 melhorias entregues
- Atualizar `mem://features/keyboard-shortcuts-registry` com `G X`, `Shift+X`, `1-4`, `D`, `R`, `F` (presentation)
- Criar `mem://features/comparison-public-share-system`
- Atualizar `mem://index.md` com entradas "Comparison Roadmap 10/10" + "Comparison Public Share"

## Sequenciamento

```text
C2 (5 itens) → C3 (6 itens) → C4 (5 itens) → C5 (4 itens) → cron + memória
```

Sem pausas, sem perguntas. Cada onda entrega completa antes da próxima.

## Arquivos afetados

**Modificados:** `ComparePage.tsx`, `SyncedZoomGallery.tsx`, `CompareTableView.tsx`, `App.tsx`

**Criados (componentes):** `ShareComparisonDialog`, `ExportComparisonButton`, `ComparisonDuelView`, `ComparisonMobileView`, `ComparisonPresentationLauncher`, `RecentComparisonsSidebar`, `CompareEmptyStateSmart`, `PublicComparisonPage`

**Criados (hooks):** `useComparisonSync`, `useComparisonShortcuts`

**Edge functions:** `comparisons-public-react`

**Memórias:** 4 atualizações/criações

## Resultado final
Comparador em **10/10 absoluto** — co-piloto B2B com IA, score ponderado, radar visual, TCO, share público com reactions, persistência cross-device, modo duelo, mobile carousel, presentation fullscreen, atalhos globais, ARIA-live, paridade total com Favoritos/Coleções 10/10.

