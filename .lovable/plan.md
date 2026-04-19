
Ondas 1-6 entregues. Baseline 10/10 atingido e validado (build TS limpo, cron ativo, score 5/5 no card de saúde). O único gap conhecido (rate-limit per-user em edge functions) é proibido pela plataforma.

Não vou inventar trabalho. Proponho **Onda 7 — Defesa em profundidade**, focada em 3 itens reais, pequenos e mensuráveis que ainda agregam valor sem inflar escopo.

# Plano: Hardening Onda 7 — Defesa em Profundidade (3 itens)

## 1. Linter Supabase + correção de warnings residuais
Rodar `supabase--linter` e tratar 100% das advertências restantes (provavelmente: search_path em funções, policies redundantes, índices faltantes em FKs sensíveis). Migração consolidada apenas com o que o linter apontar.

## 2. Painel "Top IPs ofensores 24h" no Security Center
Card compacto na aba Anomalias listando os 10 IPs com mais falhas combinadas (login + token + bot) nas últimas 24h, com ação rápida "Bloquear" ao lado de cada linha. Reusa `BlockIpButton`. Componente novo `TopOffenderIpsCard.tsx`. Read-only via RLS de admin.

## 3. Alerta automático de regressão de hardening
Se `check_hardening_status()` retornar score < 5/5, disparar `workspace_notification` (categoria `security`, type `warning`) para todos os admins — uma vez por dia, deduplicado. Implementação: nova função `notify_hardening_regression()` SECURITY DEFINER + cron diário às 04:00 UTC (logo após o cleanup das 03:30).

## Arquivos esperados
- **Novos**: `src/components/admin/security/TopOffenderIpsCard.tsx`.
- **Modificados**: `src/components/admin/security/AnomalyCards.tsx` (montar o novo card abaixo dos 4 existentes), `.lovable/memory/security/production-hardening-baseline.md` (Onda 7).
- **Migrações**: 1 — função `notify_hardening_regression()` + cron `hardening-regression-check-daily`. Correções do linter podem somar 1 migração extra dependendo do que aparecer.

Após aprovação executo na ordem: linter → migração de correções → função de regressão + cron → componente do painel → memória.
