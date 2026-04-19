
Onda 6 já proposta e aprovação pendente. Re-apresento o mesmo plano focado para o usuário aprovar e eu executar.

# Plano: Hardening Onda 6 — Polimento Final (3 itens)

## 1. Aba "IPs ativos" no Security Center
Lista paginada de `ip_access_control` com filtro allow/block, status (ativo/expirado), criado por, motivo. Ações inline: revogar bloqueio antecipadamente, estender expiração, converter temporário em permanente. Read+write via RLS de admin existente. Componente `ActiveIpsList.tsx`.

## 2. Card "Saúde do Hardening" no topo de `/admin/seguranca-acesso`
Checklist visual (✓/✗) lendo o estado real do sistema:
- HIBP ativo + sign-up desabilitado (via `auth.config`)
- 4 buckets storage privados
- Realtime sem tabelas sensíveis (`discount_approval_requests`, `kit_variants`, `kit_comments`)
- pg_trgm em schema `extensions`
- MFA admin obrigatório (já enforced no AdminRoute)
- Cleanup automático ativo

Score consolidado (X/6) com badge colorido. Componente `HardeningHealthCard.tsx` — usa `supabase.rpc` em função SECURITY DEFINER nova `check_hardening_status()` para leituras seguras.

## 3. Cleanup automático via pg_cron
Função `cleanup_security_logs()` SECURITY DEFINER que limpa:
- `public_token_failures` > 90 dias
- `bot_detection_log` > 90 dias
- `admin_audit_log` > 365 dias (preserva histórico anual)
- `ip_access_control` com `expires_at < now() - 30 days`

Job pg_cron diário às 03:30 UTC. Migração nova: 1 (função + cron).

## Arquivos esperados
- **Novos**: `src/components/admin/security/ActiveIpsList.tsx`, `src/components/admin/security/HardeningHealthCard.tsx`, `supabase/migrations/<ts>_cleanup_security_logs.sql`.
- **Modificados**: `src/pages/admin/AdminSegurancaAcessoPage.tsx` (1 nova aba + card no topo), `.lovable/memory/security/production-hardening-baseline.md` (documentar Onda 6).

Após aprovação, executo os 3 itens sequencialmente até build TS limpo + migração validada.
