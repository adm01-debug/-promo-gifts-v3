
A última onda (Pós-10/10 do Kit Library) foi concluída integralmente — 8/8 itens entregues, build TS limpo. Não há lista pendente explícita.

Proponho a próxima onda autônoma, focada nos gaps reais que ainda separam o Kit Maker de um produto "11/10": colaboração, inteligência e métricas.

# Plano: Kit Maker — Onda Inteligência & Colaboração (8 itens)

## Onda A — Inteligência aplicada
1. **Sugestão automática de tag/cor por IA** — ao salvar kit sem identidade, sugerir `tag` + `color` baseado no nome/items via Lovable AI (`gemini-2.5-flash-lite`), com botão "Aplicar sugestão".
2. **"Kits semelhantes" no Builder** — sidebar mostra 3 templates com items em comum (≥30% overlap por SKU) para inspiração rápida.
3. **Detector de duplicatas** — ao salvar, comparar com `custom_kits` do usuário e avisar se ≥80% similar a um kit existente ("Você já tem 'Kit Onboarding Q4' parecido — atualizar em vez de criar novo?").

## Onda B — Colaboração & compartilhamento
4. **Link público read-only do kit** — gerar token (`kit_share_tokens`) que abre `/kit/publico/:token` mostrando ficha sem preço de custo, ideal para mandar pro cliente preview.
5. **Comentários internos no kit** — `kit_comments` (kit_id, user_id, body, created_at) com painel lateral; visível para todos vendedores do mesmo kit (admin vê todos).

## Onda C — Métricas & adoção
6. **Dashboard `/admin/kit-templates/metricas`** — tabela com `usage_count`, `last_cloned_at`, taxa de conversão (templates clonados → kits salvos completos → orçamento aprovado).
7. **Heatmap de items mais usados** — top 20 produtos que aparecem em mais kits (cross-user para admin, próprio para vendedor) com link para adicionar ao kit atual.

## Onda D — Polimento final
8. **PageSEO + OG image dinâmica** para `/kit/publico/:token` (renderiza preview com cor de identidade); validação TS final + atualizar `mem://features/kit-library-system`.

## Migrações esperadas
- `kit_share_tokens` (id, kit_id, token unique, created_by, expires_at, view_count)
- `kit_comments` (id, kit_id, user_id, body, created_at)
- RLS: token público read-only via RPC `get_kit_by_token`; comments só do mesmo workspace.

## Arquivos novos esperados
`useKitIdentitySuggestion.ts`, `useSimilarKits.ts`, `useDuplicateKitDetector.ts`, `KitShareLinkDialog.tsx`, `KitCommentsPanel.tsx`, `PublicKitView.tsx`, `KitTemplatesMetricsPage.tsx`, `KitItemsHeatmap.tsx`, edge function `kit-identity-suggest`.

Após aprovação executo os 8 itens sequencialmente sem pausas até o build limpo final.
