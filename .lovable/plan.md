
O usuário pediu uma auditoria técnica exaustiva (22 dimensões, scorecard, plano de ação). Isso é trabalho de análise pesada read-only — vou explorar o codebase a fundo e entregar o relatório completo. Preciso confirmar escopo antes de gastar muitos tokens lendo arquivos.

# Plano — Auditoria Técnica 360° do Promo Gifts

## Objetivo
Executar a auditoria nas **20 dimensões** do prompt, com nota 0-10, evidências (arquivo/linha), gaps e ações corretivas, culminando em scorecard, top-10 ROI e roadmap em 3 ondas.

## Como vou executar (em modo default)

### Fase 0 — Inventário (1 etapa)
- `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `vitest.config.ts`, `.github/workflows/*`, `supabase/config.toml`
- Contagem: arquivos `src/**`, edge functions, tabelas (via `supabase--read_query` em `information_schema`), rotas (App.tsx), hooks, componentes
- Memórias relevantes (`mem://architecture/*`, `mem://security/*`)

### Fase 1 — Varredura por dimensão (5 blocos paralelos)
1. **Arquitetura + Manutenibilidade + Qualidade de Código** — `src/` tree, top-20 arquivos por LOC, ESLint config, dead code, duplicações
2. **Auth + Authz + Segurança** — `AuthContext`, `ProtectedRoute`, `AdminRoute`, RLS via `supabase--linter` + `pg_policies`, edge functions `_shared/auth.ts`, anti-scraping, headers, CORS
3. **Banco + Data Integrity + Validação** — schema (`information_schema.tables/columns`), triggers, RPCs (já listadas), migrations, Zod em edge functions, constraints
4. **CI/CD + Infra + Operações + Documentação** — `.github/workflows/`, `CONTRIBUTING.md`, `docs/RUNBOOK.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, husky, secrets
5. **Performance + Logging + Observabilidade + Testes + Tipagem + Lógica** — bundle/lazy, `logger.ts`, Sentry, `tests/`, coverage threshold (50% atual), `tsconfig` strict, edge function logs recentes

### Fase 2 — Consolidação
- Scorecard tabular (20 linhas + ponderada)
- Top-10 ações por ROI
- Roadmap: 🔴 Quick Wins / 🟠 Sprint 1 / 🟡 Sprint 2 / 🟢 Backlog
- Parágrafo final de maturidade

## Premissas (corrija se errar)
- Auditar as **20 dimensões** listadas no prompt (o título diz 22, o corpo lista 20 — vou cobrir as 20).
- Foco no app Promo Gifts atual (não auditar Bitrix24/n8n externos, apenas pontos de integração que vivem no repo).
- Modo **read-only**: nenhuma correção será aplicada — só relatório. Implementação vira sprint separada após você priorizar.

## Entregável
Um único relatório markdown estruturado em chat (Inventário → 20 dimensões → Scorecard → Top-10 → Roadmap → Nota final). Sem alterações no código.

## Custo estimado
~25-35 tool calls de leitura (arquivos + queries SQL + logs). ~15 minutos de análise. Zero risco — read-only.

Aprove para eu executar.
