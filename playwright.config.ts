/**
 * E2E Test Configuration — Playwright
 *
 * Estrutura:
 *  - project "setup": roda e2e/fixtures/auth.setup.ts UMA VEZ e gera storageState.json
 *  - project "chromium-public": specs sem auth (login, públicos)
 *  - project "chromium-authed": specs autenticados (depende de setup)
 *
 * Hardening anti-flake:
 *  - headless explícito (sobrescrevível por --headed)
 *  - retries controlados (CI: 2, local: 1)
 *  - expect.timeout elevado (15s) para reduzir polls inflados nos specs
 *  - reducedMotion: "reduce" para neutralizar animações (Radix/framer-motion)
 *  - testIdAttribute padronizado em "data-testid"
 *
 * Comandos:
 *   npm run test:e2e          # headless
 *   npm run test:e2e:ui       # modo visual
 *   npm run test:e2e:headed   # browser visível
 *   npm run test:e2e:debug    # com inspector
 *   npm run test:e2e:report   # abre o relatório HTML
 */
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const STORAGE_STATE = path.resolve(__dirname, "e2e/.auth/storageState.json");
const ARTIFACTS_DIR = path.resolve(__dirname, "e2e-artifacts");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: path.resolve(__dirname, "e2e/global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "e2e/global-teardown.ts"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  outputDir: ARTIFACTS_DIR,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
        ["junit", { outputFile: "playwright-report/results.xml" }],
      ]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: true,
    testIdAttribute: "data-testid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    reducedMotion: "reduce",
    launchOptions: {
      args: ["--disable-blink-features=AutomationControlled"],
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /fixtures\/auth\.setup\.ts/,
    },
    {
      name: "chromium-public",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/fixtures\/auth\.setup\.ts/, /flows\//, /routes\//],
    },
    {
      name: "chromium-authed",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testMatch: /flows\/.*\.spec\.ts/,
    },
    {
      // Specs por rota — área pública (sem auth). Ex.: routes/public/*.spec.ts
      name: "routes-public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /routes\/public\/.*\.spec\.ts/,
    },
    {
      // Specs por rota — áreas autenticadas (app, quotes, admin).
      name: "routes-authed",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testMatch: /routes\/(app|quotes|admin)\/.*\.spec\.ts/,
    },
    {
      // Versão mobile dos mesmos specs (apenas testes marcados @mobile rodam aqui).
      name: "routes-mobile",
      use: { ...devices["iPhone 13"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testMatch: /routes\/(app|quotes|admin)\/.*\.spec\.ts/,
      grep: /@mobile/,
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
