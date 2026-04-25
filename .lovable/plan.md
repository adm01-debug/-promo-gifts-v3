## Escopo

Testar **exclusivamente** o que foi implementado nas duas últimas iterações:

1. `src/lib/external-db/immutableCache.ts` — cache em memória + dedupe por id (piggyback) para `material_types`, `categories`, `suppliers`.
2. `src/lib/external-db/invoke.ts` — classificação refinada de erros retentáveis (503/cold-start) vs. não-retentáveis (400/401/403 com word boundary).

Sem mudanças em UI/produto; apenas testes automatizados + uma verificação leve em produção via logs.

---

## Parte A — Testes unitários do `immutableCache`

Novo arquivo `tests/lib/external-db-immutable-cache.test.ts` com mock de `invokeExternalDb` (`@/lib/external-db/bridge`).

Cenários do dia a dia:

1. **Cache miss puro** — pede `[a,b,c]` sem nada em cache → 1 chamada bridge com `id=in.(a,b,c)`, retorna map completo.
2. **Cache hit puro** — pede ids já resolvidos → 0 chamadas bridge.
3. **Hit parcial** — `a,b` em cache, `c` não → 1 chamada bridge só com `c`.
4. **TTL** — adianta `Date.now()` 5min+1s → expirou, refaz fetch.
5. **Dedupe batch idêntico (INFLIGHT)** — duas chamadas concorrentes com `[a,b]` → 1 única chamada bridge, ambas resolvem.
6. **Piggyback por id (INFLIGHT_BY_ID)** — chamada A pede `[a,b,c]`; antes de resolver, B pede `[b,c,d]` → bridge é chamada 2 vezes, mas a segunda só com `[d]` (b e c reaproveitados).
7. **Piggyback misto com hit** — A em voo com `[x,y]`; B pede `[x, cached, z]` → segunda bridge só com `[z]`.
8. **Erro silenciado** — bridge rejeita → `getCachedByIds` resolve com map vazio para os missing, loga warn, **não** envenena cache (próxima chamada tenta de novo).
9. **Ids duplicados/vazios na entrada** — `['', 'a', 'a', null as any]` → dedup interno, 1 fetch só com `['a']`.
10. **`invalidateImmutableCache(entity)`** — limpa só a entity alvo; outras permanecem.
11. **`getFreshFromCacheSafe` / `putInCacheSafe`** — write síncrono entra no cache e é lido por `getCachedById` sem rede.
12. **`immutableCacheStats`** — reflete contagens corretas após operações.

Também checar isolamento entre entities: pedir id `x` em `categories` não deve servir `x` em `suppliers`.

---

## Parte B — Testes unitários do `invoke` (retry classifier)

Estender `tests/lib/external-db-invoke.test.ts` (já existe) com casos de borda da nova lógica:

13. **UUID com "400"** — mensagem `"row 400e1234-... not found"` **não** deve cair como non-retryable (regex word-boundary com prefixo). Verificar que segue para classificação retryable normal.
14. **Timestamp com "401"** — `"at 2024-01-15T14:01:23"` não deve disparar non-retryable.
15. **HTTP 400 real** — `"Edge function returned 400: Bad Request"` → fail-fast (1 invoke, sem retry).
16. **HTTP 401 com prefixo `status:`** — `"status: 401 unauthorized"` → fail-fast.
17. **HTTP 403 com `http/`** — `"http/403 forbidden"` → fail-fast.
18. **503 vence acidentes** — mensagem que contenha `"503"` + `"unauthorized"` → ainda assim retentável (regra "503 sempre retry").
19. **`service is temporarily unavailable`** sem código → retentável.
20. **`boot_error` / `function failed to start`** → retentável (cold-start).
21. **JWT expired** → fail-fast (já coberto via `'jwt'` em NON_RETRYABLE_PATTERNS — confirmar).

Cada caso valida `mockInvoke.toHaveBeenCalledTimes(N)` esperado.

---

## Parte C — Verificação em produção (read-only, sem mudar código)

Após os unit tests passarem, ainda em modo padrão:

22. Rodar `bunx vitest run tests/lib/external-db-invoke.test.ts tests/lib/external-db-immutable-cache.test.ts`.
23. Consultar `supabase--edge_function_logs external-db-bridge` filtrando por `material_types` nos últimos minutos para confirmar **redução** de chamadas repetidas durante navegação típica (catálogo → detalhe → catálogo).
24. Consultar `supabase--analytics_query` em `function_edge_logs` para conferir distribuição de `status_code` 503 (devem ter retry e sucesso final, sem 503 propagados).

---

## Detalhes técnicos

- Mock do `invokeExternalDb` retorna `{ records: [...], count: n }` no shape que o cache espera (`res.records`).
- Para INFLIGHT/piggyback, mock implementa promise controlável (`deferred`) para forçar ordem de chegada.
- Para TTL, usar `vi.useFakeTimers()` + `vi.advanceTimersByTime(TTL_MS + 1000)`.
- Tests de invoke continuam usando o mock de `supabase.functions.invoke` já presente no arquivo.

## Entregáveis

- `tests/lib/external-db-immutable-cache.test.ts` (novo, ~12 casos)
- `tests/lib/external-db-invoke.test.ts` (estendido, +9 casos)
- Relatório curto no chat com: número de testes passados, qualquer regressão encontrada, e amostra dos logs de produção confirmando o efeito do cache.

Sem alterações em arquivos de produção, exceto se algum teste expor um bug — nesse caso paro e reporto antes de corrigir.