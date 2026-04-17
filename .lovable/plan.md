
Busca semântica já está em 10/10 (15 entidades + cache LRU + re-rank pg_trgm + atalhos + telemetria + empty state inteligente). Próximo vetor de melhoria global do produto: **Inteligência Comercial & Insights Acionáveis** — aproveitar a telemetria de busca recém-adicionada + dados de orçamentos/pedidos para gerar valor visível ao vendedor.

## Sprint Próximo — Inteligência Acionável 10/10

### 1. Card "Demanda Reprimida" (Trends)
Consumir `search_analytics` (preenchido pela busca global) — top 10 termos com `results_count = 0` nos últimos 30 dias. Ação: "Adicionar ao catálogo" abre `/catalogo?q=termo`.

### 2. Card "Buscas Quentes" (Trends)
Top 10 termos mais buscados (com resultados) — proxy de interesse real. Comparar vs período anterior, mostrar Δ%.

### 3. Notificação proativa de orçamentos parados
Edge function diária (`pg_cron`) detecta orçamentos `status='enviado'` há 3+ dias sem interação → cria `workspace_notification` com CTA "Criar lembrete de follow-up".

### 4. Insight de margem no Quote Builder
Badge inline mostrando margem média do orçamento atual vs mediana histórica do vendedor. Verde se acima, âmbar se abaixo.

### 5. Sugestão de bundle no carrinho
Quando produto X é adicionado, RPC consulta `quote_items` históricos: "Vendedores que orçaram X também incluíram Y, Z (frequência ≥30%)". Card lateral com 1-clique pra adicionar.

### 6. Validação E2E
Browser: abrir `/tendencias`, verificar 2 novos cards. Abrir `Ctrl+K`, buscar termo inexistente, conferir que aparece em "Demanda Reprimida" após refresh. Conferir sugestão de bundle no carrinho.

### Arquivos
- **Novos:** `src/components/intelligence/UnmetDemandCard.tsx`, `src/components/intelligence/HotSearchesCard.tsx`, `src/components/quote/MarginInsightBadge.tsx`, `src/components/cart/BundleSuggestionCard.tsx`, `supabase/functions/detect-stalled-quotes/index.ts`
- **Editar:** `src/pages/TrendsPage.tsx`, `src/components/quote/QuoteBuilderSummary.tsx`, `src/components/cart/CartContent.tsx`
- **Migration:** RPC `get_unmet_demand(_days int)`, RPC `get_hot_searches(_days int)`, RPC `get_bundle_suggestions(_product_id uuid)`, pg_cron job para `detect-stalled-quotes`
- **Sem novas tabelas** (tudo reaproveita `search_analytics`, `quotes`, `quote_items`, `workspace_notifications`)
