

O usuário está em `/admin/performance` (Performance Runtime — Web Vitals) e pede para executar "todas as melhorias listadas até 10/10". Pelo contexto recente, o roadmap principal de hardening (`mem://infrastructure/hardening-roadmap`) já está em **10/10 ✅** (28/28 melhorias completas — Ondas 1, 2 e 3 todas fechadas, incluindo Sentry, circuit breaker, RLS tests, ADRs, etc.).

O eixo BI também acabou de fechar a Onda 7 (mapa de categorias no PDF/PPTX/página pública + drill-down focus). E o último ciclo recente foi a remoção da "Performance Comercial" + hotfix do `RangeError`.

Não há uma "lista pendente" explícita aberta agora. Para chegar de fato ao próximo patamar real de excelência no eixo onde o usuário está olhando (**`/admin/performance`** — Web Vitals Runtime), proponho uma **Onda final de polish do Performance Runtime Dashboard**, que é o que está literalmente na tela dele agora e ainda tem lacunas observáveis vs. ferramentas de mercado (Vercel Analytics, SpeedCurve).

## Onda Performance Runtime 10/10 — 5 itens atômicos

1. **Filtro por dispositivo (mobile/desktop/tablet)** — `web_vitals` já armazena `user_agent`. Adicionar parâmetro `device_filter` na RPC `get_web_vitals_summary` + segmented control no header do dashboard. Detecção via regex no UA (mobile/tablet/desktop). Permite isolar regressões mobile-only (caso clássico).

2. **Filtro por rota (URL pattern)** — combobox no header listando top 20 URLs do período; ao selecionar, filtra todos os widgets (KPIs + distribuição + trend + slowest pages). RPC já tem `page_url`; basta adicionar parâmetro `url_filter` opcional.

3. **Comparação de períodos (delta vs período anterior)** — adicionar nos KPI cards um indicador `▲ +12%` ou `▼ -8%` comparando p75 atual vs janela imediatamente anterior do mesmo tamanho. Cor verde se melhorou, vermelha se regrediu. RPC retorna 2 conjuntos: atual e anterior.

4. **Export CSV do dashboard** — botão "Exportar CSV" no header que baixa um `.csv` com todas as amostras filtradas (timestamp, metric, value, rating, page_url, device). Útil para análise offline e auditoria.

5. **Histórico de alertas de regressão** — nova seção colapsável "Regressões detectadas (últimos 30d)" mostrando timeline das notificações geradas pelo cron `web-vitals-regression-check` (consulta `workspace_notifications` com `category=performance`). Cada item: data, métrica, delta%, link para `/admin/performance` no período da regressão.

## Arquivos

**Backend (1 migration):**
- RPC `get_web_vitals_summary` — adicionar params `device_filter`, `url_filter`, `compare_previous` e retornar bloco `previous_percentiles` + `top_urls`

**Frontend (8 arquivos):**
- `src/hooks/useWebVitalsSummary.ts` — propagar novos filtros + chave de cache
- `src/pages/admin/PerformanceDashboard.tsx` — header com device toggle, URL combobox, botão CSV, seção de regressões
- `src/components/admin/performance/VitalsKpiGrid.tsx` — exibir delta vs período anterior
- `src/components/admin/performance/DeviceFilterToggle.tsx` *(novo)*
- `src/components/admin/performance/UrlFilterCombobox.tsx` *(novo)*
- `src/components/admin/performance/RegressionHistorySection.tsx` *(novo)*
- `src/lib/web-vitals-csv-export.ts` *(novo — geração do CSV client-side)*
- `docs/PERFORMANCE.md` — documentar novos filtros + export

Sem nova edge function, sem nova tabela. Encerra o eixo Performance Runtime em 10/10.

