## Objetivo

Substituir a lista hardcoded de 6 rotas em `e2e/flows/22-header-sticky.spec.ts` por uma iteração baseada no SSOT `e2e/routes/_catalog.ts`, garantindo que o Header global permaneça `position: sticky` em y≈0 ao rolar **em todas as rotas autenticadas do app** (sem regressão silenciosa quando uma nova rota é adicionada ao catálogo).

## O que muda

### `e2e/flows/22-header-sticky.spec.ts` (reescrito)

- Importa `AUTHED_USER_ROUTES` (= `APP_ROUTES + QUOTES_ROUTES`) de `e2e/routes/_catalog.ts` como fonte única.
- Filtra rotas dinâmicas que dependem de IDs reais (`/produto/:id`, `/colecoes/:id`, `/orcamentos/:id`, `/orcamentos/:id/editar`) — elas usam `SAMPLE_ID` placeholder e renderiam estado vazio/erro, sujando o teste. Mantém todas as rotas estáticas.
- Para cada rota:
  1. `gotoAndSettle(page, route.path)`
  2. `waitForTestIdVisible(page, "app-header")`
  3. Se redirecionou para `/login` → `test.skip()` com mensagem clara (rota exige admin/dev e o usuário E2E não tem o papel).
  4. Mede `boundingBox()` inicial → `y ≤ 2px`
  5. Injeta spacer de 2400px se `scrollHeight` < `innerHeight + 2000`
  6. `window.scrollTo(0, 1500)` + `waitForFunction(scrollY > 1000)`
  7. Mede `boundingBox()` pós-scroll → `y ≤ 2px`
  8. `getComputedStyle(header).position === "sticky"`
- Mantém `Y_TOLERANCE_PX = 2` (transição h-14 → h-12).
- Usa `test.describe.configure({ mode: "parallel" })` para acelerar (cada rota é isolada).

### Cobertura admin (opcional, mesmo arquivo)

- Segundo `describe` que itera `ADMIN_ROUTES`, gated por `requireAdmin()`. Pula automaticamente em CI sem credenciais admin, mas roda localmente quando `E2E_ADMIN_EMAIL/PASSWORD` estão setados — assim cobrimos /admin/* sem quebrar o pipeline default.

### Sem mudanças em outros arquivos

- Nada em `src/`, nada em helpers, nada em fixtures. É apenas expansão de cobertura do spec existente.
- O spec continua sob a tag/projeto default do Playwright (não é `@smoke`), então não polui o smoke gate.

## Detalhes técnicos

```text
ROUTES_STATIC = AUTHED_USER_ROUTES.filter(r =>
  !r.path.includes(SAMPLE_ID) && !r.path.includes(SAMPLE_TOKEN)
)
```

Resultado esperado: ~30 rotas estáticas cobertas (vs. 6 hoje), incluindo `/`, `/produtos`, `/filtros`, `/novidades`, `/reposicao`, `/favoritos`, `/carrinhos`, `/comparar`, `/colecoes`, `/tendencias`, `/simulador`, `/simulador-precos`, `/estoque`, `/busca-preco`, `/montar-kit`, `/meus-kits`, `/mockup-generator`, `/mockups/historico`, `/magic-up`, `/inteligencia-comercial`, `/ferramentas/bi`, `/ferramentas/bi/comparar`, `/match`, `/dropbox`, `/orcamentos`, `/orcamentos/dashboard`, `/orcamentos/lista`, `/orcamentos/kanban`, `/orcamentos/templates`, `/orcamentos/novo`.

Tratamento de redirect para `/login` evita falsos negativos em rotas que possam exigir flag/role específico que o usuário E2E padrão não possui — em vez de falhar, registramos skip explícito.

## Como rodar

```bash
npm run test:e2e -- e2e/flows/22-header-sticky.spec.ts
```

## Critério de aceite

- Todas as ~30 rotas autenticadas estáticas passam: header em y≈0 antes e depois de scroll de 1500px, `position: sticky`.
- Adicionar uma nova rota ao catálogo automaticamente a inclui no teste — sem necessidade de editar o spec novamente.
