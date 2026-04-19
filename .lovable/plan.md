
A Onda 4 de hardening foi entregue (anomalias 24h + force-global-logout + token failure tracking). O baseline 10/10 do plano original está completo. O único gap conhecido é rate-limit per-user em edge functions, mas a instrução de plataforma proíbe implementar (sem primitivos consolidados).

Não vou inventar trabalho fictício. Proponho **Onda 5 — Polimento Operacional do Security Center**, focado em 4 melhorias reais e mensuráveis que elevam o módulo de segurança ao nível "production-grade observability".

# Plano: Hardening Onda 5 — Security Center Operacional (4 itens)

## Onda A — Visibilidade
1. **Aba "Auditoria recente"** em `/admin/seguranca-acesso` — tabela paginada das últimas 50 entradas de `admin_audit_log` com filtros por ação (force_global_logout, role_change, ip_block) e por admin. Drill-down mostra `details` JSON formatado + IP + UA. Read-only via RLS de admin existente.

2. **Aba "Tokens públicos suspeitos"** — lista quotes/kits com >3 falhas em 24h (de `public_token_failures`), agrupado por `resource_id`, mostra: número de falhas, IPs distintos, primeira/última tentativa, status atual do token. Botão "Revogar token agora" (admin-only) que força `status='expired'`.

## Onda B — Resposta a incidente
3. **Botão "Bloquear IP suspeito"** inline nos cards de anomalia — quando um IP aparece em ≥10 falhas de login OU ≥5 falhas de token em 1h, mostra ação rápida que insere em `ip_access_control` com `list_type='block'` e `expires_at = now() + 24h`. Usa edge function `block-ip-temporarily` (admin-only, valida formato IPv4/IPv6).

## Onda C — Documentação
4. **Atualizar `mem://security/production-hardening-baseline`** + criar `docs/SECURITY_RUNBOOK.md` curto (1 página) documentando: como usar Security Center, quando acionar force-global-logout, como interpretar anomalias 24h, escalation path. Atualizar `mem://architecture/operational-resilience-and-disaster-recovery` referenciando o novo runbook.

## Arquivos esperados
- **Novos**: `src/components/admin/security/RecentAuditTable.tsx`, `src/components/admin/security/SuspiciousTokensPanel.tsx`, `src/components/admin/security/BlockIpButton.tsx`, `supabase/functions/block-ip-temporarily/index.ts`, `docs/SECURITY_RUNBOOK.md`.
- **Modificados**: `src/pages/admin/AdminSegurancaAcessoPage.tsx` (2 novas abas), `src/components/admin/security/AnomalyCards.tsx` (integrar BlockIpButton), `.lovable/memory/security/production-hardening-baseline.md`, `.lovable/memory/architecture/operational-resilience-and-disaster-recovery.md`.

Sem migrações novas — usa `admin_audit_log`, `public_token_failures`, `ip_access_control` já existentes. Após aprovação executo os 4 itens sequencialmente até build TS limpo.
