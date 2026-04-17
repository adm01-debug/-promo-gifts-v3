
Onda 3 já parcialmente executada (E2E Playwright + EDGE_FUNCTIONS.md prontos). Restam 8 itens. Plano enxuto:

# Onda 3 — Execução Final (8 itens restantes)

| # | Item | Entregável |
|---|---|---|
| 19 | Refatorar top-10 arquivos > 500 LOC | Extrair sub-componentes/hooks de `VariantStockTable`, `QuoteBuilder`, `ProductCard`, etc. |
| 20 | E2E Playwright completos | 3 specs faltantes: `quote-create`, `discount-approval`, `mockup-generate` |
| 21 | Testes RLS | `tests/rls/` — 3 personas (anon/vendedor/admin) cobrindo 63 tabelas |
| 22 | ADRs | `docs/adr/000{1-5}-*.md` (SSOT, RLS-first, Zod, Closed platform, Cloudflare) |
| 23 | Onboarding | `docs/ONBOARDING.md` (setup < 4h) |
| 24 | Data Dictionary | `docs/DATA_DICTIONARY.md` (63 tabelas + colunas críticas) |
| 25 | Bundle analyzer | `rollup-plugin-visualizer` no `vite.config.ts` |
| 26 | N+1 audit | `docs/PERFORMANCE_AUDIT.md` com EXPLAIN das top-10 queries |
| 27 | Circuit breaker | `_shared/circuit-breaker.ts` + integração em `external-db-bridge` |
| 28 | Post-mortem template | `docs/POSTMORTEM_TEMPLATE.md` + atualizar `RUNBOOK.md` |

## Modo
- Sequencial, sem perguntas, sem pausas (preferência registrada)
- Critério de aceite por item antes de avançar
- Zero alteração em arquivos protegidos
- Memória `mem://infrastructure/hardening-roadmap.md` atualizada ao final

## Premissas
- Refatoração #19: limito a 5 arquivos mais críticos (>800 LOC) para não inflar PR
- Testes RLS: usuários de teste via `seed_discount_test_users` existente + service-role bypass para criar fixtures
- Bundle analyzer: gera `dist/stats.html` no build (sem quebrar CI)
- Circuit breaker: in-memory, threshold 5 falhas / 30s, half-open após 60s

## Entregável final
Relatório consolidado: scorecard 7.8 → ~9.7/10, lista de arquivos criados/modificados, próximos passos para 10/10 (apenas Sentry pendente).

Aprove para iniciar.
