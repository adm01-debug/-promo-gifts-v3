
## Plano de execução — Sprint 1 (Trends Module)

Foco em **alto impacto / baixo esforço** primeiro, com validação visual ao final.

### 1. Algoritmo de Trending Score
- Criar helper `calculateTrendingScore()` em `src/lib/trending-score.ts`: razão `views_recent / avg_baseline` com decay temporal.
- Integrar no `useTrendingProducts` para reordenar por crescimento (não só volume).

### 2. Deltas % nos KPI Cards
- Buscar período anterior (mesmos N dias deslocados).
- Calcular `delta = (atual - anterior) / anterior * 100`.
- Exibir badge ▲/▼ colorido em cada um dos 4 stat cards.

### 3. Card "Demanda Reprimida" (0 resultados)
- Query em `search_analytics` filtrando `results_count = 0`.
- Novo componente `UnmetDemandCard.tsx` — Top 10 termos sem resultado, com CTA "Cadastrar produto".

### 4. Funil de Conversão Visual
- Componente `ConversionFunnel.tsx`: Search → View → Quote → Order.
- Barras horizontais com taxa de drop-off entre etapas.

### 5. Inline Actions nos rankings
- Adicionar botões "Criar Orçamento" e "Ver Detalhes" direto nas linhas de produtos trending (sem precisar navegar).

### 6. Fix técnico — classes Tailwind dinâmicas
- Mapear cores estaticamente (`COLOR_MAP`) para evitar purge JIT em produção.

### 7. Validação E2E
- Navegar para `/tendencias`, capturar screenshots dos 4 KPIs com deltas, do novo card de demanda reprimida e do funil.
- Conferir console logs (sem erros) e network (queries < 2s).

### Arquivos a criar/editar
- **Novos:** `src/lib/trending-score.ts`, `src/components/intelligence/UnmetDemandCard.tsx`, `src/components/intelligence/ConversionFunnel.tsx`
- **Editar:** `src/pages/TrendsPage.tsx`, `src/hooks/useCommercialIntelligence.ts`, componentes de KPI da Trends

### Sprints 2–4 (depois)
Funil avançado, IA narrativa, forecasts, personalização por papel — ficam para próximos turnos após validar Sprint 1.
