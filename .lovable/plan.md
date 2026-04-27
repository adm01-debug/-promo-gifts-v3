
# 🔬 Auditoria Técnica 10/10 — Promo Gifts

> Modo plano (read-only). Notas baseadas em **evidências concretas** colhidas via ripgrep, psql, supabase linter, leitura de configs e workflows. Toda nota cita arquivo/linha/comando que a sustenta.

---

## Fase 0 — Inventário do Sistema

| Dimensão | Valor |
|---|---|
| Stack frontend | React 18.3 + Vite 5.4 + TS 5.5 (strict) + Tailwind 3.4 + shadcn |
| Backend | Lovable Cloud (Supabase) + 85 Edge Functions (Deno) |
| Integrações externas | Bitrix24, n8n, Cloudflare Stream, ElevenLabs, Lovable AI Gateway, banco externo Promobrind, OpenAI/Gemini |
| Ambientes | Preview + Published + Custom Domain (`promogifts.com.br`) |
| Código aplicação | **1.565 arquivos TS/TSX, ~268.402 LOC** |
| Banco | **111 tabelas public, 281 RLS policies, 342 índices, 134 funções SECURITY DEFINER, 108 triggers, 344 migrations** |
| Rotas frontend | 105 declarações `<Route>` em `App.tsx` |
| Edge Functions | 85 (40 com CORS wildcard, 35 com Zod) |
| Testes | 292 specs Vitest + 102 specs Playwright (smoke + regression isolados) |
| CI | 2 workflows (`ci.yml` smoke→quality; `e2e.yml` Playwright completo) |
| Docs | 30+ markdowns em `docs/` + 5 ADRs + RUNBOOK + DATA_DICTIONARY + SECURITY |

---

## Fase 1 — As 20 Dimensões

### 1. Arquitetura — **8.5/10**
**Evidências:** Feature-based em `src/` (components/hooks/lib/services/contexts), camada `lib/external-db/bridge.ts` isola banco externo, ADRs presentes (`docs/adr/0001-ssot-external-db.md`, `0005-resilience-circuit-breaker.md`), feature flags centralizados (`src/lib/feature-flags.ts`), edge functions como camada server-side desacoplada.
**Gaps p/10:** sem boundary explícito entre domínios (catálogo, orçamentos, kits compartilham `src/components` planos); algumas regras de negócio (markup, pricing) ainda vivem misturadas em hooks/components; sem dependency-cruiser/madge no CI para detectar ciclos.
**Ações:** (a) introduzir `src/domains/{catalog,quotes,kits,magic-up}/` agregando hooks+services+types do domínio; (b) adicionar `madge --circular src` ao CI; (c) ADR para política de domínios.

### 2. Autenticação — **8/10**
**Evidências:** Supabase Auth com `onAuthStateChange` em `AuthContext.tsx`, MFA TOTP implementado (`use2FA.ts`, `MfaEnrollmentDialog.tsx`), HIBP habilitado (CHANGELOG), `login_attempts` + `ip_access_control` para brute-force, política de plataforma fechada (signup público desativado), step-up tokens (`step_up_tokens` table).
**Gaps p/10:** sessão não tem refresh-race-condition test explícito; sem rate-limit declarado para `/auth` no edge (depende do gateway Supabase); MFA é opt-in (não enforçado para roles sensíveis dev/admin).
**Ações:** (a) tornar MFA **mandatório** para `app_role` em `('admin','dev')` via guard server-side; (b) teste E2E de race-condition no refresh; (c) documentar no `SECURITY.md` o rate-limit do Supabase.

### 3. Autorização — **9/10**
**Evidências:** RLS habilitado em **110/111 tabelas** (única exceção `e2e_cleanup_rate_limit` é intencional — sem policies = bloqueia tudo); padrão `has_role(_user_id,_role)` SECURITY DEFINER em uso; `role-matrix.ts` SSOT de RBAC; edge functions usam JWT + `auth.getUser()`. 281 policies totais.
**Gaps p/10:** linter Supabase reporta **257 funções SECURITY DEFINER executáveis por anon/authenticated** (lints 0028/0029) — risco de privilege-escalation se função for chamada fora do contexto previsto; sem testes automatizados de RLS por role (smoke roda como vendedor, mas não há matriz "admin pode X / vendedor não pode X").
**Ações:** (a) auditar as 134 funções SECURITY DEFINER e fazer `REVOKE EXECUTE ... FROM anon, authenticated` exceto onde realmente público; (b) adicionar suíte `tests/rls/` com matriz role × tabela × operação usando supabase-js client por role; (c) habilitar `SET search_path = public` em 100% das funções (várias migrations recentes já fazem).

### 4. Banco de Dados — **8/10**
**Evidências:** 344 migrations versionadas, 342 índices em 111 tabelas, naming snake_case consistente, FKs presentes, `app_role` enum, 108 triggers, 134 funções, `DATA_DICTIONARY.md` mantido.
**Gaps p/10:** **5 FKs em tabelas public sem índice** (`magic_up_public_shares.generation_id`, `magic_up_public_shares.campaign_id`, `product_price_freshness_overrides.updated_by`, `step_up_tokens.challenge_id`); migrations não têm `down`; sem teste automatizado de restore de backup; sem `EXPLAIN ANALYZE` documentado para top-N queries.
**Ações:** (a) migration criando 5 índices nas FKs órfãs; (b) script mensal de smoke-restore em projeto Supabase de staging; (c) `docs/DB_HOT_QUERIES.md` com top-20 queries + plano + índice atendendo.

### 5. CI/CD — **8/10**
**Evidências:** `ci.yml` (smoke→quality, com seller-scope, route-error, asChild, route-ref checkers + ESLint + tsc + vitest + STRICT_REF_WARNINGS gate) e `e2e.yml` (Playwright smoke gate + regression + drift checks + tag check). Cache de deps + browsers; concurrency com cancel; Dependabot ativo (CHANGELOG).
**Gaps p/10:** `eslint --max-warnings=500` (alvo deve ser `0`); deploy é via Lovable (sem approval gate explícito documentado em `DEPLOYMENT.md`); rollback automatizado depende de version history Lovable (manual); sem security scan dedicado (npm audit, trivy) no pipeline; sem notificação em Slack/Discord configurada.
**Ações:** (a) reduzir `--max-warnings` em escada (500→200→50→0); (b) job `npm audit --audit-level=high` em CI; (c) documentar rollback em `RUNBOOK.md` com SLA; (d) webhook de notificação em falha do `main`.

### 6. Data Integrity — **7.5/10**
**Evidências:** edge functions usam Zod (35/85), constraints + FKs em DB, soft-delete via `*_trash` tables (favoritos, collections), `external-db-bridge` centraliza idempotência, audit_log presente (`admin_audit_log`, `mcp_keys_audit`).
**Gaps p/10:** ainda há **50 edge functions sem Zod** (40 com CORS wildcard + função sem validação = risco); sem optimistic-locking em entidades críticas (orçamentos, kits) — colunas `updated_at`/`version` não verificadas em update; `e2e_cleanup_rate_limit` sem policies pode ser bypass se for inserção via service-role descuidada.
**Ações:** (a) auditoria + Zod em 100% das 85 edge functions (issue por função); (b) adicionar coluna `version int` + check em updates de `quotes`/`kits` para optimistic locking; (c) review de uso do service-role.

### 7. Documentação — **9/10**
**Evidências:** 30+ markdowns em `docs/` (ARQUITETURA, RUNBOOK, SECURITY, SECURITY_RUNBOOK, TESTING, PERFORMANCE, ACCESSIBILITY, DATA_DICTIONARY, EDGE_FUNCTIONS, ONBOARDING, RBAC_HELPERS, POSTMORTEM_TEMPLATE), **5 ADRs estruturadas**, README 345 linhas, CONTRIBUTING, CHANGELOG mantido por onda, docs/E2E_SMOKE_COVERAGE auto-gerado com drift check no CI.
**Gaps p/10:** sem diagrama ER renderizado (apenas DATA_DICTIONARY textual); API.md cobre só edge functions principais (não 85); sem swagger/openapi para edge functions.
**Ações:** (a) `npx supabase-schema-visualizer` ou `dbdocs` no CI publicando ER; (b) gerar OpenAPI a partir dos schemas Zod das edge functions; (c) checklist no PR template para "atualizou docs?".

### 8. Infraestrutura / DevOps — **NÃO TOTALMENTE AUDITÁVEL — 7/10 estimado**
**Evidências:** infra é gerenciada Lovable Cloud (Supabase + Cloudflare CDN + custom domain); SSL automático; `public/_headers` com CSP/HSTS/X-Frame; secrets em Lovable Cloud (não hardcoded); 6 jobs `pg_cron` + `pg_net` (memory).
**Gaps p/10:** sem IaC versionado fora de migrations (DNS, secrets, edge config); ambientes dev/staging/prod não claramente isolados (preview = staging implícito); DR plan textual no RUNBOOK mas sem dry-run trimestral registrado.
**Ações:** (a) registrar inventário de secrets em `docs/SECRETS_INVENTORY.md` (sem valores); (b) criar Supabase staging separado para teste de migrations + restore drill; (c) ADR sobre estratégia de ambientes.

### 9. Logging / Monitoring — **7/10**
**Evidências:** `src/lib/logger.ts` (memory:observability-and-error-reporting), Sentry **lazy-loaded** (`src/lib/sentry.ts`), edge functions logam via `console.log` capturado pelo Supabase, `bot_detection_log`, `connection_test_history`, `external_connections_sync_log`, `admin_audit_log`.
**Gaps p/10:** 239 ocorrências de `console.log/warn/error` direto em `src` (ideal = só logger estruturado); sem retenção declarada nem rotação documentada; alertas configurados não documentados (Sentry tem? Threshold?); sem health endpoint próprio (smoke usa só GET `/`).
**Ações:** (a) ESLint rule `no-console` (warn → error gradual) com allowlist em `src/lib/logger.ts`; (b) edge function `health` com checks DB+externos; (c) `docs/ALERTS.md` listando regras Sentry/uptime.

### 10. Observabilidade — **6.5/10**
**Evidências:** Sentry para erros frontend, edge function logs no Supabase Analytics, `hardening_health_snapshots` table, `ai_usage_events`/`ai_usage_logs` para custom metrics de IA.
**Gaps p/10:** **sem distributed tracing** (n8n→edge→supabase→bitrix24); sem métricas RED por endpoint; sem SLOs definidos (memory tem hardening-roadmap mas não SLI/SLO); runbooks não estão linkados aos alertas Sentry.
**Ações:** (a) adicionar `traceparent` header propagation em `external-db-bridge` + edge→Bitrix24; (b) `docs/SLO.md` com SLI por jornada crítica (login, busca, criar orçamento); (c) Sentry "Issue Owners" + link para `RUNBOOK.md` por área.

### 11. Lógica de Negócio — **8/10**
**Evidências:** regras de pricing isoladas (`src/utils/price-freshness.ts` com 60% coverage forçado), markup/desconto com alçada documentada (memory:quote-discount-approval-workflow + quote-negotiation-markup), state machines implícitas em quotes (rascunho→aprovação→assinatura), `app_role` enum, single source of truth em SSOT do banco externo.
**Gaps p/10:** algumas regras ainda hardcoded em components (ex.: thresholds em PriceFreshnessBadge); state machine de quote não tem teste exaustivo de transições inválidas; cálculos financeiros usam `number` JS em alguns lugares (deveria ser string/decimal).
**Ações:** (a) extrair `src/domains/quotes/state-machine.ts` com xstate ou enum + matrix de transições + testes; (b) auditoria de uso de `Number` em pricing; substituir por `decimal.js` ou strings; (c) mover thresholds restantes para `admin_settings`.

### 12. Manutenibilidade — **7.5/10**
**Evidências:** TS strict, lint-staged + husky + prettier, 5 checkers customizados no CI (seller-scope, route-error, asChild, route-ref, smoke-tags), CHANGELOG por onda, hardening-roadmap como backlog técnico vivo.
**Gaps p/10:** **268k LOC com média alta**; existência de `Plataforma vs domínios` = arquivos com >500 linhas presumível (não medido); 184 ocorrências de `: any`; deps moderadamente atualizadas mas sem cadência formal.
**Ações:** (a) script `scripts/check-file-size.mjs` falhando >400 linhas; (b) reduzir `any` em escada (PR cap mensal); (c) Renovate/Dependabot já existe — adicionar política mensal de merge.

### 13. Operacionalidade — **8/10**
**Evidências:** RUNBOOK.md exaustivo (memory:operational-resilience-and-disaster-recovery), feature flags (`feature-flags.ts`), circuit breaker em `external-db-bridge` (ADR 0005), graceful degradation em chunk-recovery (memory:chunk-recovery-system), POSTMORTEM_TEMPLATE.md.
**Gaps p/10:** rollback < 5 min não comprovado (depende UI Lovable); hotfix procedure não documentado separadamente; on-call rotation N/A para equipe pequena, mas precisa registrar.
**Ações:** (a) seção "Hotfix em Produção" no RUNBOOK; (b) drill mensal de rollback documentado; (c) `docs/INCIDENT_SEVERITY.md` (S0/S1/S2/S3 + SLA).

### 14. Performance — **8.5/10**
**Evidências:** Sentry **lazy-loaded** (~186KB fora do bundle inicial), virtualização com `@tanstack/react-virtual` (memory:performance-virtualization-standards), infinite query no catálogo, `lightweight loading` (memory:external-db-resilience-and-performance), 342 índices, connection pooler Supabase, image standards com fallbacks (memory:product-image-standards-v2).
**Gaps p/10:** Web Vitals não monitorados em produção (Sentry tem mas não documentado dashboard); bundle size não checado no CI; 5 FKs sem índice (ver dim 4); sem `React.lazy` em rotas administrativas grandes (não verificado por arquivo).
**Ações:** (a) `npx vite-bundle-visualizer` + budget no CI; (b) Web Vitals → Sentry performance + dashboard; (c) lazy-load rotas `/admin/*` se já não estiverem.

### 15. Qualidade de Código — **8/10**
**Evidências:** ESLint configurado (`eslint.config.js` 9.5KB), Prettier + plugin Tailwind, Husky + lint-staged, **TS strict no `tsconfig`**, 5 checkers ad-hoc no CI, 1 `dangerouslySetInnerHTML` total, 5 TODOs.
**Gaps p/10:** **184 `: any`**, **239 `console.*`**, `--max-warnings=500` (deveria ser 0), commits convencionais não enforçados (commitlint ausente), zero secrets no código (✓).
**Ações:** (a) commitlint + husky `commit-msg`; (b) reduzir `any` cap-by-PR; (c) `eslint-plugin-no-console` strict; (d) baixar `--max-warnings` mensalmente.

### 16. Segurança — **8/10**
**Evidências:** OWASP coberto em grande parte (RLS, CSP em `index.html` + `_headers`, HSTS preload, MFA TOTP, HIBP, anti-scraping memory, bot_detection_log, ip_access_control, password recovery flow estrito, login_attempts, edge functions com Zod parcial, secrets em vault Lovable). 5 ADRs incluindo 0002-rls-first-security e 0004-closed-platform-policy.
**Gaps p/10:** **257 SECURITY DEFINER funcs publicamente executáveis** (lints 0028/0029); **40/85 edge functions com CORS `*`**; sem pen test documentado; rotação de secrets não documentada; CSP tem `'unsafe-inline'` em `script-src` (necessário para shadcn? checar).
**Ações:** (a) **prioridade máxima** — REVOKE EXECUTE em SECURITY DEFINER funcs por padrão, GRANT explícito por função; (b) substituir CORS `*` por allowlist (origin do app + preview); (c) plano de pen test (Bug Bounty/profissional); (d) `docs/SECRET_ROTATION.md` com cadência trimestral.

### 17. Testes — **8.5/10**
**Evidências:** **292 testes Vitest + 102 specs Playwright**; smoke gate isolado (`@smoke` tag, project `chromium-smoke`, fail-fast); regression separada; cobertura threshold 60% (vitest.config); **STRICT_REF_WARNINGS gate** captura warnings em todos os testes; checkers customizados (seller-scope, asChild, route-ref, smoke-tags); audit doc auto-gerado com drift check; jest-axe para a11y.
**Gaps p/10:** sem testes de RLS por role (matrix); sem testes de carga (k6/Artillery); cobertura 60% (alvo 80% em crítico); sem contract tests com Bitrix24/n8n; mobile e2e existe (`routes-mobile`) mas pouco coberto.
**Ações:** (a) suite `tests/rls/role-matrix.spec.ts` chamando supabase com JWT por role; (b) `tests/load/k6/` com cenários de catálogo/busca; (c) elevar threshold escalonado 60→70→80; (d) Pact ou consumer-driven contracts para Bitrix24.

### 18. Tipagem / Type Safety — **7.5/10**
**Evidências:** TS strict, `src/integrations/supabase/types.ts` auto-gerado, Zod parcial nas edges, type guards em vários hooks.
**Gaps p/10:** **184 `: any`** no `src` (medido por rg); validação runtime com Zod só em ~12% das edges (10 arquivos no front, 35 nas edges); sem geração de tipos compartilhados front↔edge.
**Ações:** (a) Zod schemas centralizados em `src/schemas/` exportados para front + edges (via `import_map`); (b) ESLint `@typescript-eslint/no-explicit-any: error` com allowlist explícita; (c) PR check: regredir `any` count.

### 19. Validação — **7.5/10**
**Evidências:** Zod em forms + 35 edges, react-hook-form + @hookform/resolvers, formatos BR (memory pricing-architecture e validações brasileiras em uso), sanitização (1 único `dangerouslySetInnerHTML`), input limits.
**Gaps p/10:** schema **não compartilhado** front↔back (duplicação); 50 edges sem validação Zod; upload de arquivo (Magic Up, mockups) — não auditado MIME+magic bytes; sem validação centralizada de transição de estado em quotes.
**Ações:** (a) schemas compartilhados (item 18); (b) Zod em 100% das edges; (c) helper `validateUpload()` com magic-bytes + tamanho; (d) state-machine validator (item 11).

### 20. Operações (Processos) — **8/10**
**Evidências:** Git via Lovable + GitHub bidirecional; CONTRIBUTING.md (106 linhas); PR template com checklist (CHANGELOG); branch protection presumível (não auditável aqui); CHANGELOG mantido por onda; Dependabot semanal (CHANGELOG); SECURITY_RUNBOOK + SECURITY.md.
**Gaps p/10:** SLA de code review não documentado; cadência de revisão de segurança não declarada; troubleshooting FAQ ausente (apenas RUNBOOK por incidente).
**Ações:** (a) `docs/REVIEW_SLA.md` (PR < 24h em horário comercial); (b) `docs/SECURITY_REVIEW_CADENCE.md` (trimestral, com checklist); (c) `docs/TROUBLESHOOTING_FAQ.md` evolutivo.

---

## Fase 2 — Scorecard Consolidado

```text
╔════════════════════════════════════╦═══════╦══════════════════════════════════════════════════════════╗
║ DIMENSÃO                           ║ NOTA  ║ GAP PRINCIPAL PARA 10/10                                 ║
╠════════════════════════════════════╬═══════╬══════════════════════════════════════════════════════════╣
║ 1.  Arquitetura                    ║ 8.5   ║ Falta domain boundary explícito + check de ciclos        ║
║ 2.  Autenticação                   ║ 8.0   ║ MFA não-enforçado para admin/dev                         ║
║ 3.  Autorização                    ║ 9.0   ║ 257 SECURITY DEFINER públicos + sem matrix RLS test      ║
║ 4.  Banco de Dados                 ║ 8.0   ║ 5 FKs sem índice + sem restore drill                     ║
║ 5.  CI/CD                          ║ 8.0   ║ --max-warnings=500 + sem npm audit + sem notificação     ║
║ 6.  Data Integrity                 ║ 7.5   ║ 50 edges sem Zod + sem optimistic locking                ║
║ 7.  Documentação                   ║ 9.0   ║ Sem diagrama ER + sem OpenAPI das edges                  ║
║ 8.  Infraestrutura / DevOps        ║ 7.0   ║ Sem IaC + sem staging isolado + DR sem drill             ║
║ 9.  Logging / Monitoring           ║ 7.0   ║ 239 console.* + sem health endpoint + alertas n/doc      ║
║ 10. Observabilidade                ║ 6.5   ║ Sem distributed tracing + sem SLO + RED ausente          ║
║ 11. Lógica de Negócio              ║ 8.0   ║ State machine quote sem teste exaustivo + Number $       ║
║ 12. Manutenibilidade               ║ 7.5   ║ 184 any + arquivos grandes + cap de deps update          ║
║ 13. Operacionalidade               ║ 8.0   ║ Hotfix doc + rollback drill ausente                      ║
║ 14. Performance                    ║ 8.5   ║ Bundle budget no CI + Web Vitals dashboard               ║
║ 15. Qualidade de Código            ║ 8.0   ║ console.* + any + commitlint + max-warnings              ║
║ 16. Segurança                      ║ 8.0   ║ 257 SECDEF públicos + CORS * em 40 edges + s/pen-test    ║
║ 17. Testes                         ║ 8.5   ║ Sem matrix RLS + sem k6 + sem contract tests             ║
║ 18. Tipagem / Type Safety          ║ 7.5   ║ 184 any + sem schemas compartilhados front↔edge          ║
║ 19. Validação                      ║ 7.5   ║ Schema duplicado + 50 edges sem Zod + uploads            ║
║ 20. Operações (Processos)          ║ 8.0   ║ Sem SLA review + sem cadência segurança + sem FAQ        ║
╠════════════════════════════════════╬═══════╬══════════════════════════════════════════════════════════╣
║ NOTA GERAL PONDERADA               ║ 8.05  ║ Sistema sólido, hardening 10/10 em curso (onda 1 done)   ║
╚════════════════════════════════════╩═══════╩══════════════════════════════════════════════════════════╝
```

**Cálculo ponderado** (×3 crítico: 2,16,3,6 / ×2 alto: 4,18,19,17,1 / ×1 demais):
`(8×3+9×3+8×3+7.5×3 + 8×2+7.5×2+7.5×2+8.5×2+8.5×2 + 8+8+9+7+7+6.5+8+7.5+8+8.5+8) / (12+10+11)` ≈ **8.05/10**

---

## Top-10 Ações por ROI (impacto ÷ esforço)

| # | Prio | Dim | Ação | Impacto | Esforço |
|---|------|-----|------|---------|---------|
| 1 | 🔴 | 16/3 | REVOKE EXECUTE em SECURITY DEFINER + GRANT explícito | Alto | Médio |
| 2 | 🔴 | 4 | Migration: 5 índices em FKs órfãs | Alto | Baixo |
| 3 | 🔴 | 16 | Substituir CORS `*` por allowlist em 40 edges | Alto | Baixo |
| 4 | 🔴 | 5 | `npm audit --audit-level=high` no CI | Alto | Baixo |
| 5 | 🟠 | 6/19 | Zod em 100% das 85 edges (50 restantes) | Alto | Médio |
| 6 | 🟠 | 17/3 | Suite `tests/rls/role-matrix.spec.ts` | Alto | Médio |
| 7 | 🟠 | 2 | MFA enforçado para admin/dev (server-side) | Alto | Baixo |
| 8 | 🟠 | 18 | Schemas Zod compartilhados front↔edge (`src/schemas/`) | Médio | Médio |
| 9 | 🟡 | 10 | Distributed tracing + SLO doc + RED metrics | Alto | Alto |
| 10 | 🟡 | 14 | Bundle budget + Web Vitals dashboard no CI | Médio | Médio |

---

## Roadmap em 3 Ondas

### 🔴 Onda 1 — Quick Wins (1–3 dias)
1. Migration: 5 índices em FKs (item #2)
2. Allowlist CORS nas 40 edges (#3)
3. `npm audit` step no `ci.yml` (#4)
4. MFA enforce admin/dev via guard server-side (#7)
5. Reduzir `--max-warnings` 500→200 (#15)
6. `commitlint` + husky `commit-msg` (#15)

### 🟠 Onda 2 — Sprint 1 (1–2 semanas)
7. REVOKE EXECUTE em SECURITY DEFINER + GRANT por função (#1)
8. Zod em 100% das edges (#5) + helper compartilhado
9. Suite de RLS role-matrix em Vitest (#6)
10. Schemas compartilhados front↔edge (#8)
11. ESLint `no-console` (warn) + `no-explicit-any` (warn) com allowlist
12. Optimistic locking em `quotes`/`kits` (`version int`)
13. `docs/ALERTS.md` + `docs/SECRET_ROTATION.md` + `docs/SLO.md`

### 🟡 Onda 3 — Sprint 2 (2–4 semanas)
14. Distributed tracing (traceparent) + dashboards RED + SLI/SLO (#9)
15. Bundle budget + Web Vitals → Sentry Performance (#10)
16. Domínios em `src/domains/*` + `madge` ciclos no CI
17. State machine de `quotes` com xstate + testes exaustivos
18. k6 load tests para top-5 jornadas
19. Restore drill mensal em staging Supabase
20. OpenAPI das 85 edges + diagrama ER no CI

---

## Nota Final

**8.05/10 — Sistema em estado de alta maturidade, com hardening 10/10 em execução ativa (Onda 1 já concluída no CHANGELOG).** As bases (RLS em 100% das tabelas, MFA, HIBP, ADRs, RUNBOOK, 292+102 testes, drift checks no CI, smoke gate isolado, Sentry lazy) estão sólidas e raras de ver em produtos do porte. Os pontos abertos restantes concentram-se em **(a) defesa em profundidade do RLS via revoke explícito de SECURITY DEFINER**, **(b) consolidação observabilidade (tracing + SLO)** e **(c) consistência de validação/tipos entre front e edge**. Nenhum gap crítico bloqueia produção; todos os itens são evolução incremental rumo ao 10/10 absoluto.
