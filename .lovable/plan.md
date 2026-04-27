# Plano: Suíte E2E smoke sequencial para CI

## Objetivo

Substituir o smoke atual (loop genérico) por uma suíte com **um `test()` nomeado por funcionalidade principal**, executada em **ordem determinística** com **workers=1** no CI, servindo como gate rápido antes da suíte completa.

## O que muda

### 1. Reescrever `e2e/flows/20-all-features-smoke.spec.ts`

- Modo `serial` (`test.describe.configure({ mode: "serial" })`) — ordem fixa, sem flake de paralelismo.
- Helper interno `assertFeatureLoads(page, path)` faz as 4 verificações:
  1. sem redirect para `/login`,
  2. body visível,
  3. sem `[data-state="loading"]` permanente após 5s,
  4. zero `pageerror` fatal (filtra ResizeObserver / chunk loading).
- ~30 testes nomeados por funcionalidade (dashboard, catálogo, favoritos, coleções, comparador, carrinhos, pedidos, orçamentos × 5 telas, simuladores, estoque, kits, mockup, magic up, BI, match, dropbox, etc.).
- 3 testes públicos extras (login renderiza, reset-password, 404).
- Skip silencioso quando `E2E_USER_EMAIL/PASSWORD` ausentes.

### 2. Novo project Playwright `chromium-smoke` em `playwright.config.ts`

```ts
{
  name: "chromium-smoke",
  use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
  dependencies: ["setup"],
  testMatch: /flows\/20-all-features-smoke\.spec\.ts/,
  workers: 1,                  // sequencial garantido
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
}
```

### 3. Atualizar `.github/workflows/e2e.yml`

Adicionar **um step extra ANTES** do run completo, que falha rápido se o smoke quebrar:

```yaml
- name: Run E2E smoke (gate)
  run: npx playwright test --project=chromium-smoke
  env: { ... }

- name: Run E2E full
  if: success()
  run: npx playwright test
  continue-on-error: true
  id: e2e_run
```

Smoke ≈ 60-90s; falha cedo evita queimar minutos do runner.

### 4. README

Atualizar `e2e/README.md` (ou criar seção no `e2e/routes/README.md`) com:

```bash
# Gate rápido (1 teste por funcionalidade, sequencial)
npx playwright test --project=chromium-smoke
# ou
npx playwright test --grep @smoke
```

### 5. Memória

Atualizar `mem://testing/e2e-coverage-matrix.md` documentando o project `chromium-smoke` e a regra "1 teste = 1 funcionalidade, ordem fixa".

## Detalhes técnicos

- O smoke continua tagged `@smoke` para compatibilidade com `--grep`.
- Não usa mocks — valida o app real autenticado (storageState do `setup`).
- Cada teste é isolado (não compartilha estado), mas a ordem é fixa para relatórios determinísticos.
- Tests existentes (`routes/**`, `flows/01-19`, `flows/21-feature-matrix`) **não mudam** — continuam sendo a cobertura profunda.

## Entregáveis

- `e2e/flows/20-all-features-smoke.spec.ts` reescrito (~210 linhas).
- `playwright.config.ts` com novo project `chromium-smoke`.
- `.github/workflows/e2e.yml` com step gate antes do run completo.
- `mem://testing/e2e-coverage-matrix.md` atualizado.
