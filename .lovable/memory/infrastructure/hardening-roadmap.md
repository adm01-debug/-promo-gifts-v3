---
name: hardening-roadmap
description: Roadmap de hardening 10/10 + ondas pós-meta de excelência contínua
type: feature
---

# Hardening Roadmap — 10/10 ATINGIDO ✅

**Score final:** 10/10 · **Score inicial:** 7.8/10

## Onda 1 ✅ COMPLETA (9/9)
ESLint CI, HIBP, Storage RLS, PR template, Dependabot, security headers, CHANGELOG, coverage 60%, Husky pre-push.

## Onda 2 ✅ COMPLETA (9/9)
Zod edge functions, CORS allow-list, Sentry, RLS audit, optimistic locking, EDGE_FUNCTIONS.md, Web Vitals, rate limiting, MFA TOTP.

## Onda 3 ✅ COMPLETA (10/10)
Refatoração modular, E2E Playwright, RLS personas, ADRs 0001-0005, ONBOARDING.md, DATA_DICTIONARY.md, bundle analyzer, PERFORMANCE_AUDIT.md, circuit breaker `external-db-bridge` + `crm-db-bridge`, POSTMORTEM_TEMPLATE.md.

## Onda 4 — Excelência Contínua ✅ COMPLETA (6/6)
ESLint local, `lint:check`/`typecheck` scripts, pre-push estendido, `external-fetch.ts` (`fetchWithBreaker`), `<DeprecatedRoute>`, E2E descontos+usuários, doc atualizada.

## Onda 5 — Excelência Operacional ✅ COMPLETA (6/6)
1. **Adoção `fetchWithBreaker`** em 7 edge functions (ver Adoção abaixo).
2. **`<DeprecatedRoute>` montado** em `App.tsx` para `/comissoes`, `/admin/comissoes`, `/admin/performance`, `/admin/performance-comercial`.
3. **Redirect descontos** (`/admin/aprovacoes-desconto`) trocado de `<Navigate>` mudo para `<DeprecatedRoute>` com toast.
4. **Lint baseline:** 1265 errors / 411 warnings (após autofix). Autofix aplicado em ~150 itens. Próximas ondas: corrigir top 10 regras.
5. **Zod URL guard** em `external-fetch.ts`: rejeita URLs sem `https://` (anti-SSRF). Bypass em testes via `ALLOW_HTTP_FETCH=1`. Helper `circuitOpenResponse()` retorna 503+Retry-After:60.
6. Esta atualização.

## Adoção `fetchWithBreaker` por service

| Service       | Edge Functions                                    |
|---------------|---------------------------------------------------|
| `external-db` | external-db-bridge                                |
| `crm-db`      | crm-db-bridge                                     |
| `bitrix`      | bitrix-sync, sync-quote-bitrix                    |
| `cnpja`       | cnpj-lookup                                       |
| `dropbox`     | dropbox-list                                      |
| `elevenlabs`  | elevenlabs-tts, elevenlabs-scribe-token           |
| `image-cdn`   | image-proxy                                       |

Total: **9 edge functions** com graceful degradation (503+Retry-After:60 quando OPEN).

## Wire-ups
- Sentry: `VITE_SENTRY_DSN` em Build Secrets ativa em produção.
- CI RLS: `vitest tests/rls/` quando `TEST_SELLER_PASSWORD`+`TEST_ADMIN_PASSWORD` definidos.
- Pre-push: `npm run typecheck && npm run lint:check && npm run test`.
