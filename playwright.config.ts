/**
 * E2E Test Configuration — Playwright
 *
 * Estrutura:
 *  - project "setup": roda e2e/fixtures/auth.setup.ts UMA VEZ e gera storageState.json
 *  - project "chromium-public": specs sem auth (login, públicos)
 *  - project "chromium-authed": specs autenticados (depende de setup)
 *
 * Hardening anti-flake:
 *  - headless POR PADRÃO (sobrescrevível por --headed ou E2E_HEADLESS=false)
 *  - retries controlados: CI=2, local=1 (override por E2E_RETRIES=N)
 *  - expect.timeout elevado (15s) para reduzir polls inflados nos specs
 *  - reducedMotion: "reduce" para neutralizar animações (Radix/framer-motion)
 *  - testIdAttribute padronizado em "data-testid"
 *
 * Comandos:
 *   npm run test:e2e          # headless (default)
 *   npm run test:e2e:ui       # modo visual
 *   npm run test:e2e:headed   # browser visível
 *   npm run test:e2e:debug    # com inspector
 *   npm run test:e2e:report   # abre o relatório HTML
 *
 * Envs:
 *   E2E_BASE_URL    URL do servidor já rodando (pula webServer)
 *   E2E_HEADLESS    "false" para forçar headed; default true
 *   E2E_RETRIES     número absoluto de retries (sobrescreve CI/local)
 */
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.resolve(__dirname, "e2e/.auth");
const STORAGE_STATE = path.join(AUTH_DIR, "agente.json");
const ARTIFACTS_DIR = path.resolve(__dirname, "e2e-artifacts");

const HEADLESS = process.env.E2E_HEADLESS
  ? process.env.E2E_HEADLESS.toLowerCase() !== "false"
  : true;

const RETRIES = process.env.E2E_RETRIES
  ? Math.max(0, Number.parseInt(process.env.E2E_RETRIES, 10) || 0)
  : process.env.CI
    ? 2
    : 1;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: path.resolve(__dirname, "e2e/global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "e2e/global-teardown.ts"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: RETRIES,
  workers: process.env.CI ? 1 : undefined,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  outputDir: ARTIFACTS_DIR,
  // JSON reporter sempre emitido para alimentar `scripts/e2e-feature-summary.mjs`
  // (overhead desprezível). HTML aberto on-demand via `npm run test:e2e:report`.
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
        ["junit", { outputFile: "playwright-report/results.xml" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: HEADLESS,
    testIdAttribute: "data-testid",
    trace: "on-first-retry",
    screenshot: "on",
    video: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    reducedMotion: "reduce",
    launchOptions: {
      args: ["--disable-blink-features=AutomationControlled"],
    },
  },
  // ───────────────────────────────────────────────────────────
  // ISOLAMENTO @smoke (defesa em profundidade)
  //
  // Apenas o project `chromium-smoke` executa testes marcados `@smoke`.
  // Demais projects aplicam `grepInvert: /@smoke/` para ignorar qualquer
  // `@smoke` que vaze para outro arquivo (ex.: alguém adicionar
  // `test.describe("@smoke ...")` num spec de regression por engano).
  //
  // Combinado com `testMatch`/`testIgnore` por path, isso garante 3 camadas:
  //   1. Path-based: smoke spec só casa em `chromium-smoke`.
  //   2. Tag-based:  qualquer `@smoke` em outro spec é silenciosamente
  //                  pulado em todos os outros projects.
  //   3. Comando:    `npm run test:e2e` (geral) NÃO inclui chromium-smoke
  //                  por padrão — vide `npm run test:e2e:all` para encadear.
  // ───────────────────────────────────────────────────────────
  projects: [
    {
      name: "setup",
      testMatch: /fixtures\/auth\.setup\.ts/,
    },
    {
      name: "chromium-public",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/fixtures\/auth\.setup\.ts/, /flows\//, /routes\//],
      grepInvert: /@smoke/,
    },
    {
      name: "chromium-agente",
      use: { ...devices["Desktop Chrome"], storageState: path.join(AUTH_DIR, "agente.json") },
      dependencies: ["setup"],
      testMatch: [/flows\/.*\.spec\.ts/, /routes\/(app|quotes)\/.*\.spec\.ts/],
      grepInvert: /@smoke/,
    },
    {
      name: "chromium-supervisor",
      use: { ...devices["Desktop Chrome"], storageState: path.join(AUTH_DIR, "supervisor.json") },
      dependencies: ["setup"],
      testMatch: [/routes\/admin\/.*\.spec\.ts/],
      grep: /@supervisor/,
    },
    {
      name: "chromium-dev",
      use: { ...devices["Desktop Chrome"], storageState: path.join(AUTH_DIR, "dev.json") },
      dependencies: ["setup"],
      testMatch: [/routes\/admin\/.*\.spec\.ts/],
      grep: /@dev/,
    },
    {
      name: "chromium-smoke",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(AUTH_DIR, "agente.json"),
        screenshot: { mode: "only-on-failure", fullPage: true },
        video: { mode: "retain-on-failure", size: { width: 1280, height: 720 } },
        trace: "retain-on-failure",
      },
      dependencies: ["setup"],
      testMatch: /flows\/20-all-features-smoke\.spec\.ts/,
      grep: /@smoke/,
      fullyParallel: false,
      workers: 1,
      retries: 0,
    },
    {
      name: "routes-public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /routes\/public\/.*\.spec\.ts/,
      grepInvert: /@smoke/,
    },
    {
      name: "routes-mobile",
      use: { ...devices["iPhone 13"], storageState: path.join(AUTH_DIR, "agente.json") },
      dependencies: ["setup"],
      testMatch: /routes\/(app|quotes|admin)\/.*\.spec\.ts/,
      grep: /@mobile/,
      grepInvert: /@smoke/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
