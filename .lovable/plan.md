
Vou executar autonomamente todas as melhorias da auditoria, **uma por vez, sequencialmente, sem pausas ou perguntas**, conforme preferência registrada. Cada melhoria será uma tarefa atômica auto-contida com critério de aceite verificável.

# Plano de Execução — Rumo ao 10/10

## Ondas de execução (28 melhorias totais)

### 🔴 ONDA 1 — Quick Wins (Impacto Alto / Esforço Baixo)
1. **CI: Adicionar ESLint** ao `.github/workflows/ci.yml` (`npm run lint`)
2. **HIBP**: Habilitar `password_hibp_enabled: true` via `configure_auth`
3. **Storage RLS**: Hardenizar 4 buckets públicos — restringir UPDATE/DELETE por `name LIKE auth.uid()::text || '/%'`
4. **PR Template**: Criar `.github/pull_request_template.md` com checklist
5. **Dependabot**: Criar `.github/dependabot.yml` (npm semanal + GitHub Actions)
6. **Security headers**: Adicionar `_headers` (CSP, HSTS, X-Frame, X-Content-Type, Referrer-Policy)
7. **CHANGELOG.md**: Criar com versionamento semântico inicial
8. **Coverage threshold**: Subir de 50% → 60% em `vitest.config.ts`
9. **Husky pre-push**: Adicionar hook rodando `npm run test`

### 🟠 ONDA 2 — Sprint 1 (Impacto Alto / Esforço Médio)
10. **Zod em edge functions públicas**: Adicionar validação Zod em `image-proxy`, `cnpj-lookup`, `quote-public-view`, `github-fix-config`, `crm-db-bridge` (faltantes)
11. **CORS restritivo**: Substituir `*` por allow-list (`promogifts.com.br`, preview URLs) em `_shared/cors.ts`
12. **Sentry/Error tracking**: Integrar `@sentry/react` com DSN em `error-reporter.ts`
13. **RLS policies "qual=true"**: Auditar e restringir as 13 policies permissivas
14. **Optimistic locking**: Adicionar coluna `version INTEGER` em `quotes` e `orders` + trigger de incremento
15. **API docs**: Gerar `docs/EDGE_FUNCTIONS.md` documentando 50 endpoints (path, auth, body schema, responses)
16. **Web Vitals dashboard**: Criar tabela `web_vitals_metrics` + RPC + persistir CLS/LCP/INP
17. **Rate limiting client-side**: Aplicar `check_rate_limit` em mais 5 edge functions críticas
18. **MFA opcional**: UI + flow TOTP usando `supabase.auth.mfa.enroll()`

### 🟡 ONDA 3 — Sprint 2 (Impacto Médio-Alto / Esforço Médio)
19. **Refatorar top-10 arquivos > 500 LOC** (extrair sub-componentes/hooks)
20. **Testes E2E Playwright**: 5 happy paths críticos (login, criar orçamento, aprovar desconto, gerar mockup, exportar pedido)
21. **Testes RLS**: Suite completa em `tests/rls/` cobrindo 100% das tabelas com 3 personas (anon, vendedor, admin)
22. **ADRs**: Criar `docs/adr/` com 5 decisões-chave (SSOT external DB, RLS-first, edge functions Zod, closed platform, Cloudflare Stream)
23. **Onboarding guide**: `docs/ONBOARDING.md` (setup local em < 4h)
24. **Dicionário de dados**: `docs/DATA_DICTIONARY.md` mapeando 63 tabelas
25. **Bundle analyzer**: Adicionar `rollup-plugin-visualizer` + relatório no CI
26. **N+1 audit**: EXPLAIN ANALYZE nas top-10 queries do hook `useExternalProducts`
27. **Circuit breaker**: Implementar em `external-db-bridge` para CRM/Catálogo (degradação graciosa)
28. **Post-mortem template**: `docs/POSTMORTEM_TEMPLATE.md` + atualizar `RUNBOOK.md`

## Modo de execução
- **Sequencial** — uma melhoria por vez, validando antes de prosseguir
- **Sem perguntas** — decisões técnicas tomadas com base em padrões já estabelecidos no projeto (memórias)
- **Critério de aceite por item** — só avança após validar (lint passa, deploy ok, query retorna esperado)
- **Sem alterar arquivos protegidos** (`client.ts`, `types.ts`, `.env`, `supabase/config.toml` project-level)
- **Memórias atualizadas** ao final de cada onda

## Premissas (não vou perguntar — vou aplicar)
- CORS allow-list usará: `https://promogifts.com.br`, `https://*.lovable.app`, `http://localhost:*`
- Sentry — vou solicitar `SENTRY_DSN` apenas no item #12 (única exceção, pois é credencial externa obrigatória)
- MFA — apenas TOTP (não SMS, evita custo Twilio)
- E2E Playwright — usuário de teste será criado via seed function existente

## Entregável final
Após onda 3: relatório consolidado mostrando scorecard antes (7.8) → depois (esperado ≥9.5), com todos os arquivos criados/modificados e migrações aplicadas.

**Aprove para eu iniciar a execução autônoma das 28 melhorias.**
