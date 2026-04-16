
Plano aprovado anteriormente — Busca Semântica 10/10. Executar sequencialmente:

## Execução

**1. Migration RPC `search_records_rerank`**
- `search_records_rerank(_query text, _candidates jsonb)` retorna `(id text, score real, matched_field text)` usando `GREATEST(similarity(label,q)*1.0, word_similarity(sublabel,q)*0.7)`.

**2. `src/components/search/searchCache.ts`**
- LRU Map (max 50, TTL 60s) com `get/set/clear`. Chave = query normalizada lowercase trim.

**3. `useGlobalSearch.ts`**
- Integrar cache no início do dispatcher.
- `AbortController` para cancelar `Promise.all` em-flight quando nova query chega.
- Após coletar `allResults`, chamar `search_records_rerank` para reordenar resultados de texto-rico (orçamentos, pedidos, conversas, lembretes).
- Logar em `search_analytics` (query, results_count, latency_ms) — fire-and-forget.

**4. `GlobalSearchPalette.tsx`**
- Aplicar `<HighlightMatch text={result.label} query={query} />` em todos os 15 tipos (não só produtos).
- Sublabel também com highlight.

**5. Atalhos de teclado**
- Listener no palette: `Tab` cicla grupos (calcula próximo grupo via `typeConfig`), `1-9` salta para Nº resultado, `Cmd/Ctrl+Enter` abre em nova aba (`window.open(href, '_blank')`).
- Adicionar dica visual no footer: `Tab grupos · 1-9 saltar · ⌘↵ nova aba`.

**6. `src/components/search/EmptySearchState.tsx`**
- Quando `allResults.length === 0 && query.length >= 2`:
  - 3 ações: "Buscar no catálogo externo" (→ `/catalogo?q=`), "Criar orçamento com este nome" (→ `/orcamentos/novo?client=`), "Refinar busca" (limpa input).
  - Últimas 5 buscas do localStorage (`recent_global_searches`).

**7. Validação E2E**
- Browser: `Ctrl+K`, testar 4 queries (produto existente, "xyzz123" sem resultado, "lembrete urgente", "kits canecas azuis").
- Capturar screenshot mostrando highlight + atalhos visíveis.
- Console limpo, latência <800ms.
- Atualizar `mem://features/catalog-search-and-relevance-v2` com cobertura final.

## Arquivos
- **Migration:** RPC `search_records_rerank`
- **Novos:** `src/components/search/searchCache.ts`, `src/components/search/EmptySearchState.tsx`
- **Editar:** `src/components/search/useGlobalSearch.ts`, `src/components/search/GlobalSearchPalette.tsx`
- **Sem novas tabelas** (`search_analytics` reaproveitada do Sprint 1 do Trends)
