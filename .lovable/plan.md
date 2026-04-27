## Objetivo

Reduzir flakiness em toda a suíte E2E padronizando **3 helpers SSOT** — login, navegação e sincronização — e migrar todas as specs (102 arquivos) que ainda usam `page.goto`, `page.fill('#login-…')`, `page.waitForTimeout` ou `networkidle` direto.

## Diagnóstico (números reais)

| Métrica | Atual |
|---|---:|
| Total de specs | 102 |
| Specs com `page.goto(` direto | 21 |
| Specs com `page.waitForTimeout(` (sleeps mágicos) | 11 |
| Specs com `page.fill('#login-email', …)` | 1 (+ duplicado dentro de `auth.setup.ts`) |
| Helpers já existentes | `nav.ts` (`gotoAndSettle`), `waits.ts` (`waitForTestId*`, `clickTestId`, `retry`), `_shared.ts` (`waitRouteReady`) |

**Problemas:**
1. **Login** está duplicado em `auth.setup.ts`, `auth.spec.ts`, `login.spec.ts` e `flows/01-auth.spec.ts` — 4 implementações com seletores diferentes (`#login-email` vs `input[type=email]`).
2. **Navegação** mistura `page.goto`, `gotoAndSettle` e `waitRouteReady` (3 padrões coexistem).
3. **Sincronização** ainda usa `waitForTimeout(800–3000)` em 11 specs e `networkidle` em ~5 lugares — fontes conhecidas de flake em CI.
4. Factories `_factories.ts` usam `page.goto` cru em vez do helper centralizado.

## Entregáveis

### 1. Novo helper SSOT — `e2e/helpers/auth.ts`

Funções:
- `loginAs(page, role: "user" | "admin")` — usa `E2E_USER_*`/`E2E_ADMIN_*`, faz UI login com seletores SSOT (`page-title`/`login-form`/`login-email`/`login-password` via `Sel`), espera redirect com `expect(page).not.toHaveURL(/\/login/)`. Idempotente.
- `loginViaUI(page, { email, password, expectFail? })` — formulário direto, retorna se sucesso. Substitui os 4 fluxos duplicados.
- `logout(page)` — clica menu user → sair, espera `/login`.
- `expectAuthenticated(page)` / `expectUnauthenticated(page)` — asserts reutilizáveis.
- `loginAs` reutiliza `storageState` quando já existe (skip UI flow).

### 2. Consolidar `e2e/helpers/nav.ts` como SSOT de navegação

- Manter `gotoAndSettle` como função pública única para todas as navegações.
- Adicionar `gotoAuthed(page, path, role?)` que combina `loginAs` + `gotoAndSettle`.
- Adicionar `expectOnRoute(page, pathOrRegex)` com retry curto (substitui asserts soltos de URL).
- Documentar no JSDoc: **proibido `page.goto` direto fora destes helpers**.

### 3. Consolidar `e2e/helpers/waits.ts` (já forte) + adicionar 3 utilitários

- `waitForRouteIdle(page)` — versão pública de "_shared `waitRouteReady`": dom + skeleton-gone + aria-busy false. Remove `networkidle` da API.
- `expectVisibleByTestId(page, testId, opts?)` — wrapper de `expect(...).toBeVisible()` com mensagem.
- Banir `page.waitForTimeout` via ESLint rule (`no-restricted-syntax`) — converte os 11 usos em `waitForTestIdHidden`/`pollUntil`/`waitForRouteIdle`.

### 4. Refatoração das specs (102 arquivos)

**Lote A — autenticação (4 arquivos):**
- `e2e/login.spec.ts`, `e2e/auth.spec.ts`, `e2e/flows/01-auth.spec.ts`, `e2e/fixtures/auth.setup.ts` → todos passam a usar `loginViaUI`/`loginAs`.

**Lote B — `page.goto` → `gotoAndSettle`/`gotoAuthed` (21 arquivos):**
- `protected-routes.spec.ts`, `quote-approval.spec.ts`, `mockup-generate.spec.ts`, `navigation.spec.ts`, `discount-approval.spec.ts`, `admin-conexoes-*`, `flows/p0/*` (5), `flows/02-navigation`, `flows/10-admin`, `flows/20-all-features-smoke`, `routes/_factories.ts` (factory base — afeta 38 specs por herança).

**Lote C — eliminar `waitForTimeout` (11 arquivos):**
- Substituir por `waitForTestIdHidden('global-spinner')`, `waitForTestIdVisible(<estado-terminal>)` ou `pollUntil(condição)`.

**Lote D — eliminar `networkidle` direto (~5 arquivos):**
- Migrar para `waitForRouteIdle` ou esperas por testid de estado terminal.

### 5. Guard-rails — ESLint custom

Adicionar em `eslint.config.js` regras `no-restricted-syntax` para arquivos `e2e/**/*.spec.ts`:
- proibir `CallExpression[callee.property.name='waitForTimeout']`
- proibir `Literal[value='networkidle']`
- proibir `CallExpression[callee.property.name='goto']` exceto dentro de `e2e/helpers/**`

Mensagens apontam para o helper substituto.

### 6. Atualizar memórias

- Criar `mem://testing/e2e-helpers-policy.md` — "Sempre `loginAs`/`gotoAndSettle`/`waitForTestId*`. Nunca `page.goto`, `waitForTimeout` ou `networkidle` em specs."
- Atualizar `mem://testing/e2e-coverage-matrix.md` referenciando a nova policy.
- Adicionar regra Core ao `mem://index.md`.

## Detalhes técnicos

### Estrutura final

```text
e2e/
├── helpers/
│   ├── auth.ts          [NOVO] loginAs, loginViaUI, logout, expectAuthenticated
│   ├── nav.ts           [EDIT] +gotoAuthed, +expectOnRoute
│   ├── waits.ts         [EDIT] +waitForRouteIdle, +expectVisibleByTestId
│   └── ...
├── fixtures/
│   ├── auth.setup.ts    [REFAT] usa loginViaUI
│   └── test-base.ts     [EDIT] expõe fixture `authedPage` opcional
└── routes/_factories.ts [REFAT] usa gotoAndSettle/waitForRouteIdle
```

### Snippet — helper de login

```ts
// e2e/helpers/auth.ts
export async function loginViaUI(
  page: Page,
  { email, password, expectFail = false }: LoginCreds,
) {
  await gotoAndSettle(page, "/login");
  await page.locator(Sel.input("login-email")).fill(email);
  await page.locator(Sel.input("login-password")).fill(password);
  await clickTestId(page, "login-submit");
  if (expectFail) {
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    return false;
  }
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  await waitForRouteIdle(page);
  return true;
}

export async function loginAs(page: Page, role: "user" | "admin" = "user") {
  const email = role === "admin" ? process.env.E2E_ADMIN_EMAIL : process.env.E2E_USER_EMAIL;
  const password = role === "admin" ? process.env.E2E_ADMIN_PASSWORD : process.env.E2E_USER_PASSWORD;
  if (!email || !password) test.skip(true, `Credenciais E2E_${role.toUpperCase()}_* ausentes`);
  return loginViaUI(page, { email: email!, password: password! });
}
```

### Snippet — banir patterns flaky via ESLint

```js
// eslint.config.js (escopo e2e/**/*.spec.ts)
{
  files: ["e2e/**/*.spec.ts"],
  rules: {
    "no-restricted-syntax": ["error",
      { selector: "CallExpression[callee.property.name='waitForTimeout']",
        message: "Use waitForTestIdHidden/pollUntil em vez de waitForTimeout." },
      { selector: "Literal[value='networkidle']",
        message: "Use waitForRouteIdle em vez de networkidle." },
    ],
  },
}
```

## Critérios de aceitação

- `rg "waitForTimeout|'networkidle'" e2e --include="*.spec.ts"` retorna **0 ocorrências**.
- `rg "page\.goto\(" e2e --include="*.spec.ts"` retorna **0 ocorrências** (somente em `helpers/**`).
- `rg "#login-email|#login-password" e2e --include="*.spec.ts"` retorna **0 ocorrências** (somente `helpers/auth.ts` e `auth.setup.ts`).
- `npx tsc --noEmit` ✅
- `npx eslint e2e/**/*.spec.ts` ✅
- Smoke (`--project=chromium-smoke`) executa sem novas falhas.

## Fora do escopo

- Adicionar specs novas para as 37 rotas sem cobertura (tratado em tarefa separada do relatório de gaps).
- Mudar reporters / config do Playwright — apenas `playwright.config.ts` se necessário para banir `networkidle` em projeto.
