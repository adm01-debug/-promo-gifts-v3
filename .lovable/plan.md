
A onda anterior de hardening (Ondas 1-3) foi entregue. Restam 2 itens marcados como gap conhecido + 3 melhorias incrementais para fechar o baseline 10/10. Plano focado, sem expandir escopo.

# Plano: Hardening Onda 4 — Fechamento 10/10 (5 itens)

## Onda A — Fechar gaps conhecidos
1. **Rate-limit por usuário em edge functions sensíveis** — usar `check_rate_limit(_identifier, _endpoint, ...)` (já existe no DB) em `manage-users` (10/min), `bitrix-sync` (30/min) e `quote-sync` (60/min). Helper compartilhado em `supabase/functions/_shared/rate-limit.ts` para reuso.
2. **Invocar `record_public_token_failure` nas edge functions públicas** — wire-up em `quote-public-view` e `kit-public-view`: ao detectar token inválido/expirado/já-respondido, gravar falha com IP + UA. Aciona auto-expiração após 5 falhas/h.

## Onda B — Security Center mínimo
3. **Página `/admin/seguranca-acesso` ganha aba "Anomalias"** — cards somando últimas 24h: falhas de login, hits de bot_detection, falhas de token público, IPs distintos por token. Só leitura, usa SELECT direto via RLS de admin.
4. **Botão "Forçar logout global"** na mesma página — edge function `force-global-logout` (admin-only) que revoga refresh tokens via Admin API. Confirmação dupla obrigatória.

## Onda C — Wire-up & memória
5. **Atualizar `mem://security/production-hardening-baseline`** marcando itens 4 e 7 como concluídos + documentar Security Center. Ajustar `_headers` se necessário (manter atual).

## Arquivos esperados
- **Novos**: `supabase/functions/_shared/rate-limit.ts`, `supabase/functions/force-global-logout/index.ts`, `src/components/admin/security/AnomalyCards.tsx`, `src/components/admin/security/ForceGlobalLogoutDialog.tsx`.
- **Modificados**: `supabase/functions/manage-users/index.ts`, `supabase/functions/bitrix-sync/index.ts`, `supabase/functions/quote-sync/index.ts`, `supabase/functions/quote-public-view/index.ts`, `supabase/functions/kit-public-view/index.ts`, `src/pages/admin/SecurityAccessPage.tsx` (ou equivalente — verificarei nome real).

Sem migrações novas (tudo usa `check_rate_limit` e `record_public_token_failure` já existentes). Após aprovação executo os 5 itens sequencialmente até build TS limpo.
