# 🚨 Procedura de Hotfix (Promo Brindes)

Este documento descreve o fluxo crítico para correção de bugs em produção que não podem esperar o ciclo normal de release.

## 1. Identificação e Triagem
- **Origem**: Alertas do Sentry, logs de erro no Supabase ou reports de usuários.
- **Severidade**: Definir se é um bloqueador total (P0) ou bug crítico (P1).

## 2. Fluxo de Git
1. **Branch**: Criar uma branch `hotfix/descrição-curta` a partir da `main`.
2. **Isolamento**: Corrigir APENAS o bug reportado. Não incluir refatorações ou outras melhorias.

## 3. Validação
- **Testes Unitários**: Criar um teste que reproduza o bug antes da correção (TDD).
- **Build Local**: Rodar `npm run build` para garantir que não há erros de tipagem.
- **E2E Smoke Test**: Validar o fluxo afetado no sandbox do Lovable.

## 4. Deploy
1. **Merge**: Solicitar review rápido e merge para `main`.
2. **Release**: O `release-please` irá detectar o commit (se usar prefixo `fix:`) e criar uma tag de patch (ex: `v2.0.1`).
3. **Verificação**: Monitorar logs da Edge Function afetada e dashboard de saúde por 15 minutos após o deploy.

## 5. Rollback
- Se o hotfix causar regressões:
  1. Usar o workflow `rollback.yml` no GitHub Actions.
  2. Reverter o commit na `main`.

---
*Última atualização: Maio 2026*
