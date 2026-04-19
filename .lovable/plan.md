
Ondas 1-7 entregues. Baseline 10/10 atingido, validado e auto-monitorado (cron de regressão diário). Não há trabalho de hardening pendente sem inventar escopo. Proponho **Onda 8 — Telemetria executiva e auto-cura** com 3 itens reais e mensuráveis.

# Plano: Hardening Onda 8 — Telemetria Executiva (3 itens)

## 1. Métricas históricas de hardening (7/30 dias)
Nova tabela `hardening_health_snapshots` (score, failures, snapshot_at). Função `snapshot_hardening_status()` SECURITY DEFINER chamada pelo cron existente das 04:00 UTC (logo após `notify_hardening_regression`). Componente `HardeningTrendChart.tsx` com sparkline 30d ao lado do `HardeningHealthCard`. Permite ver se houve oscilação mesmo que o estado atual seja 5/5.

## 2. Auto-bloqueio de IPs com ≥30 ofensas em 1h
Função `auto_block_extreme_offenders()` SECURITY DEFINER que detecta IPs com `login_attempts(success=false) + public_token_failures + bot_detection_log(blocked)` ≥30 na última hora e ainda não bloqueados, e os insere em `ip_access_control` com `expires_at = now() + 6h` + entrada em `admin_audit_log` (action=`auto_ip_block`). Cron a cada 15 min. Notifica admins via `workspace_notifications` quando dispara (categoria `security`, dedupe 1h por IP).

## 3. Aba "Histórico & Auto-defesa" no Security Center
Nova aba que mostra: gráfico de saúde 30d, lista dos últimos 20 auto-bloqueios (filtro `action='auto_ip_block'` em `admin_audit_log`), e contador "auto-bloqueios nos últimos 7 dias". Read-only via RLS de admin existente.

## Arquivos esperados
- **Novos**: `src/components/admin/security/HardeningTrendChart.tsx`, `src/components/admin/security/AutoDefenseTab.tsx`.
- **Modificados**: `src/pages/admin/AdminSegurancaAcessoPage.tsx` (1 nova aba), `.lovable/memory/security/production-hardening-baseline.md` (Onda 8).
- **Migrações**: 1 — tabela `hardening_health_snapshots` + RLS admin-only + funções `snapshot_hardening_status()` e `auto_block_extreme_offenders()` + 2 crons (`snapshot-hardening-daily` 04:05 UTC, `auto-block-extreme-offenders` `*/15 * * * *`).

Após aprovação executo na ordem: migração → componentes → aba na página → memória.
