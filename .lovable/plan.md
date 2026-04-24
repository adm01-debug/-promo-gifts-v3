## Onda 2 — Rumo aos 10/10 de latência

A Onda 1 (entregue) atacou cold start, retries silenciosos e prewarm. Sobrou um chão real: **listings de products com limit > 50 ainda gastam 3,5–4,6s no Postgres externo**, e isso é I/O, não cold start. A Onda 2 ataca esse chão direto.

### O que vai ser feito (4 melhorias, na ordem)

**1. Cache HTTP de borda no `external-db-bridge` para listings de catálogo**
Listings públicos de `products`/`product_images`/`product_variants`/`categories` mudam pouco. Vou adicionar:
- Header `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` quando a request é anônima, `select` puro, sem filtros sensíveis e tabela pública.
- `ETag` baseado em hash do payload + `If-None-Match` → 304 instantâneo.
- Bypass automático para qualquer request autenticada ou com `countMode=exact`.

Impacto esperado: hits repetidos (paginação, voltar pro catálogo) caem de ~3,5s para <100ms na borda do Cloudflare.

**2. Índices no Postgres externo para os filtros quentes do catálogo**
Os listings filtram por `is_active`, `category_id`, `supplier_id`, `main_category_id` e ordenam por `created_at`/`name`. Vou criar:
- `idx_products_active_category_created` (parcial, `WHERE is_active = true`)
- `idx_products_active_supplier_created` (parcial)
- `idx_products_active_name` (parcial, para sort alfabético)
- `idx_products_active_main_category` (parcial)

Antes de aplicar: rodo `EXPLAIN (ANALYZE, BUFFERS)` nas queries reais via `read_query` para confirmar que cada índice será usado e que o ganho é real (>30% no tempo de plano). Se não for, descarto o índice em vez de poluir o schema.

Impacto esperado: corta 40–60% do tempo Postgres das queries de listagem.

**3. Fast-path no bridge: pular auth check para reads públicos**
Hoje `handleCrud` sempre chama `localSupabase.auth.getUser()` + `user_roles` (2 round-trips ~150–300ms) mesmo quando a tabela é pública e a operação é `select` sem JWT. Vou:
- Detectar cedo: `select` + `PRODUCT_TABLES`/`PRODUCT_VIEWS` + sem `Authorization` header → pular o bloco de auth inteiro.
- Manter validação completa para tabelas sensíveis e qualquer operação de escrita.

Impacto esperado: -150 a -300ms por request anônima de catálogo.

**4. Painel de telemetria: cards de "retries economizados" e "cache hits"**
Para fechar o ciclo de observabilidade da Onda 1 + Onda 2:
- Coluna nova `query_telemetry.retry_count` (default 0).
- O `invokeWithRetry` do cliente passa a anotar quantos retries fez (quando registrar) e se foi fail-fast.
- Card no `/admin/telemetria` com: nº de fail-fasts hoje, retries totais economizados (estimativa: cada fail-fast = ~5,6s evitados), e taxa de cache HTTP hit (extraída do header `cf-cache-status` quando disponível).

Impacto esperado: prova mensurável de ROI das otimizações.

### Validação por etapa

Cada uma das 4 melhorias termina com:
- Typecheck do que foi tocado (tolerando os erros pré-existentes em `product-mapper.ts`).
- Testes unitários adicionados/atualizados, todos passando.
- Para #1 e #3: chamada real via `curl_edge_functions` antes/depois para medir delta.
- Para #2: `EXPLAIN ANALYZE` antes/depois.

### Detalhes técnicos

| # | Arquivos principais | Migração de schema? |
|---|---|---|
| 1 | `supabase/functions/external-db-bridge/index.ts` (jsonResponse + ETag util) | Não |
| 2 | Nova migration com `CREATE INDEX CONCURRENTLY` no BD externo | Sim (no externo) |
| 3 | `supabase/functions/external-db-bridge/index.ts` (handleCrud) | Não |
| 4 | `query_telemetry` (+coluna), `external-db-telemetry.ts`, `invoke.ts`, `useHighLimitTelemetry.ts`, `HighLimitTelemetryCard.tsx` | Sim (local) |

### O que NÃO está no plano (e por quê)

- **Materialized view de products**: prematuro — primeiro vamos ver quanto cache + índices + fast-path entregam. Se ficarmos acima de 1,5s p95, abro Onda 3 com isso.
- **Upgrade do compute do Lovable Cloud**: opção do usuário, não código. Mencionei na resposta anterior.
- **Reduzir `polling` de notifications (30s)**: fora de escopo de latência de catálogo; já documentado em memória.

### Resultado esperado ao final da Onda 2

- p95 de `select:products limit>50` cair de ~4s para **<800ms** em cache miss e **<100ms** em cache hit.
- Zero regressão de funcionalidade (todas as escritas e tabelas sensíveis continuam com auth obrigatória).
- Painel mostra economia concreta de tempo desde a Onda 1.
