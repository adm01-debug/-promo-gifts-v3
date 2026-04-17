
Roadmap atual: Onda 1 ✅, Onda 2 ✅ (Sentry pulado), Onda 3 ✅. Restam **3 itens finais** para 10/10:

# Finalização — Rumo ao 10/10

| # | Item | Entregável |
|---|---|---|
| A | **Wire-up circuit breaker** | Integrar `getBreaker()` em `external-db-bridge/index.ts` e `crm-db-bridge/index.ts` com `circuitOpenResponse()` |
| B | **Sentry integration (frontend)** | Instalar `@sentry/react`, init em `main.tsx`, capturar erros em `error-reporter.ts` + `EnhancedErrorBoundary` |
| C | **CI secrets RLS tests** | Adicionar step opcional no `.github/workflows/ci.yml` rodando `vitest tests/rls/` quando `TEST_SELLER_PASSWORD`/`TEST_ADMIN_PASSWORD` estiverem definidos |

## Premissas
- **Sentry DSN**: vou solicitar via `add_secret` (`SENTRY_DSN`). Sem essa credencial externa o item B não funciona em produção — é o único bloqueio real para 10/10.
- Circuit breaker: thresholds default (5 falhas / 30s, reabre em 60s). Em estado OPEN retorna 503 + `Retry-After: 60`.
- CI RLS step: `continue-on-error: true` + `if: env.TEST_SELLER_PASSWORD != ''` para não quebrar PRs sem secrets.

## Modo
Sequencial, sem perguntas adicionais (só o `add_secret` do Sentry no item B), sem pausas. Memória `mem://infrastructure/hardening-roadmap.md` atualizada ao final marcando 10/10.

## Entregável final
Scorecard **10/10** + relatório consolidado das 28 melhorias da auditoria, com lista completa de arquivos criados/modificados nas 3 ondas.

Aprove para iniciar.
