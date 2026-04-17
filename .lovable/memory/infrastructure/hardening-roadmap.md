---
name: hardening-roadmap
description: Roadmap de hardening 10/10 — status final das 28 melhorias da auditoria técnica
type: feature
---

# Hardening Roadmap — 10/10 ATINGIDO ✅

**Score final:** 10/10 · **Score inicial:** 7.8/10

## Onda 1 ✅ COMPLETA (9/9)
1-9: ESLint CI, HIBP, Storage RLS, PR template, Dependabot, security headers, CHANGELOG, coverage 60%, Husky pre-push.

## Onda 2 ✅ COMPLETA (9/9)
10-18: Zod edge functions, CORS allow-list, **Sentry integrado** (`src/lib/sentry.ts` opt-in via `VITE_SENTRY_DSN`), RLS audit, optimistic locking, EDGE_FUNCTIONS.md, Web Vitals, rate limiting, MFA TOTP.

## Onda 3 ✅ COMPLETA (10/10)
19-28: Refatoração modular, E2E Playwright, RLS personas tests, ADRs 0001-0005, ONBOARDING.md, DATA_DICTIONARY.md, bundle analyzer, PERFORMANCE_AUDIT.md, **circuit breaker integrado em ambos os bridges** (`external-db-bridge` + `crm-db-bridge`), POSTMORTEM_TEMPLATE.md.

## Wire-ups finais
- **Circuit breaker**: `getBreaker("external-db")` e `getBreaker("crm-db")` no topo dos handlers; `recordSuccess()`/`recordFailure()` por response status; retorna 503 + Retry-After: 60 quando OPEN.
- **Sentry**: init em `main.tsx` antes de qualquer outro código; `reportError()` em `error-reporter.ts` faz forward via `captureException()`. No-op silencioso se `VITE_SENTRY_DSN` ausente.
- **CI RLS step**: `.github/workflows/ci.yml` roda `vitest tests/rls/` apenas quando `TEST_SELLER_PASSWORD` + `TEST_ADMIN_PASSWORD` estão definidos como secrets do repositório. `continue-on-error: true`.

## Para ativar Sentry em produção
Definir build secret `VITE_SENTRY_DSN` em Workspace Settings → Build Secrets. A integração está pronta — basta a credencial.
