
Sprint 1 já foi concluído e validado. Agora executo Sprints 2-4 sequencialmente, um item por vez, sem pausas, até atingir 10/10.

## Sprint 2 — Conversão & UX Avançada

**2.1 Filtros persistentes na URL** — `?range=30d&tab=products` para compartilhamento e deep-linking.
**2.2 Comparação temporal lado-a-lado** — toggle "vs período anterior" em todos os gráficos (linha pontilhada do período passado sobreposta).
**2.3 Heatmap de horário/dia da semana** — quando os clientes mais buscam/visualizam (matriz 7×24).
**2.4 Top categorias em alta** — agregação por categoria com mesmo trending score.
**2.5 Export CSV/PDF** — botão de exportação dos rankings e KPIs.

## Sprint 3 — IA & Inteligência

**3.1 Insights Narrativos via IA** — card no topo com 3 bullets gerados por `google/gemini-2.5-flash` (Lovable AI): "O que mudou", "Por quê", "Próxima ação".
**3.2 Forecast de tendência** — projeção 7d à frente nos gráficos (regressão linear simples no client + intervalo de confiança).
**3.3 Anomaly detection** — destacar dias/produtos com picos >2σ acima da média.
**3.4 Edge function `trends-insights`** — agrega dados e chama Lovable AI Gateway.

## Sprint 4 — Personalização & Polimento

**4.1 Visões por papel** — Admin vê tudo; Vendedor vê só seus clientes/orçamentos.
**4.2 Drill-down em qualquer KPI** — clicar em "Visualizações" abre modal com detalhamento.
**4.3 Salvamento de views** — usuário salva combinação de filtros como "Minha visão semanal".
**4.4 Real-time badge** — indicador "ao vivo" com contador de eventos dos últimos 5min via Realtime.
**4.5 Onboarding tour** — first-visit tooltip explicando cada métrica.

## Ordem de execução (1 por vez, com validação visual ao final de cada Sprint)

1. **2.1** URL params  → 2. **2.2** Comparação temporal  → 3. **2.3** Heatmap  → 4. **2.4** Categorias em alta  → 5. **2.5** Export
6. Validar Sprint 2 (`/tendencias` screenshot + console)
7. **3.4** Edge function `trends-insights`  → 8. **3.1** Card narrativo  → 9. **3.2** Forecast  → 10. **3.3** Anomalias
11. Validar Sprint 3
12. **4.1** Visões por papel  → 13. **4.2** Drill-down  → 14. **4.3** Saved views  → 15. **4.4** Real-time badge  → 16. **4.5** Tour
17. Validação E2E final + atualizar memória

## Arquivos principais

**Novos:**
- `src/hooks/useUrlState.ts` (genérico para URL persistence)
- `src/components/intelligence/TrendsHeatmap.tsx`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/intelligence/TrendsInsightsCard.tsx`
- `src/components/intelligence/TrendsForecastChart.tsx`
- `src/components/intelligence/SavedViewsManager.tsx`
- `src/components/intelligence/RealtimeBadge.tsx`
- `src/components/intelligence/TrendsTour.tsx`
- `src/lib/trends-export.ts` (CSV+PDF)
- `src/lib/forecast.ts` (regressão linear + anomaly)
- `supabase/functions/trends-insights/index.ts`

**Editar:** `src/pages/TrendsPage.tsx`, `src/pages/trends/TrendsCharts.tsx`, `src/pages/trends/TrendsKpiCards.tsx`

**Migration:** tabela `saved_trends_views` (id, user_id, name, filters_jsonb, created_at) com RLS.

Sem perguntas. Sem pausas. Executo tudo até 10/10.
