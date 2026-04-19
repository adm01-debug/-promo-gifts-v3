---
name: production-hardening-baseline
description: Baseline de hardening pré-produção (Ondas 1-7) — storage privado, realtime isolado, HIBP, MFA admin obrigatório, tokens com expiração + auto-lock após 5 falhas/h, CSP sem unsafe-eval, pg_trgm em schema dedicado, Security Center com anomalias 24h + auditoria + tokens suspeitos + force-global-logout + bloqueio temporário de IP + IPs ativos + saúde do hardening + cleanup automático diário + Top IPs ofensores 24h + alerta automático de regressão de hardening via pg_cron
type: feature
---

# Production Hardening Baseline

Status: Ondas 1-7 completas. Linter Supabase 0 warnings. Item de rate-limit em edge functions permanece como gap conhecido (sem primitivos de backend consolidados).

## Onda 1 — Crítico ✅
1. **Storage**: 4 buckets privados (`personalization-images`, `product-videos`, `supplier-logos`, `component-media`).
2. **Realtime**: removidas `discount_approval_requests`, `kit_comments`, `kit_variants` da publicação.
3. **HIBP + sign-up**: `password_hibp_enabled=true`, `disable_signup=true`.

## Onda 2 — Alto ✅
4. **Tokens públicos**: `expires_at` default 30 dias + tabela `public_token_failures` + função `record_public_token_failure(...)` que expira tokens após 5 falhas/h. Wire-up em `quote-public-view` e `kit-public-view`.
5. **CSP**: removido `'unsafe-eval'`, adicionado `Cross-Origin-Embedder-Policy: credentialless`.
6. **MFA admin obrigatório**: `AdminRoute` bloqueia admin/manager sem MFA.

## Onda 3 — Médio ✅
8. **`pg_trgm`** movido `public` → `extensions`.

## Onda 4 — Security Center ✅
9. **Aba "Anomalias 24h"** (`AnomalyCards`): 4 cards lendo via RLS de admin, auto-refresh 30s.
10. **Force global logout** (`ForceGlobalLogoutDialog` + edge `force-global-logout`): admin-only, confirmação `FORCE_LOGOUT_ALL`, auditoria automática.

## Onda 5 — Operacional 10/10 ✅
11. **Aba "Auditoria recente"** (`RecentAuditTable`).
12. **Aba "Tokens suspeitos"** (`SuspiciousTokensPanel`).
13. **Bloqueio temporário de IP** (`BlockIpButton` + edge `block-ip-temporarily`).
14. **Runbook operacional**: `docs/SECURITY_RUNBOOK.md`.

## Onda 6 — Polimento Final ✅
15. **Aba "IPs ativos"** (`ActiveIpsList`): gestão completa de `ip_access_control`.
16. **Card "Saúde do Hardening"** (`HardeningHealthCard`) com score 5/5 via RPC `check_hardening_status()`.
17. **Cleanup automático diário** via pg_cron `cleanup-security-logs-daily` (03:30 UTC) + função `cleanup_security_logs()`.

## Onda 7 — Defesa em Profundidade ✅
18. **Linter Supabase**: 0 warnings (verificado em 2026-04-19).
19. **Top IPs ofensores 24h** (`TopOffenderIpsCard`) na aba Anomalias: agrega `login_attempts` (falhas) + `public_token_failures` + `bot_detection_log` (blocked) por IP, mostra os 10 piores com breakdown por categoria e botão "Bloquear IP" inline (reusa `BlockIpButton`). Auto-refresh 60s.
20. **Alerta automático de regressão** via pg_cron `hardening-regression-check-daily` (04:00 UTC) executando `notify_hardening_regression()` SECURITY DEFINER. Reavalia os mesmos 5 itens de `check_hardening_status()`; se score < 5, insere `workspace_notification` (categoria `security`, type `warning`) para todos os admins. Deduplicação por janela de 20h evita spam diário caso a regressão persista.

## Itens não aplicados (decisão arquitetural)
- **Rate limit em edge functions sensíveis** (item 7): backend não tem primitivos consolidados; finding tratado como gap conhecido.

## Wire-ups pós-deploy
- Buckets privados: novos uploads usam `getPublicUrl()` ou signed URLs.
- Force-global-logout: APENAS após incidente confirmado.
- Bloqueio temporário de IP: usar para resposta rápida (24h padrão); aba "IPs ativos" permite estender ou tornar permanente. Top ofensores 24h facilita identificação visual.
- Auditoria: tudo crítico (force-logout, ip_block_temporary, role_change) registrado em `admin_audit_log` com IP+UA. Cleanup preserva 365 dias.
- Saúde do hardening: monitorar score 5/5 — qualquer regressão (ex: bucket virou público, cron desligado) gera notificação automática para admins na manhã seguinte (04:00 UTC).
