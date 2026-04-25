# Plano: Otimização de queries lentas (>2s)

## Situação real, baseada em logs (24h)

Rodei `analytics_query` em `postgres_logs`, `function_edge_logs` e nos logs de console do `external-db-bridge`. Os fatos:

- **Postgres do Lovable Cloud**: zero queries com `duration: > 2s`. Saudável.
- **`function_edge_logs > 2s`**: apenas 2 amostras em 24h, ambas no `external-db-bridge` (banco externo Promobrind).
- **Causa real dos picos**: 4 paginations paralelas na tabela `products` do banco externo, `limit=500` cada (offsets 0/500/1000/1500), 17 colunas. Tempos pós-warmup: 1.9s / 2.2s / 2.4s / 2.7s.

A query que dói não está no banco que controlamos. Está no **Promobrind**, ao qual não temos `psql`/migrations diretos.

## O que cabe fazer aqui (sem tocar no Promobrind)

### Wave 1 — Rewrite no front: 1 query keyset, não 4 offset paralelas

Hoje o catálogo dispara 4 paginations `range(offset, offset+499)` em paralelo. Em PostgREST, `range` vira `LIMIT/OFFSET`; offsets crescentes pioram linearmente (Postgres ainda escaneia e descarta as N anteriores). Trocar por **uma única query keyset** (`order by id`, `id > last_id`, `limit 2000`) elimina 3 round-trips e 3 scans desperdiçados.

**Onde**: Identificar o call-site (provavelmente `useInfiniteProductsQuery` ou similar baseado em `external-db-resilience-and-performance`). Refatorar para keyset pagination.

### Wave 2 — Cache server-side no bridge para listagens grandes

O bridge já tem `setCache/getCache` (visto em `handleBatch`). Estender o TTL do cache para listagens de `products` quando `select` é o lightweight padrão (sem filtros dinâmicos), com TTL curto (60s). Reduz custo de 2k records repetidos quando usuário troca de página rapidamente.

### Wave 3 — Reduzir colunas em listagem

O `select-decision` mostra 17 colunas. Algumas (`description`, `brand`, etc.) provavelmente não aparecem no card. Cortar para ~10 colunas no listing diminui transfer ~30% e tempo de serialização PostgREST.

## O que **não** fazer

- **Não criar migrations no Lovable Cloud para "otimizar"** — o gargalo não está lá. Adicionar índices em tabelas Cloud não muda nada.
- **Não criar índices no Promobrind por aqui** — não temos acesso. Se houver índice faltando lá (ex.: `products(is_active, id)` para keyset), preciso entregar uma **lista de DDL para o time admin do Promobrind aplicar**, não tentar via Cloud.

### Entrega adicional

Documento `/mnt/documents/promobrind-index-recommendations.sql` com índices recomendados (sem aplicar):
- `CREATE INDEX CONCURRENTLY products_active_id_idx ON products(is_active, id) WHERE is_active = true;` — suporta keyset com filtro de ativos
- `CREATE INDEX CONCURRENTLY products_supplier_id_idx ON products(supplier_id);` — fan-outs por fornecedor
- `CREATE INDEX CONCURRENTLY products_category_id_idx ON products(category_id);` — filtro de categoria

## Detalhes técnicos

**Arquivos editados (Wave 1):**
- `src/hooks/useInfiniteProductsQuery.ts` (ou equivalente — vou descobrir o nome exato após aprovação)
- Trocar 4 `range()` paralelos por 1 keyset query

**Arquivos editados (Wave 2):**
- `supabase/functions/external-db-bridge/index.ts` — estender cache em `handleSelect` para listings de `products`

**Arquivos editados (Wave 3):**
- Componente que define o `select` da listagem (provavelmente em `src/services/productsService.ts` ou similar)

**Não toca:**
- Schema do Lovable Cloud
- Schema do Promobrind (entrega só recomendação SQL)
- Telemetria/breaker/warm-up (já otimizados)

**Riscos:**
- Wave 1 muda contrato de paginação — testar virtualização da grade de catálogo
- Wave 3 pode quebrar componentes que dependem de campos cortados — fazer auditoria antes

**Impacto esperado:**
- Listing inicial do catálogo (2k records): 2.7s peak → ~700ms
- Round-trips: 4 → 1
- Transfer: ~30% menor com colunas reduzidas

Após aprovação, sigo Wave 1 → 2 → 3, parando para validar build/testes entre cada.