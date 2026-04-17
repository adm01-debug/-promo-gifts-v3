# Performance Optimization

## Frontend
- Code splitting with React.lazy()
- Image optimization (WebP)
- Implement virtual scrolling
- Use React Query for caching

## Backend
- Database indexing
- Redis caching layer
- CDN for static assets
- Compression enabled

## Monitoring
- Lighthouse CI score > 95
- Core Web Vitals tracking
- APM with Datadog
- Error rate < 0.1%

## Targets (Google Core Web Vitals — official thresholds)
| Metric | Good | Needs Improv. | Poor |
|--------|------|---------------|------|
| LCP    | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP    | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS    | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP    | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB   | ≤ 800ms | ≤ 1800ms | > 1800ms |

## Runtime Performance Dashboard

Acesse `/admin/performance` (admin only) para visualizar dados reais de produção:

- **KPI cards** com p75 de cada métrica, codificado por cor segundo Google
- **Distribuição** good/needs-improvement/poor por métrica
- **Tendência diária** (linha p75 últimos 7/30/90 dias)
- **Top 10 páginas mais lentas** com p75 e contagem de amostras
- Filtros por período (7/30/90 dias)

Dados vêm da tabela `web_vitals`, populada automaticamente em produção pelo `src/lib/web-vitals.ts` → edge function `store-web-vitals`.

### Detecção automática de regressão
A edge function `web-vitals-regression-check` roda diariamente às 09:00 UTC via `pg_cron`:
- Compara p75 dos últimos 7 dias vs 7 dias anteriores
- Se LCP/INP/CLS regrediu > 20% (com ≥10 amostras em cada janela), notifica todos admins via `workspace_notifications`
- Notificação com link direto para `/admin/performance`

### Runbook — quando há regressão
1. Abrir `/admin/performance` e identificar qual métrica regrediu
2. Filtrar por 7d e olhar a tabela "Páginas mais lentas" para localizar URL afetada
3. Cross-check com `git log` ou releases recentes do período
4. Reproduzir localmente em DevTools (Lighthouse + Performance tab)
5. Após correção, monitorar o dashboard por 48-72h até p75 retornar ao baseline
