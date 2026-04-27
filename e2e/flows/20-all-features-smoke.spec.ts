/**
 * SMOKE SUITE — um teste por funcionalidade principal do sistema.
 *
 * Objetivo: gate rápido de CI. Cada teste valida que a feature **sobe sem
 * quebrar** (rota carrega, sem `pageerror` fatal, sem redirect inesperado
 * para `/login`, sem loaders persistentes).
 *
 * Política:
 *  - Um `test()` por funcionalidade → fácil de ler no relatório do CI.
 *  - Roda em ordem fixa (`test.describe.configure({ mode: "serial" })`).
 *  - Project dedicado `chromium-smoke` no `playwright.config.ts` com
 *    `workers: 1`, `retries: 0` (CI: 1) e `fullyParallel: false`.
 *  - Sem rede mockada — valida o app real autenticado com `E2E_USER_*`.
 *  - Skip silencioso quando faltam credenciais (não trava CI público).
 *
 * Complementar a:
 *  - `e2e/routes/**` — 8 casos por rota (render/happy/erro/a11y/mobile)
 *  - `e2e/flows/21-feature-matrix.spec.ts` — fluxos cross-module
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { Sel } from "../fixtures/selectors";

/** Ordem fixa: garante mesmo relatório em todo run do CI. */
test.describe.configure({ mode: "serial" });

/**
 * Asserções básicas que TODA tela autenticada deve atender.
 * Mantemos a função enxuta para que cada `test()` continue legível.
 */
async function assertFeatureLoads(
  page: import("@playwright/test").Page,
  path: string,
): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (!/ResizeObserver|loading chunk|hydrat/i.test(e.message)) {
      errors.push(e.message);
    }
  });

  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");

  // 1. Não pode redirecionar para /login (sessão válida).
  expect(/\/login/.test(page.url()), `redirect inesperado para login em ${path}`).toBe(false);

  // 2. Body visível.
  await expect(page.locator("body")).toBeVisible();

  // 3. Sem loaders pendurados após 5s (best-effort).
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"]:not([data-allow-loading])'),
      { timeout: 5_000 },
    )
    .catch(() => {});

  // 4. Sem `pageerror` fatal coletado durante o carregamento.
  expect(errors, `pageerrors em ${path}: ${errors.join(" | ")}`).toHaveLength(0);
}

test.describe("@smoke Funcionalidades principais (gate de CI)", () => {
  test.beforeEach(() => requireAuth());

  // ----- Núcleo do app -----
  test("Dashboard inicial", async ({ page }) => {
    await assertFeatureLoads(page, "/");
  });

  test("Dashboard customizável", async ({ page }) => {
    await assertFeatureLoads(page, "/dashboard");
  });

  // ----- Catálogo / Produtos -----
  test("Catálogo de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/produtos");
    await expect(page.locator(Sel.catalog.searchInput).first()).toBeAttached({
      timeout: 8_000,
    });
  });

  test("Filtros avançados de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/filtros");
  });

  test("Novidades", async ({ page }) => {
    await assertFeatureLoads(page, "/novidades");
  });

  test("Tendências", async ({ page }) => {
    await assertFeatureLoads(page, "/tendencias");
  });

  // ----- Engajamento -----
  test("Favoritos", async ({ page }) => {
    await assertFeatureLoads(page, "/favoritos");
  });

  test("Coleções", async ({ page }) => {
    await assertFeatureLoads(page, "/colecoes");
  });

  test("Comparador de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/comparar");
  });

  // ----- Carrinho / Pedidos -----
  test("Carrinhos do vendedor", async ({ page }) => {
    await assertFeatureLoads(page, "/carrinhos");
  });

  test("Pedidos", async ({ page }) => {
    await assertFeatureLoads(page, "/pedidos");
  });

  // ----- Orçamentos -----
  test("Lista de orçamentos", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos");
  });

  test("Dashboard de orçamentos", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/dashboard");
  });

  test("Funil (Kanban) de orçamentos", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/kanban");
  });

  test("Templates de orçamento", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/templates");
  });

  test("Criar novo orçamento (wizard)", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/novo");
  });

  // ----- Ferramentas / Simulação -----
  test("Simulador (wizard)", async ({ page }) => {
    await assertFeatureLoads(page, "/simulador");
  });

  test("Simulador de preços", async ({ page }) => {
    await assertFeatureLoads(page, "/simulador-precos");
  });

  test("Busca avançada de preço", async ({ page }) => {
    await assertFeatureLoads(page, "/busca-preco");
  });

  test("Estoque", async ({ page }) => {
    await assertFeatureLoads(page, "/estoque");
  });

  test("Reposição", async ({ page }) => {
    await assertFeatureLoads(page, "/reposicao");
  });

  // ----- Kits -----
  test("Kit Builder", async ({ page }) => {
    await assertFeatureLoads(page, "/montar-kit");
  });

  test("Meus Kits", async ({ page }) => {
    await assertFeatureLoads(page, "/meus-kits");
  });

  // ----- Mockup / Magic Up -----
  test("Gerador de Mockup", async ({ page }) => {
    await assertFeatureLoads(page, "/mockup-generator");
  });

  test("Histórico de Mockups", async ({ page }) => {
    await assertFeatureLoads(page, "/mockups/historico");
  });

  test("Magic Up (publicidade IA)", async ({ page }) => {
    await assertFeatureLoads(page, "/magic-up");
  });

  // ----- Inteligência -----
  test("Inteligência comercial", async ({ page }) => {
    await assertFeatureLoads(page, "/inteligencia-comercial");
  });

  test("Business Intelligence", async ({ page }) => {
    await assertFeatureLoads(page, "/ferramentas/bi");
  });

  test("BI — Comparador de clientes", async ({ page }) => {
    await assertFeatureLoads(page, "/ferramentas/bi/comparar");
  });

  test("Match de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/match");
  });

  // ----- Integrações -----
  test("Dropbox browser", async ({ page }) => {
    await assertFeatureLoads(page, "/dropbox");
  });
});

/* ============================================================
 * Smoke público (sem auth) — 1 teste por rota pública chave.
 * ============================================================ */
test.describe("@smoke Rotas públicas (gate de CI)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ mode: "serial" });

  test("Tela de login renderiza", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(Sel.login.email)).toBeVisible();
    await expect(page.locator(Sel.login.password)).toBeVisible();
    await expect(page.locator(Sel.login.submit).first()).toBeVisible();
  });

  test("Reset de senha renderiza", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      if (!/ResizeObserver|loading chunk/i.test(e.message)) errors.push(e.message);
    });
    await page.goto("/reset-password");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
    expect(errors, `pageerrors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("404 (rota inexistente)", async ({ page }) => {
    await page.goto("/rota-inexistente-smoke-xyz");
    await expect(page.locator(Sel.app.notFound).first()).toBeVisible({ timeout: 8_000 });
  });
});
