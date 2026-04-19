---
name: production-hardening-baseline
description: Baseline de hardening pré-produção (Ondas 1-6) — storage privado, realtime isolado, HIBP, MFA admin obrigatório, tokens com expiração + auto-lock após 5 falhas/h, CSP sem unsafe-eval, pg_trgm em schema dedicado, Security Center com anomalias 24h + auditoria + tokens suspeitos + force-global-logout + bloqueio temporário de IP + IPs ativos com gestão completa + saúde do hardening + cleanup automático diário via pg_cron
type: feature
---

# Production Hardening Baseline

Status: Ondas 1-6 completas. Item de rate-limit em edge functions permanece como gap conhecido (sem primitivos de backend consolidados).

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
11. **Aba "Auditoria recente"** (`RecentAuditTable`): últimas 50 entradas de `admin_audit_log` com filtro por ação/admin, busca, drill-down JSON. Auto-refresh 30s.
12. **Aba "Tokens suspeitos"** (`SuspiciousTokensPanel`): agrupa `public_token_failures` por `resource_id` (>3 falhas/24h), mostra IPs distintos + razões + timestamps. Botão "Revogar" força `status='expired'` em `quote_approval_tokens` ou `kit_share_tokens`.
13. **Bloqueio temporário de IP** (`BlockIpButton` + edge `block-ip-temporarily`): botão inline em `AnomalyCards` quando há atividade suspeita (≥10 falhas login OU ≥5 token OU ≥20 bots). Insere em `ip_access_control` com `expires_at` configurável (1-720h, default 24h). Auditoria completa em `admin_audit_log` com action `ip_block_temporary`.
14. **Runbook operacional**: `docs/SECURITY_RUNBOOK.md` — guia 1 página: como usar Security Center, quando acionar force-logout, interpretação de anomalias, escalation path, checklist pós-incidente.

## Onda 6 — Polimento Final ✅
15. **Aba "IPs ativos"** (`ActiveIpsList`): tabela completa de `ip_access_control` com filtros allow/block/ativo/expirado + busca por IP/motivo. Ações inline: revogar, estender +24h, converter temporário em permanente. Gestão direta via Supabase (RLS admin existente).
16. **Card "Saúde do Hardening"** (`HardeningHealthCard`) no topo de `/admin/seguranca-acesso`: checklist visual (✓/✗) com score X/5 lendo estado real via RPC `check_hardening_status()` (SECURITY DEFINER, admin-only). Verifica: 4 buckets privados, realtime isolado, pg_trgm em extensions, MFA enforced, cleanup job ativo.
17. **Cleanup automático diário** via pg_cron (`cleanup-security-logs-daily`, 03:30 UTC) executando `cleanup_security_logs()` SECURITY DEFINER que limpa: `public_token_failures` >90d, `bot_detection_log` >90d, `admin_audit_log` >365d, `ip_access_control` com expires_at <30d atrás. Retenção de auditoria preserva 1 ano de histórico.

## Itens não aplicados (decisão arquitetural)
- **Rate limit em edge functions sensíveis** (item 7): backend não tem primitivos consolidados; finding tratado como gap conhecido.

## Wire-ups pós-deploy
- Buckets privados: novos uploads usam `getPublicUrl()` ou signed URLs.
- Force-global-logout: APENAS após incidente confirmado.
- Bloqueio temporário de IP: usar para resposta rápida (24h padrão); aba "IPs ativos" permite estender ou tornar permanente.
- Auditoria: tudo crítico (force-logout, ip_block_temporary, role_change) registrado em `admin_audit_log` com IP+UA. Cleanup preserva 365 dias.
- Saúde do hardening: monitorar score 5/5 — qualquer regressão (ex: bucket virou público) aparece no card sem precisar consultar logs.
