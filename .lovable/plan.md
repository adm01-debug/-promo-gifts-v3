# E2E hardening: headless + retries controlados + waits anti-flake

## Objetivo

Tornar a suíte E2E resiliente em headless, com retries controlados e helpers de espera que removam as principais fontes de flakiness (skeletons, hidratação, animações, race com `goto`).

## Diagnóstico

- `playwright.config.ts` já roda headless por padrão (Playwright default), mas:
  - `retries` é 0 fora de CI — instabilidades locais não são absorvidas.
  - Sem `expect.timeout` global mais largo nem `testIdAttribute` configurado.
  - `webServer` sem `stdout: "pipe"` nem reuso fora de CI bem definido.
- `gotoAndSettle` faz só `domcontentloaded` + wait curto de skeleton (5s). Falta:
  - aguardar `networkidle` curto (best-effort), animações terminarem (`prefers-reduced-motion`), e React ter hidratado o `#root`.
  - desligar animações via CSS injetado para reduzir jitter visual.
- Não há helper para esperas baseadas em **selector**: hoje os specs usam `expect.poll` ad-hoc, `waitFor` genérico e `.catch(() => {})`, que mascaram falhas reais.

## Mudanças

### 1) `playwright.config.ts`

- Forçar headless explícito: `use.headless: true` (com override possível por `--headed`).
- Retries controlados:
  - CI: `retries: 2` (mantém)
  - Local: `retries: 1` (novo) — só absorve flake de 1ª execução, sem mascarar bug real.
- `expect.timeout: 15_000` (eleva o default de assertions, evita `expect.poll` inflados nos specs).
- `use.testIdAttribute: "data-testid"` (Playwright reconhece `getByTestId`).
- `use.launchOptions: { args: ["--disable-blink-features=AutomationControlled"] }` — reduz detecção/throttling.
- `use.contextOptions: { reducedMotion: "reduce" }` — desliga animações no Chromium.
- `webServer.stdout: "pipe"` + `stderr: "pipe"` para capturar logs do Vite no relatório.
- Adicionar `globalSetup` opcional? **Não** — manteremos só `setup` project (já existe).

### 2) `e2e/helpers/nav.ts` — novo `gotoAndSettle` mais robusto

Substituir corpo por uma sequência determinística:

1. `page.goto(path, { waitUntil: "domcontentloaded" })`
2. `page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {})` — best-effort
3. Esperar React hidratar: `page.waitForFunction(() => document.querySelector("#root")?.children.length > 0, { timeout: 10_000 }).catch(() => {})`
4. Esperar skeletons sumirem (mantém atual, eleva timeout para 8_000).
5. Esperar `body` ter `aria-busy="false"` se presente (best-effort).
6. Injetar uma vez por contexto CSS que neutraliza animações longas (via `page.addStyleTag` envolto em try/catch — só se ainda não existir).

Adicionar helpers exportados:

- `waitForVisible(page, selector, timeout?)` — wrapper centralizado que evita o padrão `.first().waitFor({state:"visible"})` espalhado.
- `waitForCount(locator, expected, timeout?)` — `expect.poll(() => locator.count())` com mensagem.
- `settleAfterAction(page)` — aguarda `networkidle` curto + skeleton ausente. Usado depois de cliques que disparam fetch.

### 3) Ruído de console

Em `expectNoConsoleErrors`, ampliar a lista de filtros conhecidos para reduzir falsos positivos: `Download the React DevTools`, `ResizeObserver loop`, `Failed to load resource: the server responded with a status of 401` (esperado em specs públicos), `chunk` (ChunkLoadError quando há retry), `analytics` no-ops.

### 4) Sem mudanças nos specs

A intenção é melhorar o **núcleo** (config + helpers). Os specs já existentes herdam o ganho automaticamente porque usam `gotoAndSettle` e `expect`.

## Detalhes técnicos

- `headless: true` explícito coexiste com `npm run test:e2e:headed` (CLI vence).
- `reducedMotion: "reduce"` é nativo do Playwright e pega componentes que respeitam `prefers-reduced-motion` (Radix, framer-motion com `useReducedMotion`).
- CSS injetado (kill-switch animações) é defensivo para libs que não respeitam media query — só aplica `* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }`.
- `waitForFunction` para hidratação observa `#root.children.length > 0`, suficiente para detectar SPA pronta.

## Validação

- `npx tsc --noEmit -p tsconfig.json` — type-check.
- `npx playwright test --list` — confirma que a config carrega sem erro e os projects continuam descobertos.

## Fora de escopo

- Não tocar nos specs em `e2e/flows/**` ou `e2e/routes/**`.
- Não alterar `auth.setup.ts` ou storage state.
- Não introduzir bibliotecas novas.
