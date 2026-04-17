# Onboarding — Promo Gifts (Setup < 4h)

## 1. Pré-requisitos (15 min)
- Node 20+, npm 10+, Git
- Acesso ao projeto Lovable + Supabase (peça ao admin)
- VS Code + extensions: ESLint, Tailwind CSS IntelliSense, TypeScript

## 2. Clone & Install (10 min)
```bash
git clone <repo>
cd promo-gifts
npm install
```

## 3. Variáveis de Ambiente (5 min)
`.env` é gerado automaticamente pelo Lovable Cloud. Não edite manualmente. Confira que existem:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## 4. Run dev (2 min)
```bash
npm run dev   # http://localhost:8080
```

## 5. Estrutura Mental (30 min — leia nesta ordem)
1. `mem://index.md` — regras vivas do projeto
2. `docs/EDGE_FUNCTIONS.md` — catálogo de 50 funções
3. `docs/RUNBOOK.md` — incidentes & oncall
4. `src/App.tsx` — roteamento e layouts
5. `src/integrations/supabase/client.ts` — **NÃO EDITE**

## 6. Padrões obrigatórios (1h)
| Tópico | Onde aprender |
|---|---|
| Design tokens (Outfit, var(--primary)) | `mem://style/design-system-spec` |
| TypeScript strict | `mem://architecture/typescript-governance-strict-mode` |
| RLS-first | `docs/adr/0002-rls-first-security.md` |
| Edge function pattern | `mem://infrastructure/edge-function-validation-standard` |
| Closed platform | `docs/adr/0004-closed-platform-policy.md` |

## 7. Primeira contribuição (2h)
1. Pegue uma issue `good-first-issue`
2. Crie branch `feat/<short-name>`
3. Rode `npm run lint && npm test` antes de commit
4. Husky pre-push roda testes automaticamente
5. PR usando o template em `.github/pull_request_template.md`

## 8. Comandos úteis
```bash
npm run lint         # ESLint
npm test             # Vitest unit
npm run test:e2e     # Playwright E2E
npm run build        # Production build (gera dist/stats.html)
```

## Dúvidas frequentes
- **"Como acesso o Supabase dashboard?"** → Não tem. Use Lovable Cloud → Backend.
- **"Por que minha policy não funciona?"** → Veja `tests/rls/README.md`.
- **"Onde fica a documentação de API?"** → `docs/EDGE_FUNCTIONS.md`.
