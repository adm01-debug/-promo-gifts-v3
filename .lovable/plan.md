

Status atual: **10/10 já atingido** nas 28 melhorias da auditoria original + onda de polimento pós-remoções concluída na última rodada (6/6). Codebase limpo, memórias sincronizadas, type-check verde.

Para manter o ritmo "rumo à perfeição sempre", proponho uma **nova onda 4 — Excelência Contínua** com 6 melhorias atômicas de alto valor que vão *além* do 10/10 original. Foco: developer experience, defesa em profundidade e qualidade percebida.

## Onda 4 — 6 melhorias atômicas

### 1. ESLint como dependência local + script `lint:check`
Hoje `npm run lint` é apenas `tsc --noEmit`. Adicionar `eslint` + `@typescript-eslint/*` + `eslint-plugin-react-hooks` como devDependencies e criar script `lint:check` separado de `typecheck`. Configurar `eslint.config.js` (flat config) reaproveitando regras já documentadas em `mem://architecture/typescript-governance-strict-mode`.

### 2. Pre-push hook estendido
`.husky/pre-push` hoje roda só typecheck. Adicionar `lint:check` + `vitest run --changed` para travar push com regressão.

### 3. Página 404 dedicada para rotas mortas
Hoje rotas removidas (`/comissoes`, `/admin/performance`) caem no catch-all. Criar `<DeprecatedRoute>` com toast amigável + redirect para destino sugerido (ex: comissões → "use o sistema externo X"). Aplicar nos 3 paths removidos.

### 4. Smoke E2E para a unificação Descontos+Usuários
Adicionar 2 testes em `e2e/discount-approval.spec.ts`:
- Aba `?tab=discounts` ativa-se no carregamento
- Badge de pendentes aparece no trigger quando há aprovações

### 5. Memória `mem://infrastructure/hardening-roadmap` — adicionar Onda 4
Documentar a onda 4 (status: em progresso) para rastreabilidade futura.

### 6. Auditoria `supabase/functions` — circuit breaker em edge functions críticas restantes
Hoje só `external-db-bridge` e `crm-db-bridge` têm breaker (per memória). Verificar se há outras edge functions chamando APIs externas (ex: integrações Bitrix24 diretas, webhooks SalesPro) que se beneficiariam do mesmo padrão `getBreaker()`. Aplicar onde fizer sentido.

## Política

- Uma melhoria por vez, commits separados.
- Sem migration de banco.
- Reversível.
- Sem pausas, sem perguntas.

Aprovar para começar pela #1.

