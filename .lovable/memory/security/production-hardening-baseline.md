---
name: production-hardening-baseline
description: Baseline de hardening pré-produção (Ondas 1-3) — storage privado, realtime isolado, HIBP, MFA admin obrigatório, tokens com expiração + brute-force lock, CSP sem unsafe-eval, pg_trgm em schema dedicado
type: feature
---

# Production Hardening Baseline

Status: Ondas 1-3 do plano de defesa pré-produção aplicadas.

## Onda 1 — Crítico ✅
1. **Storage**: 4 buckets (`personalization-images`, `product-videos`, `supplier-logos`, `component-media`) tornados **privados**. Policies `Authenticated can read X` e `Authenticated can read protected buckets` removidas. Mantém `Authenticated direct read X` (exige `name IS NOT NULL`) — bloqueia `list()` mas permite leitura por path conhecido. Admins têm policy separada para listagem.
2. **Realtime**: removidas `discount_approval_requests`, `kit_comments`, `kit_variants` da publicação `supabase_realtime`. Avisos viram via `workspace_notifications` (já protegida por RLS).
3. **HIBP + sign-up**: `password_hibp_enabled=true`, `disable_signup=true`, `external_anonymous_users_enabled=false`.

## Onda 2 — Alto ✅
4. **Tokens públicos**: `expires_at` default `now() + 30 days` em `quote_approval_tokens` e `kit_share_tokens`. Tabela `public_token_failures` (RLS: admin SELECT, service_role INSERT) + função `record_public_token_failure(...)` que expira todos os tokens de um quote/kit após **5 falhas em 1h**.
5. **CSP**: removido `'unsafe-eval'` do `script-src` em `public/_headers`. Adicionado `Cross-Origin-Embedder-Policy: credentialless`.
6. **MFA admin obrigatório**: `AuthContext` expõe `currentAAL`, `nextAAL`, `hasMFA`, `mfaRequired`, `refreshAAL`. `AdminRoute` bloqueia acesso de admin/manager se não houver MFA (abre `MfaEnrollmentDialog` em modo `enforce`) ou se sessão estiver em aal1 (abre `MfaChallengeDialog`). Componentes em `src/components/security/`.

## Onda 3 — Médio ✅
8. **`pg_trgm`** movido de `public` → `extensions`. `search_path` do banco atualizado para `"$user", public, extensions`.

## Itens não aplicados (decisão arquitetural)
- **Rate limit em edge functions** (item 7): backend ainda não tem primitivos consolidados; finding tratado como gap conhecido.
- **Brute-force tokens** (item 4): proteção via `record_public_token_failure` precisa ser invocada nas edge functions `quote-public-view` e `kit-public-view` — invocação ad-hoc fica como follow-up.

## Wire-ups pós-deploy
- Admin existente sem MFA cadastrado: ao acessar qualquer rota `/admin/*` aparece dialog de enrollment obrigatório (não pode ser fechado sem cadastrar ou sair).
- Para validar MFA flow: signOut → signIn → AAL fica em aal1 → AdminRoute mostra challenge → após verify → AAL2 → libera.
- Buckets privados: novos uploads precisam usar `getPublicUrl()` (continua funcionando enquanto policy `Authenticated direct read X` existir e o caller estiver logado) ou signed URLs para acesso anônimo.
