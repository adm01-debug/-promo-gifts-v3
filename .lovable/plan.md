

O usuário pediu novamente para excluir "Performance Comercial". Já foi feito anteriormente. Mas a tela mostra um erro novo no `/admin/performance` (Web Vitals — feature distinta que deve permanecer):

> `Could not choose the best candidate function between: public.get_web_vitals_summary(days, metric_filter), public.get_web_vitals_summary(days, metric_filter, device_filter, url_filter, compare_previous)`

Isso aconteceu porque na tentativa interrompida da "Onda Performance Runtime 10/10" foi criada uma migration que adicionou uma **segunda versão sobrecarregada** da RPC `get_web_vitals_summary`, sem remover a antiga. PostgREST agora não consegue escolher qual chamar e quebra o dashboard.

A intenção real do usuário aqui (apesar do texto repetido) é claramente: **resolver o que está vermelho na tela**. A "Performance Comercial" antiga (`/performance` SellerPerformance) já está 100% removida — confirmado em 2 ciclos anteriores.

## Plano de hotfix

**Causa:** duas assinaturas conflitantes de `get_web_vitals_summary` no banco.

**Correção:** migration que faz `DROP FUNCTION` da assinatura antiga de 2 parâmetros, mantendo apenas a nova de 5 parâmetros (que tem defaults compatíveis — `device_filter=NULL`, `url_filter=NULL`, `compare_previous=true` — então o frontend atual que passa só `days` e `metric_filter` continua funcionando).

```sql
DROP FUNCTION IF EXISTS public.get_web_vitals_summary(integer, text);
```

A nova função de 5 params já existe e tem defaults, então o hook `useWebVitalsSummary` (que passa `days` + `metric_filter`) continua compatível sem qualquer mudança no frontend.

## Arquivo

- **1 migration nova:** `DROP FUNCTION public.get_web_vitals_summary(integer, text);`

Sem mudança em frontend. Sem mudança em tipos. Resolve o erro vermelho da tela em 1 statement.

## Sobre "Performance Comercial"

Confirmo (3ª vez): `/performance`, `SellerPerformanceDashboard.tsx`, `useSellerPerformance.ts` e o item "Performance" da sidebar **não existem mais**. O que aparece na tela é `/admin/performance` (Web Vitals Runtime — feature técnica diferente, que você aprovou manter). Se a intenção for remover **também** o `/admin/performance` (Web Vitals), me avise explicitamente — mas isso apagaria todo o dashboard de Core Web Vitals + RPC + edge function de regressão.

