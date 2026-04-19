---
name: production-hardening-baseline
description: Baseline de hardening pré-produção (Ondas 1-4) — storage privado, realtime isolado, HIBP, MFA admin obrigatório, tokens com expiração + auto-lock após 5 falhas/h, CSP sem unsafe-eval, pg_trgm em schema dedicado, Security Center com anomalias 24h e force-global-logout
type: feature
---

# Production Hardening Baseline

Status: Ondas 1-4 do plano de defesa pré-produção aplicadas. Item de rate-limit em edge functions permanece como gap conhecido (sem primitivos de backend consolidados).

## Onda 1 — Crítico ✅
1. **Storage**: 4 buckets (`personalization-images`, `product-videos`, `supplier-logos`, `component-media`) tornados **privados**. Policies `Authenticated can read X` e `Authenticated can read protected buckets` removidas. Mantém `Authenticated direct read X` (exige `name IS NOT NULL`) — bloqueia `list()` mas permite leitura por path conhecido. Admins têm policy separada para listagem.
2. **Realtime**: removidas `discount_approval_requests`, `kit_comments`, `kit_variants` da publicação `supabase_realtime`. Avisos viram via `workspace_notifications` (já protegida por RLS).
3. **HIBP + sign-up**: `password_hibp_enabled=true`, `disable_signup=true`, `external_anonymous_users_enabled=false`.

## Onda 2 — Alto ✅
4. **Tokens públicos** ✅ COMPLETO (Onda 4): `expires_at` default `now() + 30 days` em `quote_approval_tokens` e `kit_share_tokens`. Tabela `public_token_failures` (RLS: admin SELECT, service_role INSERT) + função `record_public_token_failure(...)` que expira todos os tokens de um quote/kit após **5 falhas em 1h**. **Wire-up ativo** em `quote-public-view` e `kit-public-view`: gravam falha com IP+UA em `token_not_found`, `token_expired`, `token_revoked`.
5. **CSP**: removido `'unsafe-eval'` do `script-src` em `public/_headers`. Adicionado `Cross-Origin-Embedder-Policy: credentialless`.
6. **MFA admin obrigatório**: `AuthContext` expõe `currentAAL`, `nextAAL`, `hasMFA`, `mfaRequired`, `refreshAAL`. `AdminRoute` bloqueia acesso de admin/manager se não houver MFA (abre `MfaEnrollmentDialog` em modo `enforce`) ou se sessão estiver em aal1 (abre `MfaChallengeDialog`). Componentes em `src/components/security/`.

## Onda 3 — Médio ✅
8. **`pg_trgm`** movido de `public` → `extensions`. `search_path` do banco atualizado para `"$user", public, extensions`.

## Onda 4 — Security Center 10/10 ✅
9. **Página `/admin/seguranca-acesso` ganhou aba "Anomalias 24h"** (`AnomalyCards`): 4 cards lendo direto via RLS de admin — falhas de login (login_attempts), bots bloqueados (bot_detection_log), falhas de token público (public_token_failures), IPs distintos em tokens. Auto-refresh 30s. Limiares de severidade visual (low/medium/high) com cores semânticas.
10. **Botão "Forçar logout global"** no header da página (`ForceGlobalLogoutDialog`): edge function `force-global-logout` (admin-only, paginação 1000/página em `auth.admin.listUsers`, signOut global por usuário, exclui caller). Confirmação por digitação literal de `FORCE_LOGOUT_ALL`. Auditoria gravada em `admin_audit_log` com IP+UA+counts.

## Itens não aplicados (decisão arquitetural)
- **Rate limit em edge functions sensíveis** (item 7): backend não tem primitivos de rate-limit consolidados; finding tratado como gap conhecido (instrução de plataforma proíbe ad-hoc).

## Wire-ups pós-deploy
- Admin existente sem MFA cadastrado: ao acessar qualquer rota `/admin/*` aparece dialog de enrollment obrigatório (não pode ser fechado sem cadastrar ou sair).
- Para validar MFA flow: signOut → signIn → AAL fica em aal1 → AdminRoute mostra challenge → após verify → AAL2 → libera.
- Buckets privados: novos uploads precisam usar `getPublicUrl()` (continua funcionando enquanto policy `Authenticated direct read X` existir e o caller estiver logado) ou signed URLs para acesso anônimo.
- Force-global-logout: usar APENAS após incidente confirmado. Equipe inteira precisará re-autenticar (com MFA para admins).
