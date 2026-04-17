---
name: performance-runtime-dashboard
description: Dashboard /admin/performance com agregação de Web Vitals (LCP/INP/CLS/FCP/TTFB) via RPC `get_web_vitals_summary` e detecção automática de regressão (cron diário 09:00 UTC)
type: feature
---
# Performance Runtime Dashboard

## Acesso
`/admin/performance` (admin-only via `AdminRoute`)

## Backend
- **Tabela**: `web_vitals` (já populada por `src/lib/web-vitals.ts` → edge `store-web-vitals`)
- **RPC `get_web_vitals_summary(days, metric_filter)`**: SECURITY DEFINER, admin-only. Retorna `{percentiles, distribution, slowest_pages, daily_trend, nav_breakdown, total_samples}`
- **RPC `get_web_vitals_regression()`**: compara últimos 7d vs 7d anteriores; flag regressão se `change_pct > 20%` com ≥10 amostras em cada janela
- **Índices**: `(metric_name, created_at DESC)` e `(page_url, metric_name)` para acelerar agregações

## Frontend
- `src/pages/admin/PerformanceDashboard.tsx` — página principal
- `src/hooks/useWebVitalsSummary.ts` — React Query, staleTime 60s
- `src/components/admin/performance/`:
  - `vitals-thresholds.ts` — Google CWV oficial (LCP 2.5s/4s, INP 200ms/500ms, CLS 0.1/0.25, FCP 1.8s/3s, TTFB 800ms/1.8s)
  - `VitalsKpiGrid.tsx` (reusa `KpiCard`)
  - `VitalsDistributionChart.tsx` (recharts, stacked bar good/NI/poor)
  - `VitalsTrendChart.tsx` (recharts, line p75 por dia)
  - `SlowestPagesTable.tsx` (top 10 URLs por p75)

## Alerta automático
- **Edge function**: `web-vitals-regression-check`
- **Cron**: `web-vitals-regression-check-daily` (`0 9 * * *` UTC, via `pg_cron` + `pg_net`)
- **Notificação**: insere em `workspace_notifications` (type=warning, category=performance, action_url=/admin/performance) para todos admins quando LCP/INP/CLS regridem >20%

## Manutenção
- Para adicionar nova métrica, atualize `VITAL_THRESHOLDS` em `vitals-thresholds.ts` e o `metric_name IN (...)` na RPC `get_web_vitals_regression`.
- Filtros suportados: 7/30/90 dias.
- Mínimo 3 amostras por página para aparecer em "Slowest pages" (filtra ruído).
