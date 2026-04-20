

# Correção dos 2 bugs do QA + agendamento do cron

O QA da sessão anterior identificou 2 bugs bloqueantes nas Ondas C1→C6. Vou corrigir ambos e fechar o último gap operacional.

## Bug #1 (High) — Cron `comparison-price-watcher` não agendado

A edge function existe e está deployada, mas o job no `pg_cron` nunca foi inserido. Sem isso, ninguém é notificado quando o preço de um produto comparado cai.

**Fix:** usar a ferramenta de insert (não migration) para agendar o cron diário às 04:00 BR (07:00 UTC):

```sql
SELECT cron.schedule(
  'comparison-price-watcher-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nmojwpihnslkssljowjh.supabase.co/functions/v1/comparison-price-watcher',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

Validação: `SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'comparison-price-watcher-daily'`.

## Bug #2 (Medium) — Empty state inteligente não renderiza top 6

`CompareEmptyStateSmart` chama `supabase.rpc("get_top_compared_products", { p_limit: 6 })` e mostra a grade só quando `products.length > 0`. Investigação necessária:

1. RPC existe mas pode estar retornando `[]` porque `user_comparisons.items` ainda está vazio em produção (sem dados históricos).
2. `getProductsByIds` pode estar filtrando IDs que não vêm enriquecidos no contexto.

**Fix planejado em `src/components/compare/CompareEmptyStateSmart.tsx`:**
- Fallback: se RPC retorna 0 ids OU `getProductsByIds` resolve 0 produtos, buscar top 6 produtos por outro critério (ex.: `useProductsContext().products.slice(0, 6)` ordenados por destaque/popularidade local).
- Logar `console.warn` quando o fallback dispara para facilitar QA futuro.
- Renderizar a seção "Os mais comparados da semana" (ou "Sugestões") sempre que houver ≥1 produto resolvido — nunca esconder silenciosamente.

## Etapa 3 — Re-validação pós-fix

1. Confirmar `cron.job` lista o novo job ativo.
2. Disparar manualmente `comparison-price-watcher` via curl e ler logs (sem erro).
3. Abrir `/comparar` em estado vazio e confirmar que a grade de 6 produtos aparece.
4. Atualizar o relatório QA: marcar Bug #1 e Bug #2 como **PASS**, fechar a certificação 10/10.

## Arquivos afetados

- `src/components/compare/CompareEmptyStateSmart.tsx` (edit — fallback + logs)
- Insert SQL via `supabase` insert tool (cron job)
- Sem novas migrations, sem novas edge functions

## Resultado final

Comparador 10/10 com **0 bugs abertos**: price watcher rodando diariamente, empty state sempre populado, relatório QA fechado.

