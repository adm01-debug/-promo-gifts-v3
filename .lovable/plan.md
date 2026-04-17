
User quer abrir nova frente: análise de performance runtime usando dados reais já coletados na tabela `web_vitals` (via `store-web-vitals` edge function).

Preciso entender o que já existe:
- `src/lib/web-vitals.ts` coleta CLS/INP/LCP/FCP/TTFB e envia para edge `store-web-vitals`
- Edge function insere em `web_vitals` (user_id, metric_name, metric_value, rating, delta, navigation_type, page_url, user_agent)
- Não há UI para visualizar; não há agregação; não há alertas

Plano: criar dashboard admin + RPC de agregação + alertas para regressão.

# Plano — Performance Runtime Dashboard (LCP/INP via dados reais)

## Objetivo
Transformar a tabela `web_vitals` (já populada) em insights acionáveis: identificar páginas lentas, regressões e priorizar otimizações com dados reais de produção.

## Escopo

### 1. Backend — Agregação SQL
Migration criando RPC `get_web_vitals_summary(days int, metric text)` que retorna:
- p50/p75/p95/p99 por métrica
- Distribuição good/needs-improvement/poor (% segundo thresholds Google)
- Top 10 páginas mais lentas (group by `page_url`)
- Tendência diária (últimos N dias)
- Breakdown por `navigation_type` (navigate/reload/back-forward)

Índices adicionais em `web_vitals(metric_name, created_at)` e `web_vitals(page_url, metric_name)` se ausentes.

### 2. Frontend — Dashboard `/admin/performance`
Nova página protegida por `AdminRoute`:
- **KPI cards**: LCP p75, INP p75, CLS p75, FCP p75, TTFB p75 (cor por rating Google)
- **Distribution chart**: barra empilhada good/NI/poor por métrica (recharts, já no projeto)
- **Trend chart**: linha p75 últimos 30 dias por métrica
- **Slowest pages table**: top 10 URLs por p75 LCP, com count de samples
- **Filtros**: range (7/30/90 dias), métrica, navigation_type
- Reuso de `KpiCard` existente (`src/components/ui/kpi-card.tsx`)

### 3. Sidebar
Adicionar item "Performance" no grupo Admin (sidebar reorganizada).

### 4. Alertas (cron)
Edge function agendada `web-vitals-regression-check` (pg_cron diário 09:00 UTC):
- Compara p75 dos últimos 7 dias vs 7 dias anteriores
- Se regressão > 20% em LCP/INP/CLS, insere `workspace_notifications` (admins) com link para o dashboard

### 5. Documentação
Atualizar `docs/PERFORMANCE.md` com:
- Como acessar dashboard
- Thresholds usados (Google CWV oficial)
- Runbook: o que fazer quando há regressão

## Arquivos a criar/editar

**Criar:**
- `supabase/migrations/<ts>_web_vitals_aggregation.sql` (RPC + índices + cron)
- `supabase/functions/web-vitals-regression-check/index.ts`
- `src/pages/admin/PerformanceDashboard.tsx`
- `src/components/admin/performance/VitalsKpiGrid.tsx`
- `src/components/admin/performance/VitalsDistributionChart.tsx`
- `src/components/admin/performance/VitalsTrendChart.tsx`
- `src/components/admin/performance/SlowestPagesTable.tsx`
- `src/hooks/useWebVitalsSummary.ts`

**Editar:**
- `src/App.tsx` (rota `/admin/performance`)
- `src/components/SidebarReorganized.tsx` (novo item)
- `docs/PERFORMANCE.md`

## Premissas
- Dashboard é admin-only (via `AdminRoute` existente)
- Thresholds Google: LCP good <2.5s/poor >4s · INP good <200ms/poor >500ms · CLS good <0.1/poor >0.25
- Cron: pg_cron + pg_net (já em uso no projeto, ver `database-automated-maintenance-pg-cron`)
- RLS: dados já restritos por user_id; RPC roda como `security definer` para agregar cross-user (admin-only via `has_role(auth.uid(), 'admin')` check no início)
- Sem perguntas adicionais; execução autônoma sequencial conforme preferência

## Critério de aceite
1. `/admin/performance` carrega em <1s com dados reais agregados
2. RPC retorna p75 correto comparado contra cálculo manual
3. Cron registrado e dispara sem erro
4. Notificação chega ao admin em caso de regressão simulada
5. Lighthouse no próprio dashboard ≥ 95

Aprove para executar.
