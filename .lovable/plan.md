

Agora ficou claro: o usuário quer remover **Performance Runtime** (Web Vitals) — a tela `/admin/performance` que está na screenshot. Já existe outro sistema fazendo isso. Ação destrutiva confirmada.

## Escopo de remoção

**Frontend (deletar):**
- `src/pages/admin/PerformanceDashboard.tsx`
- `src/hooks/useWebVitalsSummary.ts`
- `src/components/admin/performance/` (pasta inteira: `vitals-thresholds.ts`, `VitalsKpiGrid.tsx`, `VitalsDistributionChart.tsx`, `VitalsTrendChart.tsx`, `SlowestPagesTable.tsx`)
- `src/lib/web-vitals.ts` (coleta automática de LCP/INP/CLS/FCP/TTFB)
- Importação/inicialização de `web-vitals.ts` em `src/main.tsx` (ou onde estiver sendo chamado)

**Frontend (editar):**
- `src/App.tsx` — remover rota `/admin/performance` e seu lazy import
- Sidebar admin — remover item "Performance Runtime" / "Performance" (vou localizar o arquivo exato)

**Backend (migration de DROP):**
- `DROP FUNCTION public.get_web_vitals_summary(integer, text, text, text, boolean);`
- `DROP FUNCTION public.get_web_vitals_regression();`
- `DROP TABLE public.web_vitals;` (com CASCADE para limpar índices/RLS)
- Remover cron job `web-vitals-regression-check-daily` via `cron.unschedule(...)`

**Edge function (deletar deploy):**
- `supabase/functions/web-vitals-regression-check/` (pasta) + chamar `supabase--delete_edge_functions` com `["web-vitals-regression-check"]`
- `supabase/functions/store-web-vitals/` (pasta) + chamar `supabase--delete_edge_functions` com `["store-web-vitals"]`

**Documentação/memória:**
- Deletar `.lovable/memory/features/performance-runtime-dashboard.md`
- Atualizar `mem://index.md` removendo a linha do Performance Runtime Dashboard
- Atualizar `mem://infrastructure/hardening-roadmap.md` se mencionar Web Vitals dashboard
- Atualizar `docs/PERFORMANCE_AUDIT.md` se referenciar essa feature
- Limpar migrations recentes da "Onda 10/10" que adicionaram campos relacionados (não é necessário reverter migrations antigas — só garantir que `DROP TABLE` cuida de tudo)

## Plano de execução (ordem)

1. **Migration DROP** — derruba RPCs, tabela `web_vitals`, índices, RLS e desagenda cron job em uma transação.
2. **Deletar edge functions** do deploy (`supabase--delete_edge_functions`).
3. **Deletar arquivos frontend** (página, hook, componentes, lib de coleta).
4. **Editar `App.tsx`** removendo rota e lazy import.
5. **Editar sidebar admin** removendo o item de menu.
6. **Editar `main.tsx`** (ou entrypoint) removendo chamada de inicialização do `web-vitals.ts`.
7. **Atualizar memória** (`mem://index.md` + deletar arquivo de feature).
8. **Atualizar docs** (`docs/PERFORMANCE_AUDIT.md` se necessário).

Sem mudança em `src/integrations/supabase/types.ts` (regenera sozinho após a migration).

## Confirmação final

Esta ação é **irreversível**: apaga ~90 dias de histórico de Web Vitals coletados, remove monitoramento automático de Core Web Vitals e o cron de detecção de regressão. Como você já tem outro sistema cobrindo isso, prosseguir é seguro do ponto de vista funcional.

Ao aprovar, executo na ordem acima.

