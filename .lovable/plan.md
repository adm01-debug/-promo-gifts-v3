
# Finalização Sprint 2 + 3 + Polish — BI 10/10

Continuação direta da execução autônoma. Já entregue: Health Hero, Churn Banner, Timeline enriquecida, Bundle, Lookalikes, Executive Summary + PPTX, integração na página.

## Restantes (executar 1 a 1, sem pausas)

### Sprint 2 final
1. **Gap analysis em `IndustryTrendingProducts`** — coluna "Cliente já compra?" (✓/✗) + filtro toggle "Só oportunidades" + top 3 viram hero cards com imagem maior e projeção de receita. Cruzar com `useClientAffinity`.
2. **Share-of-Wallet em `ClientVsIndustryComparison`** — 5ª métrica clicável: `clienteLTV / (clienteLTV + avgSetorLTV*1.5)` capped 5–95%, com gap em R$ ("R$ X não capturado").

### Sprint 3 final
3. **Toggle "Trimestre atual vs anterior" em `ClientOverview360`** — switch no header das KPIs, variação % com setas verde/vermelho ao lado de LTV, ticket, frequência.
4. **Sazonalidade preditiva em `ClientSeasonalityHeatmap`** — usar `projectForecast` de `src/lib/forecast.ts` (já existe) sobre série mensal, renderizar linha pontilhada para próximos 6 meses + card lateral "Próxima janela ideal: [mês]" com CTA "Agendar follow-up".

### Polish (Onda 4)
5. **Sistema cromático semântico aplicado** — varrer componentes BI e padronizar: verde=saúde/oportunidade, âmbar=atenção, vermelho=risco, violeta=sazonalidade, azul=info. Substituir badges amarelas "Simulado" por cinza discreto.
6. **Skeletons com forma das zonas** — substituir `Skeleton h-32` genérico por estruturas que espelham o layout final (hero, timeline com dots, grid de produtos) reduzindo CLS percebido.

## Detalhes técnicos
- **Gap analysis**: `clientAlreadyBuys = new Set(affinity.products.map(p => p.productId))`; passar como prop ao `IndustryTrendingProducts`.
- **Share-of-wallet**: já há heurística no plano anterior; reaproveitar `useClientVsIndustry` data.
- **Toggle temporal**: dividir `useClientBI` em buckets de 90d (atual) vs 90d anteriores; calcular delta %.
- **Predictive seasonality**: `linearRegression` sobre 12 meses → projetar 6; Recharts `LineChart` com `strokeDasharray` para forecast.
- **Cromática**: tokens já existem em `index.css` (--success, --warning, --destructive); só substituir classes `text-amber-*` hardcoded por `text-warning` semantic.
- **Skeletons**: criar `BISkeletons.tsx` com 5-6 variantes (HeroSkeleton, TimelineSkeleton, GridSkeleton, HeatmapSkeleton).

## Arquivos
**Editar:** `IndustryTrendingProducts.tsx`, `ClientVsIndustryComparison.tsx`, `ClientOverview360.tsx`, `ClientSeasonalityHeatmap.tsx`, `BusinessIntelligencePage.tsx` (props), `useClientBI.ts` (buckets temporais).
**Criar:** `src/components/bi/BISkeletons.tsx`.

Sem mudanças de schema. Sem novas edge functions. ~7 arquivos tocados.

Executar agora os 6 itens em sequência.
