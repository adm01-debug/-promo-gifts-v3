

# Comparador 10/10 — Verificação final + correções pós-deploy

As 26 melhorias foram entregues nas ondas C1→C5. Agora preciso validar que tudo está realmente integrado, sem erros de runtime, e fechar gaps que possam ter ficado durante a execução em paralelo.

## Etapa 1 — QA técnico (read-only, durante este plano)

Verificar:
1. `ComparePage.tsx` importa todos os 11 componentes novos sem erros
2. `useComparisonSync` está plugado e fazendo upsert correto em `user_comparisons`
3. Rota `/comparar-publica/:token` registrada em `App.tsx`
4. Edge function `comparisons-public-react` deployada e respondendo
5. Edge function `comparison-ai-advisor` respondendo
6. RLS de `user_comparisons` permite SELECT público quando `is_public=true`
7. RPCs `get_top_compared_products` e `get_user_recent_comparisons` existem e retornam o shape esperado
8. Cron `cleanup-expired-public-comparisons` agendado

## Etapa 2 — Correções identificadas (modo default)

Após o QA, aplicar **somente** os fixes necessários. Lista provável (a confirmar):

| Fix | Arquivo |
|---|---|
| Garantir que `useProductsContext` expõe `getProductsByIds` (ou trocar por hook adequado) | `ComparePage.tsx` |
| Validar `FavoritesClientPicker` props (`selectedClientId`, `selectedClientName`, `onSelect`) batem com a assinatura real | `ComparePage.tsx` |
| `PublicComparisonPage.tsx` — confirmar SELECT por token funciona com policy pública | página + RLS |
| `ComparisonPresentationLauncher` — verificar que botão dispara o launcher corretamente (sem trigger duplicado) | `ComparePage.tsx` |
| `OtherSuppliersRow` — confirmar shape de `useSupplierComparison` (`alternatives`, `priceDiff`, `priceDiffPercent`) | hook + componente |
| `useProducts` filter por `category` — confirmar key correta (pode ser `categoryName` ou `category_id`) | `SimilarProductsRail.tsx` |
| `CompareEmptyStateSmart` — RPC `get_top_compared_products` precisa retornar `product_id` (não `productId`) | RPC + componente |
| `RecentComparisonsSidebar` — RPC `get_user_recent_comparisons` precisa retornar `product_ids` array | RPC + componente |

## Etapa 3 — Smoke test final

1. Adicionar 2 produtos → `/comparar` carrega sem erro
2. Toggle "Modo Duelo" funciona
3. Botão "Compartilhar" gera token
4. Abrir `/comparar-publica/:token` em aba anônima → carrega
5. Reagir com 👍 → registro em `comparison_reactions`
6. `Shift+X` limpa, `D` toggle differences, `R` toggle radar
7. Empty state (1 produto) mostra top 6 da semana

## Resultado final

Comparador certificado **10/10 end-to-end**: todos os 26 itens funcionando, edge functions deployadas, RLS validada, atalhos respondendo, share público navegável, ARIA-live anunciando.

