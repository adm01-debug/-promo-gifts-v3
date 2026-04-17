
# BI 10/10 — Refinamentos finais do eixo CATEGORIA (Onda 6)

A pivotagem para CATEGORIAS já foi entregue: `ClientCategoryRadar` (protagonista), `categoryResolver` central, hooks `useClientCategoryAffinity` + `useIndustryCategoryTrends`, integrações no Hero, Lookalikes, IndustryTrending e Affinity. Build verde.

Para fechar o 10/10 com excelência **mantendo o foco em CATEGORIA**, restam 6 refinamentos identificados:

## Itens a executar (1 a 1, sem pausas)

1. **Tendência 90d vs 90d anteriores em `useClientCategoryAffinity`** — calcular delta % por categoria; expor `trend: "up" | "down" | "stable"` e `deltaPct`. Renderizar setas no `ClientCategoryRadar` (↑ verde / ↓ vermelho ao lado do label).

2. **Filtro de categoria no `BundleSuggestions`** — contextualizar título "Combos para a categoria favorita: [X]". Adicionar dropdown para o vendedor escolher outra categoria. Cruzar com `useClientCategoryAffinity.favorite`.

3. **Coluna "Categoria" na `EnrichedOrdersTimeline`** — para cada pedido, derivar categoria dominante via `resolveBICategory` sobre os itens; badge colorida ao lado da data ("📦 Garrafas — 67% do pedido").

4. **Categorias no `BIBriefingMode` mobile** — adicionar bloco "Categorias-chave" entre Health Score e talking points: top 2 favoritas + 1 oportunidade GAP. Usuário leva pra reunião o que falar.

5. **Categoria no `ClientComparator`** — coluna "Categoria favorita" + "Categoria oportunidade" lado-a-lado entre os 3 clientes comparados.

6. **Export do dossiê com categoria** — incluir seção "Mapa de categorias" no PDF/PPTX (`buildExecutiveSummary`): tabela cliente vs setor + lista de GAPs prioritários. Página pública (`PublicDossierPage`) também.

## Detalhes técnicos
- **Trend 90d**: dividir `get_client_top_products` em 2 RPC calls (com `_days=90` e janela anterior) ou pós-processar `last_quoted_at` se já vier; preferir pós-processamento para evitar nova RPC.
- **Categoria do pedido**: agregar `quote_items.product_name` por pedido → `resolveBICategory` → maior peso por receita.
- **Briefing**: bloco compacto `<CategoryBriefBlock>` reusando `useClientCategoryAffinity` (cache compartilhado).
- **Comparator**: estender `useClientsComparison` para chamar `useClientCategoryAffinity` por cliente.
- **Dossiê**: nova função `buildCategorySection()` em `src/lib/bi/executive-summary.ts`; PDF (jsPDF autoTable) + PPTX (pptxgenjs table).

## Arquivos
**Editar:**
- `src/hooks/bi/useClientCategoryAffinity.ts` (delta 90d)
- `src/components/bi/ClientCategoryRadar.tsx` (setas de tendência)
- `src/components/bi/BundleSuggestions.tsx` (dropdown categoria)
- `src/components/bi/EnrichedOrdersTimeline.tsx` (badge categoria)
- `src/components/bi/BIBriefingMode.tsx` (bloco categorias)
- `src/components/bi/ClientComparator.tsx` (colunas categoria)
- `src/hooks/bi/useClientsComparison.ts` (incluir cats)
- `src/lib/bi/executive-summary.ts` (seção categoria PDF/PPTX)
- `src/pages/PublicDossierPage.tsx` (render seção categoria)

Sem mudanças de schema. Sem novas edge functions. ~9 arquivos tocados, 6 itens atômicos.

Aprovar → executo os 6 itens em sequência sem perguntar.
