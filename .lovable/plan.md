## Objetivo

Separar execução E2E em **smoke** (gate rápido) vs **regression** (suíte completa) com scripts npm dedicados, e adicionar um relatório pós-execução que **agrupa falhas por feature** lendo o `playwright-report/results.json`.

## Diagnóstico

- Playwright já tem 7 projects: `setup`, `chromium-public`, `chromium-authed`, `chromium-smoke`, `routes-public`, `routes-authed`, `routes-mobile`.
- **Hoje** `npm run test:e2e` roda **tudo** (incluindo smoke). Não há atalho para "só smoke" nem "regression sem smoke".
- Reporter JSON já é gerado em CI (`playwright-report/results.json`) — basta consumir.
- Não existe agrupamento por feature; relatório padrão lista por arquivo.

## Plano

### 1. Scripts npm dedicados (`package.json`)

```jsonc
{
  // Smoke gate — 1 spec agregador, sequencial, ~rápido
  "test:e2e:smoke": "npx playwright test --project=chromium-smoke --reporter=list,json",

  // Regression — tudo EXCETO o smoke (evita duplicação)
  "test:e2e:regression": "npx playwright test --project=chromium-public --project=chromium-authed --project=routes-public --project=routes-authed",

  // Mobile só
  "test:e2e:mobile": "npx playwright test --project=routes-mobile",

  // Smoke + relatório de falhas por feature
  "test:e2e:smoke:report": "npm run test:e2e:smoke; node scripts/e2e-feature-summary.mjs",
  "test:e2e:regression:report": "npm run test:e2e:regression; node scripts/e2e-feature-summary.mjs",

  // Apenas o relatório (sobre o último results.json)
  "e2e:summary": "node scripts/e2e-feature-summary.mjs"
}
```

Uso de `;` em vez de `&&` no `:report` garante que o resumo SEMPRE roda, mesmo com falhas — propaga o exit code do Playwright via `set +e` interno do script.

### 2. Forçar reporter JSON localmente (`playwright.config.ts`)

Hoje o reporter JSON só é emitido em CI. Para o sumarizador funcionar localmente, sempre emitir JSON em `playwright-report/results.json` (overhead desprezível).

Mudança mínima: adicionar `["json", { outputFile: "playwright-report/results.json" }]` ao reporter local também.

### 3. Sumarizador `scripts/e2e-feature-summary.mjs`

Lê `playwright-report/results.json` (formato Playwright JSON reporter) e produz:

**Mapeamento spec → feature** via convenção de path:
- `e2e/routes/admin/<feature>.spec.ts` → feature `admin/<feature>`
- `e2e/routes/app/<feature>.spec.ts` → feature `app/<feature>`
- `e2e/routes/quotes/<feature>.spec.ts` → feature `quotes/<feature>`
- `e2e/routes/public/<feature>.spec.ts` → feature `public/<feature>`
- `e2e/flows/<NN>-<feature>.spec.ts` → feature `flow/<feature>` (regex `^\d+-(.+)\.spec`)
- `e2e/<feature>.spec.ts` (top-level legados) → feature `legacy/<feature>`

**Saída no console:**
```
═══ E2E Feature Summary ═══
Run: smoke (chromium-smoke) | 2025-04-27 10:51 | 12.3s
Total: 47 | ✓ 42 | ✗ 4 | ⊘ 1

Failures by feature:
  ✗ admin/permissions          2 failed   (3 specs)
    · permissions › admin can list roles                e2e/routes/admin/permissions.spec.ts:23
    · permissions › role assignment validates inputs    e2e/routes/admin/permissions.spec.ts:55
  ✗ app/kit-builder            1 failed   (1 specs)
    · kit-builder › opens wizard
  ✗ flow/cart-checkout         1 failed   (4 specs)
    · cart-checkout › guest can review totals

Skipped (1):
  · routes-mobile/admin/system-status (@mobile gated)

Top slowest features (top 5):
  routes-authed/admin/telemetry    18.4s
  ...

Exit: 1 (failures detected)
```

**Saída em arquivo:** também grava `playwright-report/feature-summary.md` (markdown) e `feature-summary.json` (estrutura crua) — útil para upload como artifact no CI.

**Exit code:** propaga 1 se houver pelo menos 1 falha, 0 caso contrário.

### 4. CI (opcional — não escopado agora)

Documentar no header do script: para usar no GitHub Actions, basta `npm run test:e2e:smoke:report` no job `smoke-gate` e `npm run test:e2e:regression:report` no job `regression`. O markdown já está pronto para `actions/github-script` postar como comentário no PR.

## Detalhes técnicos

```js
// scripts/e2e-feature-summary.mjs (esqueleto)
import fs from "node:fs";
import path from "node:path";

const REPORT = process.env.E2E_RESULTS_JSON || "playwright-report/results.json";
if (!fs.existsSync(REPORT)) { console.error(`[summary] não achei ${REPORT}`); process.exit(2); }
const data = JSON.parse(fs.readFileSync(REPORT, "utf8"));

function featureKey(file) {
  const rel = file.replace(/^.*\/e2e\//, "e2e/");
  const m =
    rel.match(/^e2e\/routes\/(admin|app|quotes|public)\/(.+)\.spec\.ts$/) ||
    rel.match(/^e2e\/flows\/\d+-(.+)\.spec\.ts$/) ||
    rel.match(/^e2e\/(.+)\.spec\.ts$/);
  if (!m) return "uncategorized";
  if (rel.startsWith("e2e/routes/")) return `${m[1]}/${m[2]}`;
  if (rel.startsWith("e2e/flows/")) return `flow/${m[1]}`;
  return `legacy/${m[1]}`;
}

// Walk suites recursively, collect { feature, spec, status, duration, location }
// Group, sort, render. Render markdown to playwright-report/feature-summary.md.
// process.exit(failures > 0 ? 1 : 0);
```

## Arquivos afetados

- `package.json` — 6 scripts novos.
- `playwright.config.ts` — sempre emite JSON reporter (~3 linhas).
- `scripts/e2e-feature-summary.mjs` — novo (~150 linhas).
- `mem://testing/e2e-coverage-matrix.md` — ref ao novo fluxo smoke vs regression.

## Validação

- `npm run e2e:summary` contra um `results.json` mockado/existente → renderiza markdown + console sem erro.
- Smoke local: `E2E_BASE_URL=https://preview... npm run test:e2e:smoke:report` (skip se sem credenciais).
- ESLint (`scripts/**/*.mjs`) limpo.

## Fora de escopo

- Mudanças nos próprios specs.
- Workflow GitHub Actions (já mencionado, não alterado nesta task).
- Notificação Slack/Discord do sumário.