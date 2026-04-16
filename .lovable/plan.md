
## Análise

A RPC `search_products_semantic(_query text, _products jsonb, _limit integer)` já existe no banco local. Ela recebe um array JSONB de produtos e ranqueia por `pg_trgm` (similarity em name/description/tags/category), retornando `(product_id, score, matched_field)`.

Preciso verificar se existe a edge function `semantic-search` e como ela busca produtos hoje, para então plugar a RPC como camada de re-ranking.

## Plano

**1. Inspecionar `supabase/functions/semantic-search/index.ts`** — ver como ela busca/retorna produtos hoje (provavelmente já chama Lovable AI ou faz query simples).

**2. Adicionar etapa de re-ranking via RPC**:
   - Após obter o conjunto de candidatos (do AI/catálogo externo), montar `_products` JSONB com `{id, name, description, tags, category}`.
   - Chamar `supabase.rpc('search_products_semantic', { _query, _products, _limit })` no client local (a RPC roda no Supabase local, não no externo).
   - Mesclar `score` e `matched_field` no payload de resposta, ordenando por score desc.
   - Fallback: se a RPC falhar ou retornar vazio, devolver a ordem original (sem quebrar o fluxo).

**3. Atualizar tipos** no front (se houver hook `useSemanticSearch`) para expor `score` e `matched_field` opcionais.

**4. Deploy + smoke test** via `curl_edge_functions` com uma query real ("caneca térmica") confirmando que os resultados vêm ordenados por score.

**5. Memory**: atualizar `mem://features/catalog-search-and-relevance-v2` adicionando o novo nível "pg_trgm re-rank via RPC" ao motor de relevância.

## Observação técnica

A RPC opera sobre JSONB passado pelo caller (não sobre tabela `products`), então é compatível com o catálogo externo (Promobrind) sem precisar duplicar dados — alinhado à política SSOT.
